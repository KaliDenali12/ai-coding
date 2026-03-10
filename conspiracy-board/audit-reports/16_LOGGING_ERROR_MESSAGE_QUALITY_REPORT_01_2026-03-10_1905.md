# Logging & Error Message Quality Report

**Run**: 01 | **Date**: 2026-03-10 | **Time**: 19:05 (local)
**Branch**: `message-quality-2026-03-10`

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| User-facing messages audited | 17 |
| User-facing messages improved | 5 |
| User-facing messages OK as-is | 12 |
| Sensitive data exposure instances | 0 |
| Log statements audited | 3 |
| Log statements improved | 3 |
| Error handlers audited | 6 |
| Error handlers improved | 0 (already well-structured) |
| Accessibility fixes | 2 (role="alert" added) |
| Tests passing | 263/263 |

---

## 2. User-Facing Error Messages

### Leaked Internals Fixed
None found. The project already masks all internal errors behind themed messages. Server never leaks raw error details, stack traces, or API keys to clients.

### Critical-Path Improvements

| File | Line | Current Message | Improved Message |
|------|------|-----------------|-----------------|
| `src/lib/api.ts` | 70 | "Request failed" | "The investigation could not be completed. Please try again." |
| `src/lib/api.ts` | 81 | "Invalid response from server" | "Our server returned an unreadable response. Please try again." |
| `netlify/functions/generate.ts` | 252 | "...shut down. Try different subjects." | "...shut down. Please try again or investigate different subjects." |

### Generic Messages Replaced

| File | Lines | Current Message | Improved Message |
|------|-------|-----------------|-----------------|
| `src/lib/constants.ts` | 36-38 | "...intercepted our files. Please try again." | "...intercepted our files. Hit 'Try Again' or investigate different subjects." |
| `src/lib/constants.ts` | 41-43 | "...server lost. They know we're looking." | "...server lost. Try again — or pick different subjects if the problem persists." |
| `src/lib/constants.ts` | 46-48 | "...by [REDACTED]. Retry?" | "...by [REDACTED]. Hit 'Try Again' to start a new inquiry." |

**Rationale**: Original error screen messages were atmospheric but didn't tell users what to do. Updated messages maintain the conspiracy theme while adding clear next steps.

### Messages Still Needing Work
None — all user-facing messages are now specific, actionable, and blame-free.

### Accessibility Fixes

| File | Line | Fix |
|------|------|-----|
| `src/components/ErrorScreen.tsx` | 62 | Added `role="alert"` to error message for screen reader announcement |
| `src/components/LandingScreen.tsx` | 126 | Added `role="alert"` to validation error message for screen reader announcement |

See `docs/ERROR_MESSAGES.md` for the complete message reference and style guide.

---

## 3. Sensitive Data in Logs (CRITICAL)

**No sensitive data exposure found.**

The project has only 3 log statements, all on error paths. The server-side log previously dumped the full error object (`console.error('Generate function error:', error)`), which could include Claude API error details. This was changed to log only the error name and message string, avoiding accidental exposure of API keys, tokens, or internal state in structured error objects.

---

## 4. Log Level Corrections

| File | Line | Was | Now | Reason |
|------|------|-----|-----|--------|
| `src/App.tsx` | 32-34 | Two separate `console.error` calls (generic + ApiError-specific) | Single structured `console.error` with conditional format | Eliminates duplicate logging; single log line per error with relevant context |
| `netlify/functions/generate.ts` | 245 | `console.error('Generate function error:', error)` — logs full error object | `console.error(\`Generate function error: [${errorName}] ${errorMessage}\`)` — logs only name + message | Avoids dumping entire error objects that may contain API response details |

No misleveled logs found — all 3 statements were already at ERROR level, used only on error paths.

---

## 5. Log Message Quality Improvements

### Context-Poor Messages Improved

| File | Before | After | Improvement |
|------|--------|-------|-------------|
| `src/App.tsx` | `'Generation failed:', error` then `\`API error ${statusCode}: ${message}\`` | `\`Generation failed: API returned ${statusCode} — ${message}\`` or `\`Generation failed: ${message}\`` | Single structured line with operation context; differentiates API vs other errors without redundant logging |
| `netlify/functions/generate.ts` | `'Generate function error:', error` | `\`Generate function error: [${errorName}] ${errorMessage}\`` | Includes error class name for categorization; avoids raw object dump |

### Critical Operations Missing Logging
None identified — the project is a simple request-response SPA. The single API endpoint logs errors adequately.

### Noise Removed
No noisy logs found. The project has an admirably minimal logging footprint (3 statements total, all error-only).

---

## 6. Error Handler Assessment

| Handler | Location | Differentiates? | Logs Properly? | Has Reference ID? | Sanitizes? |
|---------|----------|-----------------|----------------|-------------------|------------|
| Main try/catch | `App.tsx:26-37` | Yes (AbortError vs ApiError vs generic) | Yes | No | N/A (client) |
| Timeout handler | `App.tsx:40-43` | No (single path) | No logging | No | N/A |
| JSON parse (error body) | `api.ts:70` | No (fallback) | No | No | Yes (themed fallback) |
| JSON parse (success body) | `api.ts:78-82` | No (single path) | No | No | Yes (themed message) |
| Server main catch | `generate.ts:244-254` | Yes (validation vs server error) | Yes | No | Yes (themed message) |
| Server JSON parse | `generate.ts:183-187` | Yes (returns 400) | No (returns early) | No | Yes (plain message) |

### Notable Gaps (Documentation Only)
- **No React Error Boundary**: Render errors crash the app with no recovery. Acceptable for a comedy SPA but noted.
- **No global error handlers**: No `window.onerror` or `unhandledrejection`. Would catch edge cases but not critical for this project.
- **No reference/correlation IDs**: Error responses include error codes but no tracking IDs. Acceptable given no support team or error tracking service.

---

## 7. Consistency Findings

### Error Code Coverage
The server uses 5 error codes consistently:
- `validation` — input validation failures (400)
- `blocked` — content safety blocklist (400)
- `method_not_allowed` — wrong HTTP method (405)
- `invalid_response` — AI returned invalid data (502)
- `server_error` — unexpected failures (500)

Coverage is complete. No missing codes.

### Log Format Assessment
- Only `console.error` is used (no logger library)
- After this audit: consistent format `"[context]: [ErrorName] message"` on server
- Client uses `"Generation failed: details"` format
- No structured logging (JSON logs) — acceptable for Netlify Functions which provide their own request metadata

### Standardization Changes
- Consolidated client-side double-logging into single structured line
- Standardized server log format to include error class name

---

## 8. Logging Infrastructure Recommendations

| Gap | Current State | Recommendation |
|-----|--------------|----------------|
| Structured logging | Raw `console.error` strings | Not needed — Netlify captures request metadata automatically |
| Log correlation | No request IDs | Add request ID header if error tracking is ever added |
| Redaction framework | No sensitive data logged | No action needed — minimal logging surface |
| Hot-path sampling | N/A | No hot-path logging exists |
| Error tracking | None (Sentry, etc.) | Not warranted for a comedy SPA with no users to support |

---

## 9. Bugs Discovered

No bugs discovered during this audit. Error handling is comprehensive and correctly implemented:
- AbortError is properly silenced (not shown as error)
- Server never leaks internal details
- All error paths lead to user-visible recovery options
- Validation is properly layered (client + server)

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ErrorScreen.tsx` | Accessibility | Added `role="alert"` to error message |
| `src/components/LandingScreen.tsx` | Accessibility | Added `role="alert"` to validation error |
| `src/lib/constants.ts` | Copy | Made error screen messages actionable |
| `src/lib/api.ts` | Copy | Improved generic fallback messages |
| `netlify/functions/generate.ts` | Copy + Logging | Improved server error message; structured log format |
| `src/App.tsx` | Logging | Consolidated and improved client-side error logging |
| `src/lib/__tests__/api-generate.test.ts` | Test | Updated test expectation for new fallback message |
| `docs/ERROR_MESSAGES.md` | New | Complete message reference and style guide |
