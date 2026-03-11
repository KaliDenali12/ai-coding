# Race Condition & Concurrency Audit Report #21

**Run**: 01
**Date**: 2026-03-11 01:48 (local time)
**Branch**: `concurrency-audit-2026-03-11`
**Baseline**: 272 tests passing → 276 tests passing (4 concurrency tests added)

---

## 1. Executive Summary

**Safety Level: SAFE**

This application has minimal concurrency risk due to its architecture: stateless serverless backend (no database, no cache, no queues), single-threaded JavaScript execution, and proper frontend request cancellation.

**At 100 concurrent requests, these things WILL go wrong:**
- Rate limiting will be unreliable — concurrent requests may hit different serverless instances, each with an independent in-memory counter. Users can exceed the 20-request/15-min limit.

**At 100 concurrent requests, these things WILL NOT go wrong:**
- No data corruption (no persistent data store)
- No lost updates (no read-modify-write patterns on shared state)
- No double-processing (frontend aborts stale requests)
- No inconsistent state (each request is fully independent)

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | Per-instance rate limiter bypass in serverless |
| Low | 1 | Frontend submit button not disabled during request |
| Info | 2 | Architectural notes on inherent protections |

---

## 2. Shared Mutable State

### Module-Level Mutable State

| Location | Data | Read By | Written By | Risk | Assessment |
|----------|------|---------|------------|------|------------|
| `generate.ts:120` | `rateLimitMap: Map<string, number[]>` | `checkRateLimit()` | `checkRateLimit()` | Medium | Per-instance only; see below |

**Analysis of `rateLimitMap`:**

The rate limiter map is the only shared mutable state in the entire application. Within a single Node.js process, it is safe because:
1. JavaScript is single-threaded — `checkRateLimit()` is synchronous and runs atomically before any `await` in the handler
2. The rate limit check (read → filter → check → push → set) completes in a single microtask with no interleaving possible

**Interleaved timeline (cross-instance):**
```
T=0ms  Request A → Instance 1 → rateLimitMap is empty → ALLOWED (count=1/20)
T=0ms  Request B → Instance 2 → rateLimitMap is empty → ALLOWED (count=1/20)
T=0ms  Request C → Instance 1 → rateLimitMap has 1 entry → ALLOWED (count=2/20)
...
T=0ms  Request 40 → distributed across instances → each instance thinks < 20 requests → ALL ALLOWED
```

**Impact**: A determined user could exceed the 20-request rate limit by triggering concurrent requests that land on different Lambda instances. In practice, Netlify tends to reuse warm instances for sequential requests, so this mainly manifests under true concurrency.

**Fix**: Would require an external store (Redis, Netlify KV/Blobs, or DynamoDB) for rate limit counters. Not worth implementing at this app's scale — the rate limiter's primary purpose is to prevent accidental runaway costs, not to defend against adversarial abuse.

### Immutable Module-Level State (No Risk)

| Location | Data | Assessment |
|----------|------|------------|
| `generate.ts:3-6` | `FONT_CATEGORIES` | `const`, frozen by TS `as const` |
| `generate.ts:9-20` | `BLOCKED_TERMS` | `const` array, never mutated |
| `generate.ts:22-24` | `SUBSTITUTIONS` | `const` object, never mutated |
| `generate.ts:27-36` | `CONFUSABLES` | `const` object, never mutated |
| `generate.ts:62-114` | `SYSTEM_PROMPT` | `const` string, immutable |
| `generate.ts:117-118` | Rate limit constants | `const` numbers |

### Request-Scoped State Leaks

**None found.** Each request handler invocation:
- Creates a new `Anthropic` client instance (`generate.ts:276`)
- Reads request body independently (`request.text()`)
- Has no shared mutable state beyond `rateLimitMap`
- Returns an independent `Response` object

---

## 3. Database Race Conditions

**N/A** — This application has no database. All data is ephemeral:
- User inputs are validated and forwarded to Claude API
- Claude API responses are validated and returned to the client
- No data is persisted between requests

---

## 4. Cache Race Conditions

**N/A** — This application has no cache layer:
- No Redis, Memcached, or in-memory cache
- No CDN cache for API responses (only static assets via Netlify CDN)
- Anthropic SDK's prompt caching is server-side at Anthropic, not application-managed
- No HTTP cache headers on API responses (default no-cache)

---

## 5. Queue & Job Idempotency

**N/A** — This application has no background jobs, message queues, or scheduled tasks:
- Single synchronous request-response model
- No Netlify scheduled functions
- No worker threads or child processes

---

## 6. Frontend Concurrency

### 6.1 Double Submission

**Location**: `LandingScreen.tsx:134-143` (submit button), `App.tsx:18-40` (`handleSubmit`)

**Current protections**:
1. `disabled={!canSubmit}` on the button — prevents submission when inputs are empty/identical
2. Screen transitions to `loading` on submit — removes the submit button from DOM
3. `AbortController` pattern in `App.tsx:23-24` — aborts any in-flight request before starting a new one

**Residual risk (LOW):**

Rapid double-click timeline:
```
T=0ms  Click 1 → handleSubmit() called
         → setScreen('loading')     [queued, not yet rendered]
         → abort old controller     [no-op, first click]
         → create new controller
         → start fetch A
T=1ms  Click 2 → handleSubmit() called (button still in DOM, React hasn't re-rendered)
         → setScreen('loading')     [queued, duplicate no-op]
         → abort old controller     [ABORTS fetch A]
         → create new controller
         → start fetch B
T=16ms React re-renders → loading screen shown, button gone
```

**Result**: Fetch A is aborted, fetch B succeeds. No double-processing, no data corruption. The only consequence is one wasted API call (aborted mid-flight), which costs ~0 since it doesn't complete.

**Not fixing**: The `AbortController` pattern already provides correct behavior. Adding button disable-on-submit would be a UX polish, not a bug fix. The submit button already has `disabled={!canSubmit}` for input validation, and the screen transition removes it within one render frame.

### 6.2 Example Chip Double-Click

**Location**: `LandingScreen.tsx:27-34` (`handleChipClick`)

Same analysis as submit button. Chips call `onSubmit` directly, which triggers the same `AbortController` protection in `App.tsx`.

### 6.3 Out-of-Order API Responses

**WELL PROTECTED**: `App.tsx:23` aborts the previous request when a new one starts. The aborted fetch throws `AbortError`, which is silently caught at `App.tsx:31`. This guarantees only the most recent request's response is processed.

### 6.4 Stale Data Actions

**N/A**: No concept of updating or acting on stale data. Each board is a complete, independent generation.

### 6.5 Optimistic UI

**N/A**: The app waits for the full API response before rendering the board. No optimistic updates.

### 6.6 Resize Handler

**WELL PROTECTED**: `Corkboard.tsx:43-55` debounces resize events with a 150ms timer. Cleanup properly clears both the event listener and pending timeout on unmount.

---

## 7. Concurrency Tests Written

### New Test File: `netlify/functions/__tests__/generate-concurrency.test.ts`

| Test | Type | Status | Purpose |
|------|------|--------|---------|
| `rate limiter correctly counts concurrent requests from same IP` | Verification | ✅ Passing | 5 concurrent requests all succeed (under limit) |
| `rate limiter enforces limit under concurrent burst` | Verification | ✅ Passing | 25 concurrent requests: exactly 20 pass, 5 rate-limited |
| `concurrent requests from different IPs do not interfere` | Verification | ✅ Passing | 30 requests across 3 IPs, all succeed |
| `rate limiter is per-process (serverless limitation)` | Documentation | ✅ Passing | Documents the cross-instance bypass |

**Why no failing/skipped tests**: The in-process race conditions don't exist due to JavaScript's single-threaded execution. The cross-instance issue is an architectural limitation, not a code bug — it can't be reproduced in a unit test.

---

## 8. Risk Map

| # | Location | Race Condition | Likelihood | Impact | Risk | Visible? | Remediation |
|---|----------|---------------|------------|--------|------|----------|-------------|
| 1 | `generate.ts:120-150` | Rate limiter bypass via multiple serverless instances | Medium (requires true concurrent requests) | Low (extra API costs, not data corruption) | **Medium** | Silent — no error, just over-limit requests succeed | External rate limit store (Redis/KV) |
| 2 | `LandingScreen.tsx:134` | Double-click fires two API calls | Low (sub-frame timing window) | Negligible (abort cancels first) | **Low** | Silent — first request aborted, second succeeds normally | Button disable-on-submit (UX polish) |

**Estimated manifestation frequency under normal load:**
- **Rate limiter bypass**: Unlikely under normal usage (users submit one at a time). Could manifest if the app went viral and a single user opened multiple tabs. The 20-request limit is generous enough that this is a cost concern, not a functional bug.
- **Double-click**: Extremely rare. Requires sub-16ms click interval. Fully mitigated by abort mechanism even when it occurs.

---

## 9. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---|---|---|---|---|
| 1 | Move rate limiting to external store | Cross-instance rate limit enforcement | Low | Only if time allows | The in-memory rate limiter is adequate for current scale. If the app sees significant traffic (>1000 req/day), consider Netlify Blobs or a simple KV store. The current implementation correctly handles the single-instance case and gracefully degrades (allows more, not fewer) under cold starts. |
| 2 | Add `isSubmitting` state to disable button during API call | Prevents wasted aborted API calls on rapid double-click | Low | Only if time allows | The `AbortController` pattern already prevents double-processing. This would be a UX improvement (visual feedback that submission is in progress), not a concurrency fix. The screen transition to `loading` provides this feedback within ~16ms. |

---

## Appendix: Architecture Properties That Prevent Race Conditions

This application is inherently well-protected against concurrency issues due to these architectural choices:

1. **No persistent state**: No database means no read-modify-write races, no check-then-act gaps, no transaction scope issues.

2. **Stateless serverless**: Each request is independent. No shared connections, no connection pool contention, no session state.

3. **Single-threaded JavaScript**: Node.js event loop guarantees synchronous code runs atomically. The rate limiter's read-filter-check-push-set sequence cannot be interleaved.

4. **AbortController pattern**: Frontend properly cancels stale requests, preventing out-of-order response processing.

5. **Immutable configuration**: All module-level state except `rateLimitMap` is `const` and never mutated after initialization.

6. **No client-side caching**: Each API call is fresh. No stale cache to invalidate.

7. **Debounced resize**: Prevents rapid re-render cascade during window resize.

These properties make most concurrency attack vectors structurally impossible rather than defended-against.
