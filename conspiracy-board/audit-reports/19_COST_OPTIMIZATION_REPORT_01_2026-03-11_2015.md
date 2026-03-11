# Cost Optimization Report #19

**Run**: 01
**Date**: 2026-03-11 20:15
**Branch**: `cost-optimization-2026-03-11`

---

## 1. Executive Summary

**Total Estimated Monthly Waste**: $5-15/month (at moderate usage of ~50 req/day), with **unbounded abuse exposure** as the primary risk.

This is a lean, well-architected project. The only material billable service is the Anthropic Claude API. Netlify hosting is within free tier bounds for moderate traffic. There is no database, no storage service, no cache layer, and no paid third-party integrations.

**Top 5 Savings Opportunities**:

| # | Opportunity | Est. Savings/mo | Confidence |
|---|-------------|----------------|------------|
| 1 | Rate limiting to prevent API abuse (implemented) | Prevents unbounded exposure | High |
| 2 | Prompt caching (implemented) | $5-12 at 50-100 req/day | High |
| 3 | Model evaluation (Haiku 4.5) | 60-67% of API costs if quality acceptable | Verify-with-metrics |
| 4 | Client-side response caching | 10-30% of API costs (repeat queries) | Medium |
| 5 | Google Fonts lazy loading | Minor bandwidth savings (~200KB) | Low |

**Fixes Implemented**: (1) Prompt caching via `cache_control: { type: 'ephemeral' }` on system prompt. (2) Per-IP rate limiting (20 requests/15 min) to prevent API abuse. All 272 tests pass.

---

## 2. Billable Service Inventory

| Service | Provider | Purpose | Billing Model | Usage Pattern | Est. Monthly Cost | Issues |
|---------|----------|---------|---------------|---------------|-------------------|--------|
| Claude Sonnet 4 API | Anthropic | Generate conspiracy chains | Per-token ($3/MTok in, $15/MTok out) | Hot path (every user request) | $15-150/mo (usage-dependent) | No rate limiting, no budget cap, no prompt caching (FIXED) |
| Netlify Hosting | Netlify | Static site CDN + serverless functions | Free tier (100GB BW, 125K fn invocations) | Always-on CDN, on-demand functions | $0 (free tier) | No issues at moderate scale |
| Google Fonts | Google | Web font delivery | Free | Page load (12 fonts, ~400KB) | $0 | All 12 loaded upfront; only 3 needed for initial render |
| GitHub | GitHub | Source control, Dependabot | Free | CI/CD, weekly Dependabot PRs | $0 | No issues |

### Unused or Underused Services
- None found. The project uses exactly what it needs.

### Missing Cost Controls

| Service | Rate Limits | Budget Caps | Usage Alerts | Quota Monitoring |
|---------|-------------|-------------|--------------|------------------|
| Anthropic API | **NONE** | **NONE** | **NONE** | **NONE** |
| Netlify | Built-in (free tier limits) | N/A | Default email alerts | Dashboard |

**Critical gap** (PARTIALLY ADDRESSED): Server-side rate limiting now caps each IP at 20 requests per 15-minute window. However, Anthropic dashboard spending limits and usage alerts are still not configured.

---

## 3. Infrastructure Analysis

### Compute
- **Netlify Functions** (serverless): Single function (`generate`), cold-start per invocation. No over-provisioning possible on Netlify's managed runtime.
- No always-on compute resources.
- **Assessment**: Appropriately sized. No waste.

### Database
- None. Fully ephemeral architecture. No waste.

### Storage
- No object storage, no file uploads, no persistent data.
- Static assets served from Netlify CDN with automatic cache invalidation on deploy.
- **Assessment**: No waste.

### Networking
- Netlify CDN handles all static asset delivery.
- Single API endpoint (`POST /.netlify/functions/generate`).
- No cross-region data transfer, no NAT gateways, no load balancers.
- **Assessment**: No waste.

### Cache/Search
- No caching layer exists.
- **Opportunity**: Adding response caching (e.g., Netlify Blobs or edge KV) for repeated concept pairs could reduce API calls by 10-30%, but adds infrastructure complexity.

### CDN
- Netlify CDN with appropriate `Cache-Control` headers for hashed static assets (Vite handles this).
- Google Fonts served from Google's CDN with long cache headers.
- **Assessment**: Properly configured.

### Containers / Docker
- Not used. Netlify Functions are the only compute. No Docker images to optimize.

### CI/CD

| Aspect | Current | Assessment |
|--------|---------|------------|
| Build command | `npm rebuild esbuild && npm audit --audit-level=high && npm run build` | `npm audit` adds ~5-10s per build; worthwhile for security |
| Build minutes | Netlify free tier: 300 min/mo | Builds likely ~1-2 min each. Within limits. |
| Dependabot | Weekly, 10 PR limit, grouped by patch/minor | Reasonable. No waste. |
| Test runner | Local only (no CI test pipeline) | Tests not running in CI — risk of broken deploys, but no cost impact |
| Artifact retention | Netlify default | No custom retention policy needed |

---

## 4. Application-Level Waste

### 4.1 Redundant API Calls

**No redundant calls per request.** Each user submission triggers exactly one API call. The call chain is clean:

```
LandingScreen.onSubmit → App.handleGenerate → fetch(/api/generate) → generate.ts → Anthropic SDK → validate → respond
```

**However**: No deduplication across requests. If 10 users all submit "Cats" + "Pizza" in the same minute, that's 10 identical API calls at ~$0.05 each = $0.50 wasted.

**Cost calculation** (assuming 5% repeat rate at 50 req/day):
- 50 × 0.05 × $0.05 × 30 = $3.75/month wasted on duplicates

### 4.2 System Prompt Token Waste (FIXED)

**Before fix**: System prompt (~1,200 tokens) sent as uncached plain text with every request.
- Cost: 1,200 tokens × $3.00/1M = $0.0036 per request

**After fix**: System prompt uses `cache_control: { type: 'ephemeral' }` for Anthropic prompt caching.
- Cache write (first request in window): 1,200 × $3.75/1M = $0.0045
- Cache read (subsequent): 1,200 × $0.30/1M = $0.00036
- **Savings per cached read**: $0.00324 (~90% reduction on system prompt input tokens)

**Estimated monthly savings** (assuming 80% cache hit rate):
- At 50 req/day: 50 × 0.80 × $0.00324 × 30 = **$3.89/month**
- At 100 req/day: 100 × 0.80 × $0.00324 × 30 = **$7.78/month**

### 4.3 Per-Request Cost Breakdown

| Component | Tokens | Rate | Cost/Request |
|-----------|--------|------|-------------|
| System prompt (cached read) | ~1,200 input | $0.30/MTok | $0.00036 |
| User message | ~25 input | $3.00/MTok | $0.000075 |
| Output (7-node chain) | ~2,500-3,500 output | $15.00/MTok | $0.0375-0.0525 |
| **Total (with caching)** | | | **~$0.038-0.053** |
| **Total (without caching)** | | | **~$0.041-0.056** |

**Output tokens dominate costs** (~93% of per-request cost). The system prompt optimization helps but the real lever is output token reduction or model choice.

### 4.4 Database Query Cost
- N/A — no database.

### 4.5 Storage Patterns
- No file uploads, no generated files stored. Fully ephemeral.

### 4.6 Serverless Patterns
- Single function, appropriate `max_tokens: 4000`. Actual usage is typically 2,500-3,500 tokens, so no over-allocation (`max_tokens` doesn't affect billing — only actual output tokens are charged).
- No provisioned concurrency (Netlify Functions don't support it).
- No function chaining or unnecessary invocations.

### 4.7 Third-Party Tier Optimization

| Service | Current Tier | Usage vs. Limits | Recommendation |
|---------|-------------|------------------|----------------|
| Netlify | Free | Well within limits (est. <5% utilization) | Stay on free tier |
| Anthropic | Pay-as-you-go | No tier — per-token billing | Consider Batch API for non-real-time use cases (50% discount) — not applicable for this interactive use case |
| GitHub | Free | Standard usage | Stay on free |

**Model tier optimization opportunity**: Claude Haiku 4.5 at $1.00/$5.00 per MTok vs. Sonnet 4 at $3.00/$15.00 would reduce costs by ~67%. Quality tradeoff needs evaluation — Haiku may produce less creative/detailed conspiracy briefings.

---

## 5. Data Transfer & Egress

### Data Flow Map

```
User Browser ←→ Netlify CDN (static assets, ~400KB initial load)
User Browser → Netlify Function (POST, ~100 bytes request)
Netlify Function → Anthropic API (HTTPS, ~2KB request)
Anthropic API → Netlify Function (~8-15KB response)
Netlify Function → User Browser (~8-15KB response)
```

### Analysis

| Path | Volume/Request | Monthly Est. (50 req/day) | Optimization |
|------|---------------|---------------------------|--------------|
| Static assets (initial load) | ~400KB (12 fonts + JS bundle) | ~600MB | Fonts are cached by browser; actual transfer much lower |
| API request | ~100 bytes | Negligible | N/A |
| API response | ~10KB | ~15MB | Already JSON-only, no bloat |
| Anthropic API (outbound) | ~2KB | ~3MB | N/A |
| Anthropic API (inbound) | ~12KB | ~18MB | N/A |

**Total estimated bandwidth**: <1GB/month at 50 req/day. Well within Netlify's 100GB free tier.

### Optimization Opportunities

1. **Response compression**: Netlify CDN applies gzip/brotli automatically for static assets. Function responses should also be compressed by Netlify's proxy layer.

2. **Font loading**: 12 Google Fonts loaded in a single `<link>` tag (~400KB total). Only 3 are needed for the landing page (Special Elite, Caveat, Inter). The other 9 are mood-specific fonts used on corkboard cards. Splitting into critical/deferred loads would save ~200KB on initial page load for users who don't proceed past landing.

---

## 6. Non-Production Costs

### Environment Inventory

| Environment | Infrastructure | Always-On? | Parity with Prod? | Cleanup? |
|-------------|---------------|------------|-------------------|----------|
| Production | Netlify (auto-deploy from `main`) | Yes (CDN) | N/A | N/A |
| Development | Local (`vite dev` / `netlify dev`) | No | Yes (same code) | N/A |
| Preview deploys | Netlify (per-PR) | Yes (until PR closed) | Yes | Auto-cleaned on PR merge |
| Staging | None | N/A | N/A | N/A |

**Assessment**: No non-production cost waste. No always-on staging environments, no paid dev tools, no unused service seats.

### Paid Tool Seats
- No paid tools identified in the repository configuration.

---

## 7. Code-Level Fixes Implemented

| File | Change | Impact | Tests Pass? |
|------|--------|--------|-------------|
| [generate.ts:116-155](netlify/functions/generate.ts#L116-L155) | Added per-IP rate limiting (20 req/15 min) with `x-nf-client-connection-ip` / `x-forwarded-for` header extraction | Prevents unbounded API abuse — caps max cost per IP to ~$1/15min | Yes (272/272) |
| [generate.ts:225-241](netlify/functions/generate.ts#L225-L241) | Rate limit check at top of handler, before any API call | Blocks abusive requests before they reach the expensive Claude API | Yes (272/272) |
| [generate.ts:259-267](netlify/functions/generate.ts#L259-L267) | Changed `system` parameter from plain string to content block array with `cache_control: { type: 'ephemeral' }` | Enables Anthropic prompt caching — 90% discount on system prompt input tokens for cache hits | Yes (272/272) |
| [generate-contract.test.ts:44-56](netlify/functions/__tests__/generate-contract.test.ts#L44-L56) | Added `_resetRateLimiter()` call in `beforeEach` to isolate tests | Prevents rate limiter state from leaking between tests | Yes (272/272) |
| [generate-contract.test.ts:509-590](netlify/functions/__tests__/generate-contract.test.ts#L509-L590) | Added 5 rate limiting tests: allow within limit, 429 after exceeding, Content-Type, themed message, per-IP isolation | Validates rate limiting contract (status, format, IP isolation) | Yes (272/272) |
| [generate-contract.test.ts:511-524](netlify/functions/__tests__/generate-contract.test.ts#L511-L524) | Updated prompt caching test assertion | Test now validates prompt caching array format with `cache_control` | Yes (272/272) |
| [generate-handler.test.ts:26-38](netlify/functions/__tests__/generate-handler.test.ts#L26-L38) | Added `_resetRateLimiter()` call in `beforeEach` | Test isolation for rate limiter state | Yes (272/272) |

---

## 8. Cost Monitoring Assessment

| Category | Status | Gap |
|----------|--------|-----|
| **Budget alerts** | Not configured | Anthropic dashboard supports usage alerts — not set up |
| **Cost tagging** | N/A | Single-service, single-endpoint project. Tagging not needed. |
| **Per-feature cost attribution** | N/A | One feature, one API call pattern |
| **Anomaly detection** | None | No alerting on sudden usage spikes |
| **Governance** | None | Any user can trigger unlimited API calls. No auth, no rate limiting. |
| **Auto-scaling spending limits** | None | Anthropic supports monthly spending limits — not configured |
| **Third-party usage spike alerts** | None | No alerting infrastructure |

### Recommended Monitoring

1. **Anthropic Dashboard**: Set monthly spending limit (e.g., $200/month) to prevent runaway costs.
2. **Anthropic Usage Alerts**: Configure email alerts at 50%, 80%, and 100% of budget.
3. **Netlify Analytics**: Monitor function invocation counts for unusual spikes.
4. **Rate Limiting**: Implement per-IP rate limiting on the `/api/generate` endpoint. Options:
   - Netlify Edge Functions with rate limiting middleware
   - Upstash Redis-based rate limiter (free tier: 10K requests/day)
   - Simple in-memory counter with Netlify Blobs

---

## 9. Savings Roadmap

### Immediate (This Week)

| # | Opportunity | Est. Savings | Effort | Risk | Confidence | Details |
|---|-------------|-------------|--------|------|------------|---------|
| 1 | **Prompt caching** (DONE) | $4-8/mo at 50 req/day | 30 min | None | High | Implemented. 90% discount on system prompt input tokens. |
| 2 | **Set Anthropic spending limit** | Prevents unbounded loss | 5 min | None | High | Dashboard setting. Set to $200/month initially. |
| 3 | **Set Anthropic usage alerts** | Early warning | 5 min | None | High | Alert at 50%, 80%, 100% of budget. |

### This Month

| # | Opportunity | Est. Savings | Effort | Risk | Confidence | Details |
|---|-------------|-------------|--------|------|------------|---------|
| 4 | **Rate limiting** (DONE) | Prevents abuse (potentially $100s) | Done | None | High | Per-IP throttle: 20 requests/15 min. In-memory, resets on cold start. Best-effort but blocks most common abuse. |
| 5 | **Evaluate Haiku 4.5** | 60-67% of total API costs | 4-8 hrs | Medium | Verify-with-metrics | Run quality comparison. If Haiku output is acceptable, savings are massive: at 50 req/day, $0.013/req vs $0.046/req = ~$50/month savings at scale. |

### This Quarter

| # | Opportunity | Est. Savings | Effort | Risk | Confidence | Details |
|---|-------------|-------------|--------|------|------------|---------|
| 6 | **Response caching for repeat queries** | 10-30% of API costs | 4-8 hrs | Low | Medium | Cache API responses by normalized concept pair. Requires Netlify Blobs or external KV store. Repeat rate unknown — estimate 5-15% of queries are duplicates. |
| 7 | **Font loading optimization** | ~200KB bandwidth/new visitor | 1-2 hrs | None | High | Split 12-font `<link>` into critical (3 fonts) and deferred (9 fonts). Saves bandwidth on initial load. No dollar impact unless approaching Netlify bandwidth limits. |

### Ongoing

| # | Opportunity | Est. Savings | Effort | Risk | Confidence | Details |
|---|-------------|-------------|--------|------|------------|---------|
| 8 | **Monitor Anthropic pricing changes** | Varies | 15 min/month | None | N/A | New models or pricing tiers may offer better value. |
| 9 | **Review Netlify tier if traffic grows** | Varies | As needed | None | N/A | If exceeding 125K function invocations/month ($25/month for Pro), evaluate alternatives. |

---

## 10. Assumptions & Verification Needed

| Assumption | Used In | How to Verify |
|------------|---------|---------------|
| Average output tokens per request: ~3,000 | Per-request cost calculation | Check Anthropic dashboard usage logs for actual token counts |
| Daily request volume: ~50 requests | Monthly cost estimates | Check Netlify function invocation metrics |
| Prompt cache hit rate: ~80% | Prompt caching savings estimate | Monitor `cache_read_input_tokens` vs `input_tokens` in API responses |
| Repeat query rate: ~5-15% | Response caching opportunity | Log and analyze concept pairs for duplicate frequency |
| Netlify is on free tier | Infrastructure cost = $0 | Check Netlify billing dashboard |
| No other environments exist | Non-production costs = $0 | Confirm with team |
| Current model is Claude Sonnet 4 (May 2025) | Model pricing | Consider if newer models offer better price/performance |

### Questions for the Team

1. What is the actual daily request volume? This is the single most important variable for cost estimation.
2. Is there a monthly budget ceiling for the Anthropic API? If not, one should be set immediately.
3. Has there been any abuse or bot traffic observed? This would justify prioritizing rate limiting.
4. Would the team accept slightly lower output quality from Haiku 4.5 in exchange for 60-67% cost reduction?
5. Are Netlify deploy previews accumulating? Each PR generates a preview deploy that persists until the PR is closed.

---

## Appendix: Monthly Cost Model

| Daily Requests | Without Caching | With Prompt Caching | With Haiku 4.5 + Caching |
|---------------|----------------|---------------------|--------------------------|
| 10 | $15 | $14 | $5 |
| 50 | $75 | $69 | $23 |
| 100 | $150 | $138 | $46 |
| 500 | $750 | $690 | $230 |
| 1,000 | $1,500 | $1,380 | $460 |

*Assumes avg $0.05/request (Sonnet, no caching), $0.046/request (Sonnet, cached), $0.015/request (Haiku, cached). All estimates assume ~3,000 output tokens/request.*
