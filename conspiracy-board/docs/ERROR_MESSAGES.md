# Error Messages Reference

Complete inventory of user-facing error messages in Conspiracy Board.

---

## Message Style Guide

### Voice & Tone
- **In-theme**: Error messages maintain the conspiracy/classified aesthetic
- **Blame-free**: Never blame the user; frame as system/clearance/government issues
- **Actionable**: Every message tells the user what to do next (retry, change input, etc.)
- **Consistent formality**: Typewriter font, uppercase headings, themed language

### Structure Template
```
[What happened — themed] + [What to do next]
```

### Words to Avoid
- "Error", "invalid", "wrong", "failed" (in user-facing copy)
- Raw technical terms: "JSON", "API", "500", "parse", "server"
- Blame language: "You entered", "Your input", "You forgot"

### Standard Phrases
| Situation | Standard Phrase |
|-----------|----------------|
| Blocked content | "This subject is classified beyond our clearance level." |
| Server failure | "Our sources indicate this investigation has been shut down." |
| Retry prompt | "Hit 'Try Again'" or "Please try again" |
| Alt suggestion | "or investigate different subjects" |

---

## Client-Side Validation Messages

| Location | Trigger | Message | Status |
|----------|---------|---------|--------|
| `src/lib/blocklist.ts:85` | Both fields empty | "Both fields are required." | OK |
| `src/lib/blocklist.ts:89` | Concept > 50 chars | "Each concept must be 50 characters or fewer." | OK |
| `src/lib/blocklist.ts:95` | Identical concepts | "You can't investigate yourself... or can you? (Enter two different subjects.)" | OK |
| `src/lib/blocklist.ts:102` | Blocked content | "This subject is classified beyond our clearance level. Try something else." | OK |

## Error Screen Messages (Random Selection)

| Location | Heading | Message | Style |
|----------|---------|---------|-------|
| `src/lib/constants.ts:36-38` | REDACTED | "The government has intercepted our files. Hit 'Try Again' or investigate different subjects." | redacted |
| `src/lib/constants.ts:41-43` | CONNECTION LOST | "Connection to classified server lost. Try again — or pick different subjects if the problem persists." | flickering |
| `src/lib/constants.ts:46-48` | INVESTIGATION BLOCKED | "This investigation has been [REDACTED] by [REDACTED]. Hit 'Try Again' to start a new inquiry." | classified |

## Server API Error Responses

| Location | Status | Error Code | Message | Trigger |
|----------|--------|------------|---------|---------|
| `generate.ts:173` | 405 | `method_not_allowed` | "Method not allowed" | Non-POST request |
| `generate.ts:179` | 413 | `validation` | "Request too large." | Content-Length > 10KB |
| `generate.ts:186` | 400 | `validation` | "Invalid JSON in request body." | Malformed JSON |
| `generate.ts:191` | 400 | `validation` | "Both concepts are required." | Missing/empty fields |
| `generate.ts:198` | 400 | `validation` | "Each concept must be 50 characters or fewer." | Input > 50 chars |
| `generate.ts:202` | 400 | `validation` | "Concepts must be different." | Identical inputs |
| `generate.ts:206-209` | 400 | `blocked` | "This subject is classified beyond our clearance level. Try something else." | Blocklist match |
| `generate.ts:250-253` | 502 | `invalid_response` | "Our sources indicate this investigation has been shut down. Please try again or investigate different subjects." | Invalid AI response |
| `generate.ts:250-253` | 500 | `server_error` | (same as above) | Unexpected error |

## Client API Fallback Messages

| Location | Trigger | Message |
|----------|---------|---------|
| `src/lib/api.ts:70` | Error response body not parseable as JSON | "The investigation could not be completed. Please try again." |
| `src/lib/api.ts:81` | Success response body not parseable as JSON | "Our server returned an unreadable response. Please try again." |

## Design Notes

- **Validation divergence is intentional**: Client uses themed UX messages; server uses plain backstop messages for direct API callers
- **Error screen is generic**: All errors (timeout, API failure, validation) show the same random themed message — no error details leak
- **No i18n**: All messages are hardcoded English strings
