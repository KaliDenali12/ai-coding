# API Design Guide — Conspiracy Board

Codified conventions for the Conspiracy Board API. Follow these patterns for any new endpoints.

---

## URL Naming

- **Casing**: lowercase, hyphen-separated for multi-word paths (e.g., `/api/generate`, `/api/case-files`)
- **Style**: Action-oriented for non-CRUD operations (`/api/generate`), resource-oriented for CRUD (`/api/conspiracies`)
- **Prefix**: All API routes use `/api/` prefix, redirected to `/.netlify/functions/` via `netlify.toml`

## Field Naming

- **Request fields**: camelCase (`conceptA`, `conceptB`)
- **Response fields**: snake_case (`case_file_number`, `classification_level`, `font_category`)

> **Note**: This mixed convention exists for historical reasons. For new endpoints, prefer snake_case for both request and response to match the dominant response convention. If you choose camelCase, be consistent within the endpoint.

## HTTP Methods

| Method | Use For | Idempotent? |
|--------|---------|-------------|
| GET | Read-only retrieval, no side effects | Yes |
| POST | Create resource or trigger non-idempotent action | No |
| PUT | Full resource replacement | Yes |
| PATCH | Partial resource update | No |
| DELETE | Remove a resource | Yes |

## Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Successful retrieval or computation |
| 201 | Successful resource creation (with `Location` header) |
| 204 | Successful operation with no response body |
| 400 | Invalid input (validation failures, blocked content) |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 405 | HTTP method not supported |
| 422 | **Do not use** — use 400 for all validation errors |
| 500 | Unexpected server error |
| 502 | Upstream service returned unusable response |

## Error Response Format

All error responses MUST use this shape:

```json
{
  "error": "machine_readable_code",
  "message": "Human-readable description for the user."
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `validation` | 400 | Input validation failed |
| `blocked` | 400 | Content blocked by safety filter |
| `method_not_allowed` | 405 | Unsupported HTTP method |
| `server_error` | 500 | Unexpected internal error |
| `invalid_response` | 502 | Upstream (AI) returned invalid data |

### Error Message Rules

1. **Never leak internals** — no stack traces, SQL errors, file paths, or SDK error messages
2. **Use themed language** — maintain the conspiracy/classified theme in user-facing messages
3. **Be specific for validation** — tell the user exactly what's wrong ("Each concept must be 50 characters or fewer")
4. **Be vague for server errors** — don't reveal what broke ("Our sources indicate this investigation has been shut down")

## Request Validation

1. **Validate in the handler** — no middleware framework; validation at the top of the handler function
2. **Return 400 for all input errors** — do not distinguish 400 vs 422
3. **Use consistent error format** — see Error Response Format above
4. **Validate on both client and server** — never trust client-side validation alone
5. **Fail fast** — return on first validation error (acceptable for this project's scale)

## Content Safety

Three layers, all required:

1. **Client blocklist** (`src/lib/blocklist.ts`) — pre-flight check before API call
2. **Server blocklist** (`netlify/functions/generate.ts`) — duplicate check server-side
3. **AI system prompt** — safety rules in Claude prompt

> **Critical**: The blocklist is duplicated. Changes must be made in BOTH files.

## Response Headers

All responses must include:

```
Content-Type: application/json
```

## Pagination

Not currently needed. If future list endpoints are added:

- Use cursor-based pagination
- Parameters: `cursor` (opaque string), `limit` (default 20, max 100)
- Response metadata: `{ data: [...], next_cursor: "...", has_more: boolean }`

## Rate Limiting

Not implemented at application level. Relies on Netlify platform limits.

If adding application-level rate limiting:

- Use `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- Return `429 Too Many Requests` with `Retry-After` header when exceeded
- Rate limit by IP address for unauthenticated endpoints

## Versioning

Not implemented (single endpoint, no external consumers). If needed in future:

- Use URL path versioning: `/api/v1/generate`
- Never remove old versions without deprecation period
