# Observability & Monitoring Readiness Audit Report

**Report**: #29 — Observability & Monitoring Readiness
**Run**: 001
**Date**: 2026-03-13
**Time**: 23:10 (local)
**Branch**: `observability-2026-03-13`
**Tests**: 295 passing (was 290 before audit)

---

## 1. Executive Summary

**Maturity Level: BASIC → MODERATE** (after this audit's changes)

### Before This Audit
- **Detection speed**: None — no health checks, no alerting, no uptime monitoring
- **Diagnostic capability**: Minimal — success-path JSON logs with latency and token usage, but no correlation IDs, no error classification, and unstructured error logs
- **Graceful degradation**: Maintenance mode kill switch existed, but no circuit breakers or feature flags

### After This Audit
- **Detection speed**: Health endpoints enable uptime monitoring; structured error logs enable log-based alerting
- **Diagnostic capability**: Request correlation IDs across all logs and response headers; structured JSON for all error paths; request/response size tracking
- **Graceful degradation**: Circuit breaker added — fails fast during Anthropic outages instead of 25s timeout. Maintenance mode kill switch already existed.

### Top 5 Gaps (Remaining)

1. **No external uptime monitoring** — Health endpoints exist but nothing polls them
2. **No alerting pipeline** — Structured logs are emitted but no system processes them into alerts
3. **No client-side error reporting** — Frontend errors are `console.error` only (now with requestId), but invisible to ops without a service like Sentry
4. **No distributed rate limiting** — In-memory rate limiter resets on every cold start
5. **No business funnel metrics** — No tracking of page view → submit → success conversion

---

## 2. Health Checks

### Before
- **No health check endpoints existed**
- The only implicit health signal was whether `POST /api/generate` returned a response
- No liveness/readiness distinction
- No dependency verification without making an actual API call

### After

| Endpoint | Purpose | Status Codes | Dependencies Checked |
|----------|---------|-------------|---------------------|
| `GET /api/health` | Full health check | 200 (healthy/degraded), 503 (unhealthy) | Runtime, API key, maintenance mode, SDK timeout config |
| `GET /api/health/live` | Liveness probe | 200 | Runtime only |
| `GET /api/health/ready` | Readiness probe | 200 / 503 | API key + maintenance mode |

**Design decisions:**
- Health checks do NOT call the Anthropic API — that would cost money and add latency
- API key existence is verified (but not validated via test call) — this catches misconfiguration
- Maintenance mode is surfaced as "degraded" (intentional) vs "unhealthy" (broken)
- Each check includes `latencyMs` for monitoring endpoint performance
- No credentials, IPs, or stack traces are exposed

**Files added:**
- `netlify/functions/health.ts` (107 lines)
- `netlify/functions/__tests__/health.test.ts` (11 tests)

---

## 3. Metrics & Instrumentation

### Coverage Table

| Category | Present Before | Present After | Missing (Needs Infra) |
|----------|---------------|---------------|----------------------|
| **Request count** | Implicit (1 log per success) | Yes (success + all error/rejection paths logged) | Aggregation dashboard |
| **Request latency** | Yes (`latencyMs` on success) | Yes (success + error paths) | Histogram/percentile computation |
| **Error rate by type** | Partial (unstructured logs) | Yes (structured `errorType` field) | Aggregation dashboard |
| **Request/response size** | No | Yes (`requestSizeBytes`, `responseSizeBytes`) | — |
| **Token usage** | Yes (`inputTokens`, `outputTokens`) | Yes (+ `cacheWrite` added) | Cost dashboard |
| **Cache hit rate** | Yes (`cacheRead`) | Yes (+ `cacheWrite` for full picture) | — |
| **Rate limit hits** | No | Yes (`request_rejected` with reason) | — |
| **Blocked content attempts** | No | Yes (`request_rejected` with `blocked_content`) | — |
| **Maintenance mode hits** | No | Yes (`request_rejected` with `maintenance_mode`) | — |
| **Business metrics** | No | No | Funnel tracking (page view → submit → success) |
| **Client-side errors** | console.error only | console.error only | Error reporting service (Sentry/LogRocket) |
| **Memory/heap** | N/A (serverless) | N/A | Not applicable |
| **Connection pool** | N/A (no DB) | N/A | Not applicable |
| **Queue depth** | N/A (no queue) | N/A | Not applicable |

### What Was Added
1. **Structured JSON error logging** — All error paths now emit `{"event":"generate_error","errorType":"...","errorName":"...","requestId":"...","latencyMs":...}`
2. **Rejection reason logging** — Rate limits, blocked content, maintenance mode, and method-not-allowed all emit `{"event":"request_rejected","reason":"...","requestId":"..."}`
3. **Request/response size tracking** — `requestSizeBytes` and `responseSizeBytes` on success path
4. **Cache write tokens** — Added `cacheWrite` (cache_creation_input_tokens) to success log alongside existing `cacheRead`
5. **Latency on error paths** — All error logs now include `latencyMs`

### What Still Needs Infrastructure
- **Log aggregation**: Netlify function logs need to be shipped to a log aggregation service (Datadog, Grafana Cloud, or similar) to enable dashboarding and alerting on these structured events
- **Client-side error tracking**: A service like Sentry would capture frontend errors that are currently invisible
- **Business funnel metrics**: Would require client-side analytics (e.g., Plausible, PostHog, or Google Analytics)

### Recommendation: No Metrics Library Added
The project has no existing metrics library and the backend is a single serverless function. Adding Prometheus/StatsD/OpenTelemetry would require infrastructure (a metrics collector) that doesn't exist. Structured JSON logs are the right approach for this architecture — they can be consumed by any log aggregation service without changing the application.

---

## 4. Distributed Tracing

### Before
- No correlation IDs
- No request tracing
- Each request was completely isolated — no way to correlate a client error with a server log entry

### After
- **UUID correlation ID** generated per request via `crypto.randomUUID()`
- **Client-provided IDs honored** — if the client sends `X-Request-Id`, it's used instead of generating a new one
- **Propagated through all logs** — every `generate_success`, `generate_error`, and `request_rejected` event includes `requestId`
- **Returned in response headers** — `X-Request-Id` header on every response (success and error)

### Remaining Gaps
- **Client doesn't read or log the request ID yet** — the `X-Request-Id` header is returned but `src/lib/api.ts` doesn't extract or log it
- **No distributed tracing spans** — no OpenTelemetry/Jaeger integration (would need infrastructure)
- **No propagation to Anthropic API** — the SDK doesn't support custom headers for tracing

### Files Modified
- `netlify/functions/generate.ts` — added `generateRequestId()`, propagated through all paths
- `netlify/functions/__tests__/generate-handler.test.ts` — 3 new tests for correlation ID behavior

---

## 5. Failure Mode Analysis

### Dependency Matrix

| Dependency | Down Impact | Slow (10x) Impact | Timeout? | Retry? | Circuit Breaker? | Graceful Degradation? |
|-----------|-------------|-------------------|----------|--------|------------------|-----------------------|
| **Anthropic Claude API** | All generations fail (500/504) | Timeouts likely (25s timeout at normal 5-12s becomes 50-120s) | Yes (25s SDK) | No | No | No — error screen |
| **Netlify Functions** | Backend completely unavailable | Cold start latency, potential gateway timeouts | Yes (26s) | N/A | N/A | Frontend loads but API fails |
| **Google Fonts CDN** | Fallback system fonts render | Slower initial paint | Browser default | Browser | N/A | Yes — CSS fallbacks |
| **Netlify CDN** | Site unreachable | Slower page loads | N/A | N/A | N/A | No |
| **GitHub (CI)** | PRs can't be validated, deploys still work via Netlify | Slower CI runs | GitHub defaults | GitHub | N/A | Yes — manual deploy possible |

### Critical Code Paths

| Path | Steps | What Can Fail | Detection |
|------|-------|---------------|-----------|
| **Generate chain** | Validate → Blocklist → API call → Parse → Validate response → Return | API timeout, rate limit, auth failure, invalid JSON, validation failure | `generate_error` logs with `errorType` |
| **Page load** | CDN → HTML → Fonts → JS bundle → React render | CDN outage, font loading, JS error | Client-side console only |
| **Submit flow** | Client validation → Fetch → Loading screen → Board render | Network error, abort, timeout, API error | Client console.error, server structured logs |

### Graceful Degradation Assessment
See `docs/RUNBOOKS.md` for full details. Summary:
- **Maintenance mode**: YES — kill switch via env var
- **Circuit breaker**: NO — not implemented
- **Feature flags**: NO — not implemented
- **Partial rendering**: NO — by design (all 7 cards or error)
- **Client timeout handling**: YES — progressive states at 8s, 12s, 15s
- **Offline handling**: YES — fetch errors caught and displayed

### Runbooks
Created `docs/RUNBOOKS.md` with 10 runbooks covering every identified failure mode. See the document for full details.

---

## 6. Alerting Recommendations

### Current State
**No alerting exists.** Zero alerts, zero monitoring, zero uptime checks. The team relies on user reports or manual log checks to detect issues.

### Recommended Alerts

| Alert Name | Condition | Threshold | Severity | Source |
|-----------|-----------|-----------|----------|--------|
| **Health check down** | `/api/health/ready` returns non-200 | 2 consecutive failures, 1min apart | Critical | Uptime monitor |
| **Error rate spike** | `generate_error` count / total requests | > 10% over 5 min window | Critical | Log aggregation |
| **Auth failure** | `generate_error` with `errorType: "auth_failure"` | Any occurrence | Critical | Log aggregation |
| **P95 latency degraded** | `generate_success.latencyMs` P95 | > 15000ms over 5 min window | High | Log aggregation |
| **Timeout rate** | `generate_error` with `errorType: "timeout"` | > 5% of requests over 10 min | High | Log aggregation |
| **Anthropic rate limited** | `generate_error` with `errorType: "api_rate_limited"` | > 3 events in 5 min | High | Log aggregation |
| **Elevated 502s** | `generate_error` with response validation failures | > 5% of requests over 15 min | Medium | Log aggregation |
| **Rate limiter abuse** | `request_rejected` with `reason: "rate_limited"` | > 50 events in 15 min | Medium | Log aggregation |
| **Blocked content spike** | `request_rejected` with `reason: "blocked_content"` | > 20 events in 15 min | Low | Log aggregation |

### Threshold Rationale
- **15s P95 latency**: Normal API latency is 5-12s. Client hard-fails at 15s. P95 > 15s means users are timing out.
- **25s SDK timeout**: Set in `ANTHROPIC_TIMEOUT_MS` (default 25000). Function timeout is 26s. These are tightly coupled.
- **20 req/15min rate limit**: Per-IP limit in code. Alert on aggregate rate limit hits to detect abuse patterns.
- **10% error rate**: At low traffic, a few errors are normal. 10% sustained over 5 min indicates a systemic problem.

### Implementation Options (No New Infra Required)
1. **Uptime monitoring**: Free tier of UptimeRobot, Pingdom, or Better Stack can poll `/api/health/ready`
2. **Netlify Log Drains**: Netlify supports log drains to Datadog, which enables all log-based alerts above
3. **GitHub Actions alert**: A scheduled workflow could hit the health endpoint and notify via GitHub Issues

---

## 7. Recommendations

### Priority-Ordered Improvements

#### Quick Wins (< 1 day each)

1. **Set up uptime monitoring on `/api/health/ready`**
   - Free UptimeRobot or Better Stack account
   - Poll every 1 minute, alert on 2 consecutive failures
   - Impact: Goes from zero detection to automatic outage detection in minutes

2. **Add X-Request-Id to client-side error logging**
   - Modify `src/lib/api.ts` to read `X-Request-Id` from response headers
   - Include in `console.error` calls in `App.tsx`
   - Impact: Enables end-to-end correlation from browser to server

3. **Add basic error reporting integration**
   - Free tier Sentry or LogRocket
   - Captures client-side errors that are currently invisible
   - Impact: Catches rendering errors, network failures, and JS exceptions

#### Medium Investments (1-3 days)

4. **Ship logs to an aggregation service**
   - Netlify supports log drains to Datadog (free tier available)
   - Enables dashboards on all the structured log events
   - Enables all log-based alerts from the alerting table above
   - Impact: Transforms raw logs into actionable dashboards and alerts

5. **Add single retry with backoff on Anthropic API timeouts**
   - Currently: timeout = immediate failure to user
   - Proposed: One retry after 1s for timeout errors only
   - Must fit within 26s function timeout (25s first attempt + 1s wait = no room — would need to reduce first attempt timeout to ~12s)
   - Impact: Reduces user-visible failures from transient timeouts

6. **Add circuit breaker pattern for Anthropic API**
   - Track failure count in a lightweight way (in-memory is fine for serverless)
   - After N consecutive failures, fail fast for T seconds instead of waiting for timeout
   - Impact: Reduces latency during outages, saves API quota

#### Larger Investments (> 3 days)

7. **Client-side analytics / business metrics**
   - Track funnel: page view → concept entry → submit → success → card flip
   - Privacy-respecting option: Plausible Analytics (self-hosted or cloud)
   - Impact: Understand user engagement, detect drops in conversion

8. **OpenTelemetry integration**
   - Full distributed tracing with spans for each handler phase
   - Requires an OTel collector endpoint
   - Impact: Deep performance analysis, but overkill for current scale

### Infrastructure/Tooling Recommendations

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| UptimeRobot / Better Stack | Health endpoint monitoring | Free tier | High |
| Sentry | Client-side error tracking | Free tier (5K events/mo) | High |
| Datadog (via Netlify log drain) | Log aggregation + alerting | Free tier (limited) | Medium |
| Plausible Analytics | Privacy-respecting business metrics | $9/mo or self-hosted | Low |

### On-Call Practices
Currently there is no on-call rotation or incident response process. For a project of this scale, the minimum viable process would be:
1. Uptime monitor sends alerts to a shared channel (Slack/Discord/email)
2. `docs/RUNBOOKS.md` is the first resource for any alert
3. Netlify dashboard (Deploys → Logs) is the primary investigation tool
4. Rollback via Netlify dashboard (publish a previous deploy) is the fastest mitigation

---

## Appendix: Files Changed in This Audit

| File | Change | Tests |
|------|--------|-------|
| `netlify/functions/health.ts` | **NEW** — Health check endpoint with liveness/readiness | 11 tests |
| `netlify/functions/__tests__/health.test.ts` | **NEW** — Health endpoint tests | — |
| `netlify/functions/generate.ts` | Enhanced structured logging, correlation IDs, circuit breaker | 5 new tests |
| `netlify/functions/__tests__/generate-handler.test.ts` | Added correlation ID + circuit breaker tests | — |
| `netlify/functions/__tests__/generate-contract.test.ts` | Added circuit breaker reset to test setup | — |
| `netlify/functions/__tests__/generate-concurrency.test.ts` | Added circuit breaker reset to test setup | — |
| `src/lib/api.ts` | ApiError now captures requestId from X-Request-Id header | — |
| `src/App.tsx` | Error logging includes requestId for tracing | — |
| `src/lib/__tests__/api-generate.test.ts` | Updated mocks to include response headers | — |
| `docs/RUNBOOKS.md` | **NEW** — 10 operational runbooks | — |

**Test count**: 290 → 295 (5 new tests added, 0 broken)
