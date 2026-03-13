# Scheduled Jobs & Background Process Audit Report

**Report**: #28 | **Run**: 01
**Date**: 2026-03-13 | **Time**: 10:50 (local)
**Branch**: `scheduled-jobs-audit-2026-03-13`
**Auditor**: Claude Opus 4.6

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| **Recurring processes found** | 6 |
| **True scheduled jobs (cron/worker)** | 0 |
| **CI/CD scheduled processes** | 1 (Dependabot weekly) |
| **Frontend timers** | 4 |
| **Backend on-demand cleanup** | 1 |
| **Healthy** | 5 |
| **At-risk** | 1 |
| **Dangerous** | 0 |
| **Broken** | 0 |
| **Missing jobs identified** | 0 critical, 3 nice-to-have |

**If you read nothing else:** This codebase has no traditional background jobs, workers, or cron tasks. It's a stateless serverless SPA with no database, no persistent storage, and fully ephemeral data. The architecture makes most "missing job" categories irrelevant. The one at-risk process is the **in-memory rate limiter cleanup** in `generate.ts`, which has a theoretical (but impractical) memory growth path and resets entirely on cold starts — by design, not by accident.

---

## 2. Job Inventory

### 2.1 Frontend Timers (Client-Side Only)

These are React `useEffect` timers that exist only in the user's browser. They are not "jobs" in the server-side sense but are included for completeness.

| # | Name | Location | Schedule | Purpose | Cleanup |
|---|------|----------|----------|---------|---------|
| F1 | Loading message cycler | `LoadingScreen.tsx:26-32` | Every 1,500ms | Cycles through loading messages for UX | `clearInterval` in cleanup |
| F2 | Elapsed time tracker | `LoadingScreen.tsx:41-54` | Every 1,000ms | Monitors timeout phases (8s slow, 12s timeout, 15s fail) | `clearInterval` in cleanup |
| F3 | Resize debounce | `Corkboard.tsx:42-56` | 150ms after last resize | Recalculates card layout on window resize | `clearTimeout` + `removeEventListener` in cleanup |
| F4 | Reveal animation timer | `Corkboard.tsx:84-96` | One-shot (~6.6s) | Enables "New Investigation" button after reveal completes | `clearTimeout` in cleanup |

**Health: ALL HEALTHY.** Every timer properly cleans up via `useEffect` return function. No memory leaks. No orphaned intervals. All are bounded, short-lived, and tied to component lifecycle.

### 2.2 Backend Processes

| # | Name | Location | Schedule | Purpose |
|---|------|----------|----------|---------|
| B1 | Rate limit map pruning | `generate.ts:144-151` | On-demand (triggered when map exceeds 1,000 entries) | Removes stale IP entries from in-memory rate limit map |
| B2 | Anthropic SDK timeout | `generate.ts:289-290` | Per-request, 25s default | Bounds API call duration to prevent serverless function timeout |

### 2.3 CI/CD Scheduled Processes

| # | Name | Location | Schedule | Purpose |
|---|------|----------|----------|---------|
| C1 | Dependabot | `.github/dependabot.yml` | Weekly (Mondays) | Creates PRs for npm dependency updates |
| C2 | GitHub Actions CI | `.github/workflows/ci.yml` | On push/PR to main/master (event-triggered, not scheduled) | Runs lint, typecheck, tests |
| C3 | Netlify build validation | `netlify.toml:2` | On every deploy (event-triggered) | Runs audit, tests, then builds |

---

## 3. Detailed Health Assessment

### B1: Rate Limit Map Pruning

| Field | Detail |
|-------|--------|
| **Name** | Rate limit map cleanup |
| **Location** | `netlify/functions/generate.ts:144-151` |
| **Schedule** | Triggered when `rateLimitMap.size > 1000` |
| **Purpose** | Prunes stale entries (older than 15 min) from in-memory IP→timestamp[] map |
| **Runtime** | O(n) over map entries, sub-millisecond for 1000 entries |
| **Data scope** | All entries in rateLimitMap |
| **Dependencies** | None (pure in-memory) |
| **Trigger mechanism** | Conditional check on every request |
| **Concurrency protection** | N/A — Netlify Functions are single-threaded per invocation; map is per-instance |
| **Timeout** | N/A |
| **Error handling** | No try/catch around cleanup (could theoretically throw during iteration if map modified — but can't happen in single-threaded context) |
| **Monitoring** | No logging of cleanup events |
| **Idempotency** | Yes — safe to run multiple times |
| **Last modified** | 2026-03-11 (commit `c8e997a`) |

#### Silent Failure Risk: LOW
- The cleanup is inline with request handling. If it fails, the request handler's outer try/catch will catch it and return a 500 error, which IS logged.
- However, there's no logging of the cleanup itself — you wouldn't know if the map is growing or how often cleanup triggers.

#### Overlap Risk: NONE
- Netlify Functions are isolated per invocation. Each function instance has its own `rateLimitMap`. There's no shared state between instances.
- **Important design note**: This means rate limiting is per-instance, not global. On cold starts, the map resets. Under high load, multiple instances each maintain separate maps, so the effective rate limit is `20 * number_of_instances` per IP. This is documented and intentional — the rate limiter is a cost guardrail, not a security boundary.

#### Timeout Risk: NONE
- Cleanup iterates a bounded map (max ~1000 entries) doing simple timestamp comparisons. This completes in microseconds.

#### Idempotency: YES
- Filter-and-delete is inherently idempotent.

#### Data Correctness: GOOD
- Entries older than `RATE_LIMIT_WINDOW_MS` (15 min) are correctly filtered. The `filtered.length === 0` check correctly removes fully-stale IPs.

#### Resource Impact: NEGLIGIBLE
- Sub-millisecond operation on a small map.

#### "What if this hasn't run for a week?"
- The map grows unbounded until it hits 1000 entries. On Netlify, cold starts happen frequently (minutes of inactivity), which clears the map entirely. In the worst case (sustained high-traffic single instance), the map holds at most `entries × timestamps_per_entry` data. At 20 timestamps per IP (the rate limit), 1000 IPs = 20,000 numbers — about 160KB. Not a concern.

#### Overall Health: **HEALTHY** (with minor observation)
The only improvement would be adding a log when cleanup triggers, but this is cosmetic.

---

### C1: Dependabot

| Field | Detail |
|-------|--------|
| **Name** | Dependabot weekly updates |
| **Location** | `.github/dependabot.yml` |
| **Schedule** | Weekly, Mondays |
| **Purpose** | Auto-creates PRs for npm dependency updates |
| **Concurrency** | Max 10 open PRs (configured) |
| **Monitoring** | GitHub notifications, PR checks via CI |
| **Last modified** | 2026-03-13 (commit `6b6a3a5`) |

#### Silent Failure Risk: LOW
- If Dependabot fails, GitHub shows alerts in the repository's Security tab. PR creation is visible.
- However, if Dependabot stops running entirely (misconfiguration, GitHub outage), there's no external alert — you'd only notice by the absence of PRs.

#### "What if this hasn't run for a week?"
- Dependencies go unpatched for a week. Given the weekly schedule, missing one cycle means 2 weeks without updates. The `npm audit --audit-level=high` in the build pipeline provides a backstop — critical vulnerabilities would block deploys.

#### Overall Health: **HEALTHY**

---

### Health Summary Table

| Job | Silent Failure | Overlap | Timeout | Idempotency | Data Correctness | Monitoring | Overall |
|-----|---------------|---------|---------|-------------|-----------------|------------|---------|
| F1: Message cycler | N/A (client) | N/A | N/A | N/A | N/A | N/A | Healthy |
| F2: Elapsed tracker | N/A (client) | N/A | N/A | N/A | N/A | N/A | Healthy |
| F3: Resize debounce | N/A (client) | N/A | N/A | N/A | N/A | N/A | Healthy |
| F4: Reveal timer | N/A (client) | N/A | N/A | N/A | N/A | N/A | Healthy |
| B1: Rate limit cleanup | Low | None | None | Yes | Good | None (at-risk) | At-risk |
| B2: SDK timeout | Low | N/A | Configured | N/A | N/A | Logged | Healthy |
| C1: Dependabot | Low | Bounded (10 PRs) | N/A | Yes | N/A | GitHub UI | Healthy |

---

## 4. Critical Findings

**None.** No jobs are actively broken, silently failing, or dangerous.

The closest to a concern is the rate limit cleanup (B1) having no observability — but given the stateless serverless architecture with frequent cold starts, the practical risk is negligible.

---

## 5. Missing Jobs Analysis

### Jobs That Would Be Relevant in a Different Architecture (but NOT here)

This codebase has:
- **No database** — all data is ephemeral (generated per-request, held in React state)
- **No user accounts** — no sessions, tokens, or credentials to expire
- **No file uploads** — no orphaned files to clean
- **No persistent storage** — no stale cache to purge
- **No subscriptions** — no billing to manage
- **No PII storage** — no GDPR deletion requirements

This eliminates the vast majority of "missing job" categories: orphan cleanup, data hygiene, compliance jobs, session purging, backup verification, etc.

### Nice-to-Have (Not Critical)

| # | Purpose | Data/Scope | Suggested Frequency | Consequence of Absence | Effort |
|---|---------|-----------|---------------------|----------------------|--------|
| M1 | Dependency vulnerability monitoring beyond Dependabot | npm audit results | Daily (GitHub Action on schedule) | Relying solely on weekly Dependabot + deploy-time audit. A critical CVE published Tuesday won't be caught until next Monday's Dependabot run OR next deploy. | Low — add `schedule: cron: '0 9 * * *'` to existing CI workflow |
| M2 | Uptime / health check ping | `/.netlify/functions/generate` endpoint | Every 5 min (external service) | If the Netlify function fails (bad deploy, API key expiry, runtime error), nobody knows until a user complains. No synthetic monitoring exists. | Low — use free tier of UptimeRobot, Checkly, or similar |
| M3 | API key expiry monitoring | `ANTHROPIC_API_KEY` validity | Weekly | If the API key expires or is revoked, the app silently breaks for all users. The error IS logged (`CRITICAL — Anthropic API authentication failed`) but there's no alerting pipeline to surface it. | Low — manual calendar reminder or a scheduled health check that makes a test API call |

---

## 6. Fixes Applied

**No code changes made.** The codebase has no mechanical issues that warrant safe fixes:

- **Logging**: The `generate.ts` handler already logs success (with latency and token metrics) and all error paths (with error classification). Added in commits `46d6f69` and `4dde574`.
- **Timeouts**: The Anthropic SDK timeout is explicitly configured (`25s` default, configurable via env var). The Netlify function timeout is set to `26s`. The client-side fetch has a `30s` fallback abort. All documented in commit `9b295c5`.
- **Error handling**: No empty catch blocks exist. All catch paths log and return themed error responses. Anthropic SDK errors are classified by type (timeout, rate limit, auth, validation, other).
- **Idempotency**: The generate function is inherently idempotent — it's a stateless transformation (input concepts → generated chain). No side effects, no database writes.
- **Overlap protection**: Not applicable — serverless functions are isolated per invocation.

The frontend timers all properly clean up. No orphaned intervals or memory leaks.

---

## 7. Resource & Scheduling Analysis

### Peak-Hour Conflicts
Not applicable. There is no database, no background processing, and no batch jobs that could compete with user-facing traffic. The single serverless function handles one request at a time per instance, and Netlify auto-scales instances.

### Resource Consumption
- **Netlify Function**: Bounded at 26s max execution, ~4KB response size, single API call per invocation
- **Anthropic API**: ~4000 tokens output per request, with prompt caching reducing input token costs by ~90% on cache hits
- **Rate limiting**: 20 requests per IP per 15-minute window — prevents individual users from driving excessive API costs

### Schedule Optimization
- **Dependabot** (weekly, Mondays): Appropriate for a project of this size and update velocity
- **CI pipeline** (on PR/push): Appropriate — runs only when code changes
- **Build validation** (on deploy): Appropriate — catches issues before they reach production

---

## 8. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---------------|--------|-----------------|--------------|---------|
| 1 | Add daily vulnerability scan | Catches CVEs between weekly Dependabot runs | Low — build-time audit is a backstop | If time | Add `schedule: [{cron: '0 9 * * *'}]` trigger to `ci.yml` that runs `npm audit`. Only fires on schedule, not on every PR. |
| 2 | Add uptime monitoring | Know when the app is down before users report it | Medium — no visibility into production health | Probably | Free tier of UptimeRobot or similar. Ping the function endpoint, alert on failure. Takes 5 minutes to set up externally. |
| 3 | Add rate limit cleanup logging | Observability into map growth patterns | Very Low — map resets on cold starts | If time | Add `console.log(JSON.stringify({ event: 'rate_limit_cleanup', mapSizeBefore, mapSizeAfter }))` inside the cleanup block. One line of code. |
| 4 | Monitor API key validity | Detect key expiry before users hit errors | Low-Medium — auth failures ARE logged, just not alerted on | Probably | Either a scheduled health check or log-based alerting on `CRITICAL — Anthropic API authentication failed` messages. Depends on Netlify log pipeline. |

---

## Appendix: Why This Codebase Has So Few Background Processes

The "Conspiracy Board" architecture is deliberately minimal:

1. **Stateless**: No database, no sessions, no persistent state. Every request is independent.
2. **Serverless**: Netlify Functions scale automatically. No long-running processes to manage.
3. **Ephemeral**: Generated conspiracy chains exist only in the browser's React state. Closing the tab destroys them.
4. **Single-purpose**: One API endpoint, one external dependency (Anthropic Claude), one data flow.

This design eliminates entire categories of operational concerns (data cleanup, session management, queue processing, replication, migration, etc.) at the cost of having no persistence. For a comedy/entertainment app with no user accounts, this is the right tradeoff.

The most important "background process" in this system is actually **Dependabot + CI** — the automated supply chain security pipeline that keeps dependencies patched and validates every change. This is well-configured and healthy.
