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
| 413 | `validation` | Request body > 10KB |
| 500 | `server_error` | Claude API failure, unknown errors |
| 502 | `invalid_response` | Claude returned malformed JSON |

All errors return `{ error, message }`. Message is always themed (never leaks raw API errors).

## Client-Side (src/lib/api.ts)

### generateConspiracy(request, signal?)
- Fetches `/.netlify/functions/generate` (Netlify redirects `/api/*` in netlify.toml)
- Optional `AbortSignal` parameter for request cancellation (wired from App.tsx)
- On non-200: parses error JSON (with fallback), throws `ApiError` with statusCode
- On 200: parses JSON (with try/catch — throws `ApiError` on malformed JSON), validates via `validateChainResponse()`, returns typed data

### validateChainResponse(data)
- Validates: is object, chain is array of 7, each node has all required fields
- Validates font_category against `FONT_CATEGORIES` constant
- Throws descriptive errors on validation failure

### ApiError class
Custom error with `statusCode` property. Used in App.tsx for error handling.

## Server-Side (netlify/functions/generate.ts)

### Anthropic SDK Usage
```typescript
const client = new Anthropic() // Reads ANTHROPIC_API_KEY from env
const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4000,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: `Connect: "${a}" and "${b}"` }],
})
```

### Response Processing
1. Extract text block from `message.content` array
2. `JSON.parse()` the text
3. Validate structure via `validateResponse()`
4. Return validated JSON

### Validation (server-side)
Mirrors client validation: 7 items, all fields present, valid font categories.
Server uses its own `FONT_CATEGORIES` const (not imported from shared types).

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
