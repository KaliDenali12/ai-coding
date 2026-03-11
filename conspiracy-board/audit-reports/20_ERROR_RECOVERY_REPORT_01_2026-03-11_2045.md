# Error Recovery & Resilience Audit Report

**Run**: 01
**Date**: 2026-03-11 20:45 (local)
**Branch**: `resilience-2026-03-11`
**Auditor**: Claude Opus 4.6 (overnight audit)
**Tests**: 272/272 passing after all changes

---

## 1. Executive Summary

**Resilience Maturity: Basic → Moderate (after fixes)**

**What happens right now if the Anthropic API goes down for 10 minutes?**

Every request shows the error screen within 15 seconds (client-side timeout via LoadingScreen). Before this audit, the server-side Anthropic SDK would hang for up to **10 minutes** (its default timeout) — far exceeding Netlify's function timeout of 10-26 seconds. This meant Netlify would force-kill the function, returning no structured error response. After this audit, the SDK has a 25-second explicit timeout, so it returns a proper 504 with a themed error message.

**Top 5 Resilience Gaps (pre-fix):**

1. **CRITICAL**: Anthropic SDK default timeout (10 min) far exceeded Netlify function timeout (10-26s), causing ungraceful function termination with no error response
2. **HIGH**: All Anthropic API errors (timeout, rate limit, auth failure) returned generic 500 — no differentiation for monitoring or debugging
3. **MEDIUM**: Client `generateConspiracy()` accepted optional abort signal with no fallback — theoretically could hang forever if called without one
4. **LOW**: Rate limit slot consumed before Anthropic API call — if the API fails, user loses a rate limit slot for nothing
5. **INFO**: No structured logging for error categorization — all errors logged with same console.error format

---

## 2. Timeout Audit

### External Call Inventory

| # | Operation | File | Type | Direction |
|---|-----------|------|------|-----------|
| 1 | Anthropic `messages.create()` | `netlify/functions/generate.ts:278-294` | HTTP/API | Server → Anthropic API |
| 2 | `fetch('/.netlify/functions/generate')` | `src/lib/api.ts:78` | HTTP | Client → Server |
| 3 | `request.text()` | `netlify/functions/generate.ts:235` | Body read | Server (incoming) |
| 4 | Google Fonts `<link>` | `index.html` | HTTP | Client → Google |

### Timeout Configuration

| Operation | File | Timeout Before | Timeout After | Notes |
|-----------|------|---------------|--------------|-------|
| Anthropic SDK call | `generate.ts:276` | **600,000ms (10 min!)** SDK default | **25,000ms** via `ANTHROPIC_TIMEOUT_MS` env or default | Most critical fix. SDK default is absurd for serverless. |
| Client fetch | `api.ts:78` | None (relied on optional caller signal) | **30,000ms** fallback via `AbortSignal.timeout()` | Defense-in-depth. Normal path still uses App.tsx's 15s signal. |
| `request.text()` | `generate.ts:235` | None (Netlify platform timeout) | N/A — not changed | Netlify enforces its own function timeout. Low risk. |
| Google Fonts | `index.html` | Browser default | N/A | Non-blocking `<link>` — fonts are progressive enhancement. |

### Operations Still Without Explicit Timeouts

| Operation | Why Not Fixed | Risk |
|-----------|--------------|------|
| `request.text()` body read | Netlify platform enforces function timeout. Adding our own would require complex AbortController wiring for minimal benefit. | Very low — body is <10KB JSON. |
| Google Fonts loading | Browser handles this natively. Fonts use `font-display: swap` implicitly via Google Fonts. | None — app renders with system fonts while loading. |

---

## 3. Retry Logic

### Existing Retries

| Operation | Library | Correct? | Issues | Fix |
|-----------|---------|----------|--------|-----|
| Anthropic SDK call | `@anthropic-ai/sdk` built-in | ✅ Yes | SDK retries 2× with exponential backoff on 5xx and connection errors. Does NOT retry 4xx. | None needed |

### Retries Added

None. The only external call (Anthropic API) already has appropriate built-in retry logic.

### Retries Needed But Not Added

| Operation | Why Not Added |
|-----------|--------------|
| Client fetch to `/api/generate` | **Not idempotent in cost terms** — each call consumes Anthropic API tokens (~$0.01-0.05). Auto-retrying would double cost on transient failures. User-initiated retry via "Try Again" button is appropriate. |

---

## 4. Circuit Breaker Recommendations

| Dependency | Current Failure Mode | Recommended Config | Fallback | Effort |
|------------|---------------------|-------------------|----------|--------|
| Anthropic API | Each request fails independently. Error screen shown within 15s. No cascading failures. | **Not recommended** — single dependency, no cascading risk, stateless serverless architecture. A circuit breaker would add complexity with no benefit for this app's traffic pattern. | N/A | N/A |

**Assessment**: Circuit breakers are not warranted for this application. There is only one external dependency (Anthropic API), no connection pooling to exhaust, no shared state to corrupt, and no downstream services to protect. The existing timeout + error screen pattern provides adequate resilience.

---

## 5. Partial Failure Analysis

| Operation | Steps | Failure Modes | Current Handling | Fixes Applied | Remaining Risk |
|-----------|-------|---------------|-----------------|---------------|----------------|
| Generate conspiracy | 1. Rate limit check → 2. Validate input → 3. Call Anthropic → 4. Validate response → 5. Return | Step 3 fails after rate limit slot consumed | Rate limit slot is "wasted" but this is minor — 20 req/15min is generous | None (risk is acceptable) | User loses 1 of 20 rate limit slots on API failure. Not worth fixing — would require deferred rate limiting which adds complexity. |

**Assessment**: No multi-step operations with external side effects. The app is stateless (no database, no queues, no external writes). The only "side effect" before the Anthropic call is rate limit tracking, which is ephemeral (in-memory, resets on cold start) and low-consequence.

---

## 6. Graceful Shutdown

### Architecture Context

This is a **serverless application**:
- **Backend**: Netlify Functions — lifecycle managed by the platform. No persistent connections to drain, no queue consumers to stop, no background workers.
- **Frontend**: React SPA — browser manages lifecycle. No WebSockets, no long polling.

### Resource Cleanup Checklist

| Resource | Cleaned Up? | How |
|----------|------------|-----|
| In-flight fetch requests | ✅ Yes | `AbortController` in `App.tsx:23` aborts on timeout/navigation |
| LoadingScreen timers | ✅ Yes | `useEffect` cleanup in `LoadingScreen.tsx:31,37,53` |
| Corkboard resize listener | ✅ Yes | `useEffect` cleanup in `Corkboard.tsx:51-54`, debounce timer also cleared |
| Rate limit Map | N/A | Ephemeral (in-memory, lost on cold start). This is by design for serverless. |

### Before/After

No changes needed. The SPA properly cleans up all React effects on unmount. The serverless backend has no persistent resources to manage.

---

## 7. Queue & Job Resilience

**N/A** — This application has no message queues, background jobs, scheduled tasks, or async workers. All processing is synchronous request-response within the serverless function.

---

## 8. Cascading Failure Risk Map

```
User Browser
    │
    ├── fetch('/api/generate')  ←── 30s fallback timeout (NEW), 15s normal timeout
    │       │
    │       └── Netlify Function (10-26s platform timeout)
    │               │
    │               └── Anthropic API  ←── 25s SDK timeout (NEW, was 10min)
    │
    ├── Google Fonts CDN  (non-blocking, progressive enhancement)
    │
    └── Netlify CDN (static assets)
```

### Critical Paths With No Fallback

| Path | Impact If Down | Mitigation |
|------|---------------|------------|
| Anthropic API unavailable | Core feature (conspiracy generation) is completely unavailable | Error screen with "Try Again". No cached/stale data possible (each response is unique). Appropriate for a fun/novelty app. |
| Netlify CDN unavailable | Entire app unavailable | Standard CDN risk. Netlify's SLA applies. |
| Google Fonts CDN unavailable | Fonts fall back to system fonts | Progressive enhancement — app is fully usable without custom fonts. |

### Blast Radius Per Dependency

| Dependency | Blast Radius | Users Affected |
|------------|-------------|----------------|
| Anthropic API | Generation feature only | Users actively submitting — existing boards still render (in-memory) |
| Netlify CDN | Full app outage | All users |
| Google Fonts | Visual degradation only | All users (graceful) |

---

## 9. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---------------|--------|----------------|-------------|---------|
| 1 | Configure Netlify function timeout to ≥15s | Ensures server-side has time to return structured error before Netlify kills function | Medium | Yes | Default is 10s. The Anthropic API typically takes 5-12s. Set `[functions] timeout = 26` in `netlify.toml` for the maximum allowed on free tier. |
| 2 | Add structured error logging with categories | Enables monitoring/alerting on error types (timeout vs rate limit vs auth) | Low | Probably | Current console.error logs are now differentiated by message but lack structured fields. If monitoring is added later, JSON-structured logs would help. Not urgent for a novelty app. |
| 3 | Add `ANTHROPIC_TIMEOUT_MS` to deployment docs | Ensures ops knows the timeout is configurable | Low | Only if time allows | The env var exists but isn't documented anywhere. Low risk since the 25s default is sensible. |

---

## Changes Made

### `netlify/functions/generate.ts`

1. **Added explicit SDK timeout** (line 276): `new Anthropic({ timeout: apiTimeoutMs })` where `apiTimeoutMs` defaults to 25,000ms and is configurable via `ANTHROPIC_TIMEOUT_MS` environment variable. Previously used the SDK's 10-minute default.

2. **Added error differentiation** (lines 313-340): The catch block now detects Anthropic SDK error types by `error.name` and `error.status`:
   - `APIConnectionTimeoutError` → 504 with "sources unreachable" message
   - Rate limit (status 429) → 503 with "network overwhelmed" message
   - Auth failure (status 401) → 500 with CRITICAL log prefix
   - Other errors → existing 500/502 behavior unchanged

### `src/lib/api.ts`

3. **Added fallback abort signal** (line 78): `const effectiveSignal = signal ?? AbortSignal.timeout(30_000)`. If `generateConspiracy()` is called without a signal, a 30-second timeout prevents indefinite hanging. The normal code path (from App.tsx) still uses the caller's 15-second signal.

### `src/lib/__tests__/api-generate.test.ts`

4. **Updated test assertion** (line 30): Changed from exact match to `expect.objectContaining()` to accommodate the new `signal` property in fetch calls.

---

## Appendix: Files Audited

| File | Relevant Findings |
|------|------------------|
| `netlify/functions/generate.ts` | Anthropic SDK timeout, error classification |
| `src/lib/api.ts` | Client fetch timeout |
| `src/App.tsx` | AbortController wiring (correct) |
| `src/components/LoadingScreen.tsx` | Timer cleanup (correct) |
| `src/components/ErrorBoundary.tsx` | Error boundary (correct) |
| `src/components/ErrorScreen.tsx` | Error display (correct) |
| `src/components/Corkboard.tsx` | Resize handler cleanup (correct) |
| `src/main.tsx` | ErrorBoundary wrapping (correct) |
| `src/lib/constants.ts` | Timeout thresholds (appropriate) |
| `netlify.toml` | Build config, security headers |
| `package.json` | Dependencies (no new ones added) |
