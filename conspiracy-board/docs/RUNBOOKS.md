# Operational Runbooks — Conspiracy Board

> These runbooks cover the most likely production failure modes. Each is written for someone unfamiliar with the system. When in doubt, check the structured JSON logs in Netlify Functions → Logs.

---

## Table of Contents

1. [Anthropic API Key Missing or Invalid](#1-anthropic-api-key-missing-or-invalid)
2. [Anthropic API Timeout (504)](#2-anthropic-api-timeout-504)
3. [Anthropic API Rate Limited (503)](#3-anthropic-api-rate-limited-503)
4. [Invalid AI Response / Validation Failure (502)](#4-invalid-ai-response--validation-failure-502)
5. [Client-Side Rate Limiting (429)](#5-client-side-rate-limiting-429)
6. [Maintenance Mode Active (503)](#6-maintenance-mode-active-503)
7. [Function Cold Start Latency](#7-function-cold-start-latency)
8. [Netlify Build Failure](#8-netlify-build-failure)
9. [Health Check Failing](#9-health-check-failing)
10. [Elevated Error Rate (Generic 500s)](#10-elevated-error-rate-generic-500s)

---

## 1. Anthropic API Key Missing or Invalid

### Symptoms
- All requests return HTTP 500
- Logs show: `{"event":"generate_error","errorType":"auth_failure","severity":"CRITICAL"}`
- Health endpoint `/api/health` returns `unhealthy` with `anthropic_api_key.status: "unhealthy"`
- Health endpoint `/api/health/ready` returns 503

### Diagnosis Steps
1. Check Netlify dashboard → Site settings → Environment variables → `ANTHROPIC_API_KEY`
2. Verify the key is non-empty and starts with `sk-ant-`
3. Check Anthropic console (https://console.anthropic.com) for key status — is it revoked or expired?
4. Check if a recent deploy changed environment variables
5. Search Netlify function logs for `auth_failure` events

### Resolution
1. **Immediate**: If key is missing, add a valid `ANTHROPIC_API_KEY` in Netlify dashboard → Environment variables. Redeploy.
2. **If key exists but is invalid**: Generate a new key in Anthropic console, update in Netlify dashboard, redeploy.
3. **Verify**: Hit `/api/health/ready` — should return 200 with `anthropic_api_key.status: "healthy"`.

### Prevention
- Set up a second (backup) API key. Document where keys are stored.
- Monitor the health endpoint `/api/health/ready` — alert if it returns 503.

### Escalation
- If the Anthropic console itself is down, check https://status.anthropic.com
- Escalate to: _[team to fill]_

---

## 2. Anthropic API Timeout (504)

### Symptoms
- Users see "Our sources are currently unreachable" error
- Logs show: `{"event":"generate_error","errorType":"timeout"}`
- Latency spikes visible in `generate_success` logs (`latencyMs` values)
- Client-side: LoadingScreen shows "Taking longer than expected..." before failing

### Diagnosis Steps
1. Check https://status.anthropic.com for Anthropic service degradation
2. Search Netlify function logs for `generate_error` events with `errorType: "timeout"`
3. Compare recent `generate_success.latencyMs` values — normal is 5-12s
4. Check `ANTHROPIC_TIMEOUT_MS` env var (default 25000ms). Is it set too low?
5. Check Netlify function timeout in `netlify.toml` (currently 26s)

### Resolution
1. **If Anthropic is degraded**: Wait for resolution. Enable maintenance mode (`MAINTENANCE_MODE=true`) if timeout rate is very high — this prevents wasting API quota on requests that will fail.
2. **If timeout is too aggressive**: Increase `ANTHROPIC_TIMEOUT_MS` (max useful value: ~24000, must stay under Netlify's 26s function timeout).
3. **Verify**: Make a test request, confirm `generate_success` logs appear with normal latency.

### Prevention
- The SDK timeout (25s) is already well-tuned relative to the Netlify function timeout (26s).
- Monitor P95 latency from `generate_success.latencyMs` logs.

### Escalation
- If timeouts persist with Anthropic status showing healthy: _[team to fill]_

---

## 3. Anthropic API Rate Limited (503)

### Symptoms
- Users see "Our intelligence network is overwhelmed" error
- Logs show: `{"event":"generate_error","errorType":"api_rate_limited"}`
- This is the **Anthropic** rate limit (different from our per-IP rate limit)

### Diagnosis Steps
1. Check Anthropic console for current usage and rate limits
2. Count recent `generate_success` events — is traffic unusually high?
3. Check if the per-IP rate limiter (20 req/15 min) is working — look for `request_rejected` events with `reason: "rate_limited"`
4. Rate limiter is in-memory and resets on cold starts — rapid scaling could bypass it

### Resolution
1. **Immediate**: Enable maintenance mode (`MAINTENANCE_MODE=true`) to shed load
2. **If legitimate traffic**: Contact Anthropic to request higher rate limits
3. **If abuse**: Per-IP rate limiting should catch most abuse. If not, check if `x-nf-client-connection-ip` is being spoofed

### Prevention
- Monitor `api_rate_limited` error count
- Consider adding exponential backoff with a single retry on 429s
- In-memory rate limiter resets on cold start — be aware this is a limitation

### Escalation
- Anthropic rate limit increases: _[team to fill]_

---

## 4. Invalid AI Response / Validation Failure (502)

### Symptoms
- Users see "Our sources indicate this investigation has been shut down" error
- Logs show: `{"event":"generate_error","errorType":"unknown","errorMessage":"chain must have exactly 7 items..."}`
- Response status is 502

### Diagnosis Steps
1. Search logs for `generate_error` events where `errorMessage` contains "node" or "chain must"
2. Check if a specific input pair consistently triggers the error — could be a prompt edge case
3. Check if the model was recently changed in `generate.ts` (currently `claude-sonnet-4-20250514`)
4. Validation checks: chain must have exactly 7 items, each node needs title/emoji/font_category/teaser/briefing, length limits enforced

### Resolution
1. **If sporadic**: These are expected at a low rate (<1%). The AI occasionally produces malformed JSON. Users can retry.
2. **If persistent**: Check if the system prompt was recently modified. Revert if needed.
3. **If a specific model version is misbehaving**: Pin to a known-good model version.

### Prevention
- Keep the system prompt stable. Test changes with diverse inputs.
- Monitor 502 error rate — a sudden spike indicates a prompt or model regression.

### Escalation
- If 502 rate exceeds 5%: _[team to fill]_

---

## 5. Client-Side Rate Limiting (429)

### Symptoms
- Users see "Too many investigations in progress" error
- Logs show: `{"event":"request_rejected","reason":"rate_limited"}`
- Threshold: 20 requests per IP per 15-minute window

### Diagnosis Steps
1. Check if a single IP is generating excessive traffic (potential abuse)
2. Check if the rate limiter map was recently reset (cold start = rate limits reset)
3. The rate limiter is **in-memory** — each function instance has its own state

### Resolution
1. **If legitimate user hit limit**: They wait 15 minutes. No action needed.
2. **If abuse**: Netlify's own WAF/rate limiting can add another layer
3. **Rate limiter reset on cold start**: This is by design. Distributed rate limiting would require external state (Redis/KV) — currently not worth the complexity.

### Prevention
- Monitor `request_rejected` events with `reason: "rate_limited"` for abuse patterns
- Consider Netlify's built-in rate limiting for additional protection

### Escalation
- N/A — self-resolving

---

## 6. Maintenance Mode Active (503)

### Symptoms
- ALL requests return 503 with "scheduled maintenance" message
- Health endpoint `/api/health/ready` returns 503 with `maintenance_mode.status: "degraded"`
- Logs show: `{"event":"request_rejected","reason":"maintenance_mode"}`

### Diagnosis Steps
1. Check Netlify dashboard → Environment variables → `MAINTENANCE_MODE`
2. This is intentional — someone set it to `"true"` as a kill switch
3. Check team communication channels for context on why maintenance was enabled

### Resolution
1. **To disable**: Set `MAINTENANCE_MODE` to anything other than `"true"` (or delete the variable) in Netlify dashboard. Redeploy or wait for next function cold start.
2. **Verify**: Hit `/api/health/ready` — should return 200.

### Prevention
- Document when and why maintenance mode was enabled
- Set a calendar reminder to disable it if it's time-boxed

### Escalation
- N/A — this is an intentional state

---

## 7. Function Cold Start Latency

### Symptoms
- First request after idle period is noticeably slower (1-3s additional)
- In-memory rate limiter is empty (all rate limit state lost)
- `generate_success.latencyMs` shows occasional spikes on otherwise normal latency

### Diagnosis Steps
1. Cold starts are inherent to serverless. Not a bug.
2. Check if the pattern is always "first request slow, subsequent fast"
3. Netlify Functions timeout is 26s — cold start + API call must fit within this

### Resolution
1. **Not typically actionable.** Cold starts in Netlify Functions are 200-500ms.
2. If cold starts are a problem, Netlify Background Functions or Netlify Edge Functions could help.
3. The client has progressive loading states (8s slow warning, 12s timeout warning, 15s hard fail) to handle this gracefully.

### Prevention
- Keep function bundle size small (currently minimal: Anthropic SDK + handler)
- Avoid heavy initialization at module scope

### Escalation
- N/A — expected serverless behavior

---

## 8. Netlify Build Failure

### Symptoms
- Deployment fails in Netlify dashboard
- Build command: `npm rebuild esbuild && npm audit --audit-level=high && npm test && npm run build`

### Diagnosis Steps
1. Check Netlify deploy logs — which step failed?
2. **`npm audit` failure**: A high/critical vulnerability was found. Check `npm audit` output for details.
3. **`npm test` failure**: One or more of 293+ tests failed. Check which test and why.
4. **`npm run build` (tsc) failure**: TypeScript compilation error.
5. **`npm rebuild esbuild` failure**: Node version mismatch or platform issue.

### Resolution
1. **Audit failure**: Update the vulnerable package (`npm update <pkg>`) or evaluate if the advisory is relevant.
2. **Test failure**: Fix the failing test or the underlying code.
3. **Build failure**: Fix TypeScript errors.
4. **Emergency deploy with failing audit**: Temporarily lower audit level, but fix ASAP.

### Prevention
- Dependabot runs weekly for npm updates
- CI runs on all PRs (lint + typecheck + tests)
- Daily vulnerability scan at 09:00 UTC via GitHub Actions

### Escalation
- If a critical vulnerability has no patch: _[team to fill]_

---

## 9. Health Check Failing

### Symptoms
- `/api/health` returns non-200 status
- `/api/health/ready` returns 503

### Diagnosis Steps
1. Hit `/api/health` and inspect the JSON response
2. Check each component's `status` field:
   - `runtime`: If unhealthy, the function runtime itself is broken (very rare)
   - `anthropic_api_key`: If unhealthy, see [Runbook #1](#1-anthropic-api-key-missing-or-invalid)
   - `maintenance_mode`: If degraded, see [Runbook #6](#6-maintenance-mode-active-503)
   - `environment`: If degraded, `ANTHROPIC_TIMEOUT_MS` is set to an unusual value

### Resolution
- Follow the linked runbook for whichever component is unhealthy/degraded.

### Prevention
- Monitor `/api/health/ready` with an uptime service (Pingdom, UptimeRobot, etc.)
- Alert on non-200 responses

### Escalation
- See individual component runbooks

---

## 10. Elevated Error Rate (Generic 500s)

### Symptoms
- Users see "Our sources indicate this investigation has been shut down" error
- Logs show: `{"event":"generate_error","errorType":"unknown"}`
- HTTP 500 responses increasing

### Diagnosis Steps
1. Check structured logs for `generate_error` events — what is the `errorName` and `errorMessage`?
2. Use `requestId` from logs to trace individual failing requests
3. Check Anthropic status page
4. Check if recent code changes were deployed (git log)
5. Check if error is consistent or intermittent

### Resolution
1. **If caused by code change**: Revert the deploy in Netlify dashboard (Deploys → click previous deploy → "Publish deploy")
2. **If Anthropic issue**: Enable maintenance mode while waiting for resolution
3. **If unknown**: Collect `requestId` values from error logs for detailed investigation

### Prevention
- All code changes go through CI (lint + typecheck + tests)
- Structured logging with `requestId` enables per-request tracing
- Monitor error rate from structured logs

### Escalation
- If error rate exceeds 10% of traffic: _[team to fill]_

---

## Quick Reference: Log Event Types

| Event | Meaning | Key Fields |
|-------|---------|------------|
| `generate_success` | Successful chain generation | `requestId`, `latencyMs`, `inputTokens`, `outputTokens`, `cacheRead`, `cacheWrite` |
| `generate_error` | Failed generation | `requestId`, `errorType`, `errorName`, `latencyMs` |
| `request_rejected` | Pre-processing rejection | `requestId`, `reason` (method_not_allowed, maintenance_mode, rate_limited, blocked_content, circuit_open) |
| `rate_limit_cleanup` | Rate limiter map pruned | `sizeBefore`, `sizeAfter` |

## Quick Reference: Error Types

| `errorType` | HTTP Status | Meaning |
|-------------|-------------|---------|
| `timeout` | 504 | Anthropic API call timed out |
| `api_rate_limited` | 503 | Anthropic rate limit hit |
| `auth_failure` | 500 | API key invalid (CRITICAL) |
| `unknown` | 500 or 502 | Unclassified error |

## Dependency Matrix

| Dependency | Down Impact | Slow Impact | Timeout? | Retry? | Circuit Breaker? | Graceful Degradation? |
|-----------|-------------|-------------|----------|--------|------------------|-----------------------|
| **Anthropic Claude API** | All generations fail (500/504), circuit breaker opens after 3 failures | Increased latency, potential timeouts | Yes (25s SDK, 26s function) | No | **Yes** (3 failures → 30s cooldown) | Partial — circuit breaker fails fast (503) instead of 25s wait |
| **Netlify Functions Runtime** | Entire backend unavailable | Cold start latency (200-500ms) | Yes (26s) | N/A | N/A | Frontend loads, but API calls fail |
| **Google Fonts CDN** | UI renders with fallback system fonts | Slower initial page load | Browser default | Browser default | N/A | Yes — CSS fallback fonts |
| **Netlify CDN** | SPA not served at all | Slower page load | N/A | N/A | N/A | No — site is unreachable |

## Current Graceful Degradation Assessment

| Capability | Status | Notes |
|-----------|--------|-------|
| Maintenance mode kill switch | **Yes** | `MAINTENANCE_MODE=true` env var → 503 without API calls |
| Feature flags | **No** | No feature flag system |
| Circuit breaker on Anthropic API | **Yes** | 3 consecutive failures → 30s fast-fail cooldown, then half-open probe |
| Partial rendering on failure | **No** | All-or-nothing by design (7 cards or error) |
| Client timeout handling | **Yes** | Progressive UI states: 8s warning, 12s timeout warning, 15s hard fail |
| Offline/network error handling | **Yes** | Client catches fetch errors, shows themed error screen |
| Request cancellation | **Yes** | AbortController signal wired through fetch |
