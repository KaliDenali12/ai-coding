# API & Data

## Endpoint: POST /.netlify/functions/generate

### Request
```json
{ "conceptA": "string", "conceptB": "string" }
```
Both required, ≤50 chars, different, not blocklisted.

### Response (200)
```json
{
  "chain": [
    {
      "title": "2-5 word title",
      "emoji": "single emoji",
      "font_category": "horror|corporate|ancient|chaotic|scientific|military|mystical|retro|underground",
      "teaser": "One sentence",
      "briefing": "2-3 paragraphs"
    }
  ],
  "case_file_number": "CASE FILE #XXXX-X",
  "classification_level": "TOP SECRET|EYES ONLY|RESTRICTED|CLASSIFIED"
}
```
Chain has exactly 7 items: item[0] = concept A, items[1-5] = intermediate steps, item[6] = concept B.

### Error Responses
| Status | Error Type | When |
|--------|-----------|------|
| 400 | `validation` | Missing/invalid inputs, same concepts, malformed JSON body |
| 400 | `blocked` | Blocklisted content |
| 405 | `method_not_allowed` | Non-POST method |
| 413 | `validation` | Request body > 10KB (checked via actual body size, not Content-Length header) |
| 429 | `rate_limited` | Exceeded 20 requests per 15-minute window for this IP |
| 500 | `server_error` | Auth failure, unknown errors |
| 502 | `invalid_response` | Claude returned malformed JSON |
| 503 | `server_error` | Anthropic API rate limited (upstream) OR circuit breaker open |
| 503 | `maintenance` | `MAINTENANCE_MODE=true` env var set (kill switch) |
| 504 | `server_error` | Anthropic API timeout |

All errors return `{ error, message }`. Message is always themed (never leaks raw API errors).
All responses include `X-Request-Id` header (UUID, or echoed from client `x-request-id`).

## Client-Side (src/lib/api.ts)

### generateConspiracy(request, signal?)
- Fetches `/.netlify/functions/generate` (Netlify redirects `/api/*` in netlify.toml)
- Optional `AbortSignal` parameter for request cancellation (wired from App.tsx). Falls back to `AbortSignal.timeout(30_000)` if no signal provided.
- On non-200: parses error JSON (with fallback), throws `ApiError` with statusCode
- On 200: parses JSON (with try/catch — throws `ApiError` on malformed JSON), validates via `validateChainResponse()`, returns typed data

### validateChainResponse(data)
- Validates: is object, chain is array of 7, each node has all required fields
- Validates font_category against `FONT_CATEGORIES` constant
- Throws descriptive errors on validation failure

### ApiError class
Custom error with `statusCode` and `requestId` properties. `requestId` is extracted from response `X-Request-Id` header. Used in App.tsx for error handling with request tracing.

## Server-Side (netlify/functions/generate.ts)

### Rate Limiting
- Per-IP: 20 requests per 15-minute window (in-memory Map, resets on cold start)
- IP extracted from `x-nf-client-connection-ip` header (Netlify), falls back to `x-forwarded-for`
- `_resetRateLimiter()` exported for test isolation — call in `beforeEach`

### Circuit Breaker
- 3 consecutive API failures → circuit opens for 30s (fail fast with 503)
- After cooldown, allows one probe request (half-open state)
- Resets to closed on any successful API call
- Validation failures (bad AI output) don't count — only transport/auth errors trip it
- In-memory state, resets on cold start
- `_resetCircuitBreaker()` exported for test isolation — call in `beforeEach` alongside `_resetRateLimiter()`

### Correlation IDs
- Every request gets a UUID via `crypto.randomUUID()`, or echoes client-provided `x-request-id` header
- Included in all structured log entries (`requestId` field)
- Returned in `X-Request-Id` response header on every response (success and error)

### Anthropic SDK Usage
```typescript
const apiTimeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 25_000
const client = new Anthropic({ timeout: apiTimeoutMs }) // Reads ANTHROPIC_API_KEY from env
const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4000,
  system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: `Connect: "${a}" and "${b}"` }],
})
```
- System prompt uses `cache_control: { type: 'ephemeral' }` for Anthropic prompt caching (90% discount on cached input tokens).
- SDK timeout set to 25s (configurable via `ANTHROPIC_TIMEOUT_MS`). SDK default of 10min is too long for serverless.
- Error catch block classifies SDK errors by `error.name` and `error.status` (not `instanceof` — avoids issues with module mocking in tests).

### Maintenance Mode
Set `MAINTENANCE_MODE=true` in Netlify env vars to return 503 immediately without calling Anthropic API. Kill switch for incidents/outages.

### Structured Logging
All paths emit structured JSON to Netlify function logs. Key events:
```json
// Success
{ "event": "generate_success", "requestId": "uuid", "latencyMs": 8500, "inputTokens": 1200, "outputTokens": 3800, "cacheRead": 1100, "cacheWrite": 0, "model": "...", "requestSizeBytes": 65, "responseSizeBytes": 12500 }
// Error
{ "event": "generate_error", "requestId": "uuid", "errorType": "timeout|api_rate_limited|auth_failure|unknown", "errorName": "...", "latencyMs": 25000 }
// Rejection (pre-API)
{ "event": "request_rejected", "requestId": "uuid", "reason": "rate_limited|blocked_content|maintenance_mode|circuit_open|method_not_allowed" }
```
See `docs/RUNBOOKS.md` for full log event reference and operational runbooks.

### Response Processing
1. Extract text block from `message.content` array
2. `JSON.parse()` the text
3. Validate structure via `validateResponse()`
4. Log success metrics (latency, tokens)
5. Return validated JSON

### Validation (server-side)
Mirrors client validation: 7 items, all fields present, valid font categories.
Server uses its own `FONT_CATEGORIES` const (not imported from shared types).
Length limits on response fields (enforced in both server and client validators): title ≤ 100, emoji ≤ 20, teaser ≤ 500, briefing ≤ 5000 chars.

## Data Types (src/types/conspiracy.ts)
```typescript
type FontCategory = 'horror' | 'corporate' | 'ancient' | 'chaotic' |
  'scientific' | 'military' | 'mystical' | 'retro' | 'underground'

interface ConspiracyNode { title, emoji, font_category, teaser, briefing }
interface ConspiracyChain { chain: ConspiracyNode[], case_file_number, classification_level }
interface GenerateRequest { conceptA, conceptB }
```

## Pitfalls
- `FONT_CATEGORIES` defined in both `src/types/conspiracy.ts` and `netlify/functions/generate.ts` — keep in sync
- Server validation is separate from client validation — both must be updated for schema changes
- Claude occasionally returns markdown code fences around JSON — current code will fail on this (no stripping)
- `max_tokens: 4000` may be tight for verbose briefings — monitor truncation
