# Security Audit Report — Conspiracy Board

**Run:** 001
**Date:** 2026-03-10 15:45 (local)
**Branch:** `security-audit-2026-03-10`
**Auditor:** Claude Opus 4.6 (automated)
**Test Suite:** 272/272 passing after all fixes

---

## 1. Executive Summary

The Conspiracy Board codebase has a **strong security posture** for a stateless SPA with a single serverless endpoint. No hardcoded secrets, no XSS vectors, no injection vulnerabilities, and zero npm audit advisories. The most significant issues were a **Unicode blocklist bypass** (BUG-003) that undermined all three content safety layers, an **unwired AbortController** (BUG-002) allowing stale response races, and **missing security headers**. All three have been fixed in this audit. The remaining gaps — no rate limiting and no CORS headers on the API — are documented below as recommendations.

---

## 2. Automated Security Scan Results

### Tools Discovered and Run

| Tool | Version | Findings | Critical | High | Medium | Low | False Positives |
|------|---------|----------|----------|------|--------|-----|-----------------|
| npm audit | 10.x | 0 | 0 | 0 | 0 | 0 | 0 |
| TypeScript strict mode | 5.9.3 | 0 errors | — | — | — | — | — |
| ESLint | 9.39.x | Available but not run (linting, not security-focused) | — | — | — | — | — |

### Tools Recommended but Unavailable

| Tool | What It Catches | Effort to Add | Priority |
|------|----------------|---------------|----------|
| Gitleaks / TruffleHog | Secrets in git history | Low (npx) | Medium |
| Semgrep | SAST patterns (XSS, injection, etc.) | Low (pip/brew) | Medium |
| Socket.dev | Supply chain attacks, install scripts | Low (GitHub app) | Medium |
| Snyk | Dependency vulns + license issues | Low (CLI) | Low |

### Security CI/CD Assessment

**No security scanning in CI/CD.** The project uses Netlify auto-deploy from GitHub with `npm run build` only. No SAST, no dependency scanning, no secret detection in the pipeline. All security checks are manual.

---

## 3. Fixes Applied

| # | Issue | Severity | Location | Fix Applied | Tests Pass? | Detected By |
|---|-------|----------|----------|-------------|-------------|-------------|
| 1 | Unicode blocklist bypass (BUG-003) | **Critical** | `blocklist.ts:39-48`, `generate.ts:26-33` | Added NFKD normalization, zero-width char stripping, combining mark removal to `normalizeInput()` in both files | Yes (272/272) | Manual review |
| 2 | Missing security headers | **Medium** | `netlify.toml` | Added X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP | Yes (272/272) | Manual review |
| 3 | AbortController signal not wired (BUG-002) | **High** | `api.ts:58-65`, `App.tsx:24-27` | Added optional `signal` param to `generateConspiracy()`, wired from `AbortController` in `App.tsx` | Yes (272/272) | Manual review |
| 4 | Request body size not limited | **Low** | `generate.ts:157-162` | Added Content-Length check (max 10KB) before JSON parsing, returns 413 | Yes (272/272) | Manual review |
| 5 | Cyrillic/Greek confusable bypass | **Medium** | `blocklist.ts`, `generate.ts` | Added 30-char CONFUSABLES mapping table for Cyrillic/Greek → Latin transliteration | Yes (272/272) | Manual review |
| 6 | No security scanning in CI/CD | **Medium** | `netlify.toml` | Added `npm audit --audit-level=high` to build command | Yes (272/272) | Manual review |
| 7 | No install script restrictions | **Low** | `.npmrc` (new file) | Added `ignore-scripts=true`; build command runs `npm rebuild esbuild` | Yes (272/272) | Manual review |

### Fix Details

#### Fix 1: Unicode Blocklist Bypass (BUG-003)
**What was changed:** Added three preprocessing steps before the existing leet-speak substitution in `normalizeInput()`:
1. Strip zero-width characters: `[\u200B-\u200F\u2028-\u202F\u2060\uFEFF]`
2. NFKD normalization: decomposes fullwidth chars (`ｈ` → `h`) and ligatures
3. Strip combining marks: `[\u0300-\u036F]` (diacritics, underlines, overlines)

Applied identically to both `src/lib/blocklist.ts` and `netlify/functions/generate.ts`.

**Commit:** `94c3a1c` — `security: fix unicode blocklist bypass (BUG-003)`

#### Fix 2: Security Headers
**What was changed:** Added `[[headers]]` block to `netlify.toml` with:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'`

**Note for team review:** The CSP includes `'unsafe-inline'` for styles because Tailwind CSS and Framer Motion inject inline styles. This is a known trade-off. The `frame-ancestors 'none'` duplicates X-Frame-Options for modern browsers.

**Commit:** `0897eb7` — `security: add security headers to netlify.toml`

#### Fix 3: AbortController Signal Wiring (BUG-002)
**What was changed:**
- `src/lib/api.ts`: Added optional `signal?: AbortSignal` parameter to `generateConspiracy()`, passed to `fetch()`
- `src/App.tsx`: Passes `abortControllerRef.current.signal` to `generateConspiracy()`
- `src/__tests__/App.test.tsx`: Updated 2 test assertions to expect the new `AbortSignal` parameter

**Commit:** `c86eccc` — `security: wire AbortController signal to fetch (BUG-002)`

#### Fix 4: Request Body Size Limit
**What was changed:** Added Content-Length header check in `generate.ts` before `request.json()` parsing. Requests over 10KB return 413.

**Included in commit:** `94c3a1c` (same as blocklist fix, since both files were edited)

---

## 4. Critical Findings (Unfixed)

None. The only critical finding (Unicode blocklist bypass) was fixed.

---

## 5. High Findings (Unfixed)

### HIGH-001: No Rate Limiting on API Endpoint

**Severity:** High
**Location:** `netlify/functions/generate.ts` (entire handler)
**Description:** The `/api/generate` endpoint has no rate limiting. Any client can send unlimited requests.
**Impact:** API cost exhaustion (Claude Sonnet at ~$3/M tokens), denial of service against the Anthropic API quota, and brute-force probing of the blocklist.
**Proof:** No rate-limiting middleware, no IP tracking, no request counting anywhere in the codebase.
**Recommendation:** Add rate limiting via Netlify Edge Functions or a middleware layer. Example with a simple in-memory approach for Netlify Functions is limited (stateless), so consider Netlify Blobs or an external rate-limit service (e.g., Upstash Redis).
**Why It Wasn't Fixed:** Requires external state (Redis, KV store, or Netlify Blobs) which doesn't exist in the project. Architectural decision, not a mechanical fix.
**Effort:** Moderate (need to choose and integrate a rate-limit backend)
**Detected By:** Manual review

---

## 6. Medium Findings (Unfixed)

### MED-001: No Explicit CORS Configuration

**Severity:** Medium
**Location:** `netlify/functions/generate.ts` (all response handlers)
**Description:** No CORS headers are set on API responses. Netlify's default behavior allows same-origin requests, but cross-origin behavior is implicit rather than explicit.
**Impact:** If the deployment changes (CDN, reverse proxy, different domain), the API could be called from unauthorized origins. Currently low-risk since the SPA and functions are on the same domain.
**Recommendation:** Add explicit `Access-Control-Allow-Origin` header matching the deployed domain. Handle OPTIONS preflight requests.
**Why It Wasn't Fixed:** The correct allowed origin depends on deployment configuration (custom domain vs. Netlify subdomain). Can't determine the right value from codebase alone.
**Effort:** Quick fix once the domain is known
**Detected By:** Manual review

### ~~MED-002: Cyrillic Confusable Bypass~~ — FIXED

Moved to Fixes Applied table (Fix #5). Added 30-character CONFUSABLES mapping table covering Cyrillic and Greek lookalike characters.

### MED-003: Console.error Logs Internal Error Messages

**Severity:** Medium
**Location:** `generate.ts:238` — `console.error('Generate function error:', error)`
**Description:** Full error objects (including stack traces and potentially sensitive messages) are logged to Netlify's function logs. While not exposed to clients (error responses are themed), anyone with Netlify dashboard access can see full error details.
**Impact:** Low in practice — Netlify logs are access-controlled. But if an error contains an API key (e.g., in a URL), it would be logged.
**Recommendation:** Sanitize error objects before logging. Strip potential credential patterns from error messages.
**Why It Wasn't Fixed:** The existing test `never leaks internal error details to client` confirms client-side safety. Server-side log sanitization is a judgment call about log utility vs. security.
**Effort:** Quick fix
**Detected By:** Manual review

---

## 7. Low Findings (Unfixed)

### ~~LOW-001: No .npmrc with ignore-scripts~~ — FIXED

Moved to Fixes Applied table (Fix #7). Added `.npmrc` with `ignore-scripts=true` and `npm rebuild esbuild` to the build command.

---

## 8. Informational

### ~~INFO-001: No Security Scanning in CI/CD~~ — FIXED
Added `npm audit --audit-level=high` to the Netlify build command. Builds now fail on high/critical advisories. Consider adding Semgrep for SAST coverage.

### INFO-002: Single Dependency for AI (Anthropic SDK)
The `@anthropic-ai/sdk` package is the only runtime dependency with network access. It's well-maintained by Anthropic. No supply chain concerns identified.

### INFO-003: Excellent Error Response Sanitization
The error handling in `generate.ts` (lines 237-253) uses themed messages and never leaks internal details. Test coverage explicitly verifies API key leak prevention.

### INFO-004: No Auth Required (By Design)
This is a public, ephemeral app with no user accounts, no persistent data, and no admin panel. The only auth-relevant surface is the Anthropic API key, which is properly server-side only.

### INFO-005: Stale Blocklist Terms
The blocklist focuses on English terms. Non-English slurs, hate speech in other languages, and newer terms may not be covered. The Claude system prompt (Layer 3) provides a backstop.

---

## 9. Supply Chain Risk Assessment

### Post-install Scripts

| Package | Script Type | Behavior | Risk Level | Recommendation |
|---------|------------|----------|------------|----------------|
| esbuild | postinstall | Downloads platform-specific binary | Low | Legitimate build tool; pin version |
| fsevents | install | Builds native macOS addon | Low | Legitimate; macOS-only, no-ops elsewhere |

### Typosquatting Risks

No typosquatting risks identified. All 12 direct dependencies are well-known, high-download-count packages from established maintainers (@anthropic-ai, Facebook/Meta, Tailwind Labs, Vercel, Testing Library).

### Namespace/Scope Risks

| Package | Risk Type | Detail | Recommendation |
|---------|-----------|--------|----------------|
| — | — | No unscoped internal packages. All dependencies are public, scoped appropriately. | None needed |

### Lock File Integrity

**Pass.** All 360 resolved URLs point to `registry.npmjs.org`. No unexpected URLs, IPs, or missing integrity hashes. Lock file is committed and current.

### Maintainer Risk

No concerns identified. Key dependencies are maintained by:
- `@anthropic-ai/sdk` — Anthropic (the AI company)
- `react`, `react-dom` — Meta
- `tailwindcss` — Tailwind Labs
- `framer-motion` — Framer
- `vite` — Vite team (Evan You / Stackblitz)
- `vitest` — Vitest team (Anthony Fu)

### Transitive Dependency Stats

| Metric | Value |
|--------|-------|
| Direct dependencies | 12 (6 runtime, 6 dev) |
| Total packages in lockfile | 360 |
| Max depth | ~6 levels |
| Packages with install scripts | 2 (both legitimate) |
| Flagged packages | 0 |

---

## 10. Files Modified in This Audit

| File | Change |
|------|--------|
| `src/lib/blocklist.ts` | Unicode normalization in `normalizeInput()` |
| `netlify/functions/generate.ts` | Unicode normalization + request size limit |
| `netlify.toml` | Security headers |
| `src/lib/api.ts` | AbortSignal parameter |
| `src/App.tsx` | Pass AbortSignal to API call |
| `src/__tests__/App.test.tsx` | Updated test assertions for AbortSignal |
| `.npmrc` | New file — `ignore-scripts=true` |
| `CLAUDE.md` | Marked BUG-002 and BUG-003 as fixed |
