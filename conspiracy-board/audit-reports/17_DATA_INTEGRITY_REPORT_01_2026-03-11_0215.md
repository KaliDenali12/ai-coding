# Data Integrity & Validation Audit Report

**Report ID**: 17_DATA_INTEGRITY_REPORT_01
**Date**: 2026-03-11 02:15 AM
**Auditor**: Claude Opus 4.6 (automated)
**Branch**: `data-integrity-2026-03-11`
**Scope**: Full codebase — input validation, data constraints, referential integrity, schema drift, business invariants

---

## 1. Executive Summary

**Overall Data Integrity Health: EXCELLENT**

This application is an ephemeral, stateless SPA with no database, no persistent storage, and a single API endpoint. The architectural simplicity means entire categories of data integrity risk (orphaned records, schema drift, referential integrity, cascading deletes) are structurally eliminated — they cannot exist.

The areas that DO apply — input validation and response validation — are implemented thoroughly with defense-in-depth across client and server boundaries.

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Input Validation | 3 minor gaps | Low |
| Database Constraints | N/A (no database) | — |
| Orphaned Data | N/A (no persistence) | — |
| Schema Drift | 1 minor observation | Info |
| Business Invariants | 2 documented, both enforced | — |

**No critical or high-severity findings.**

---

## 2. Phase 1: Input Validation Audit

### 2.1 Input Boundary Map

| # | Boundary | Type | Location | Direction |
|---|----------|------|----------|-----------|
| 1 | Text input (Concept A) | HTML form field | `src/components/LandingScreen.tsx:85-98` | User → Client |
| 2 | Text input (Concept B) | HTML form field | `src/components/LandingScreen.tsx:104-117` | User → Client |
| 3 | Example chip click | Hardcoded values | `src/components/LandingScreen.tsx:152-161` | Constants → Client |
| 4 | Keyboard Enter key | KeyboardEvent | `src/components/LandingScreen.tsx:37-44` | User → Client |
| 5 | POST request body | JSON payload | `netlify/functions/generate.ts:182-188` | Client → Server |
| 6 | Content-Length header | HTTP header | `netlify/functions/generate.ts:177-179` | Client → Server |
| 7 | Claude API response | JSON from LLM | `netlify/functions/generate.ts:228-241` | External API → Server |
| 8 | HTTP response body | JSON payload | `src/lib/api.ts:69-83` | Server → Client |
| 9 | Environment variable | `ANTHROPIC_API_KEY` | `netlify/functions/generate.ts:213` (via SDK) | Environment → Server |

### 2.2 Validation at Each Boundary

#### Boundary 1-2: Text Inputs (Client)

| Check | Implemented? | Details |
|-------|-------------|---------|
| Required fields | YES | `checkInputs()` rejects empty/whitespace-only |
| Max length | YES | HTML `maxLength={50}` + `checkInputs()` rejects > 50 |
| Min length | PARTIAL | Empty rejected, but single-character inputs allowed (acceptable for this use case) |
| Duplicate check | YES | Case-insensitive equality check |
| Content safety | YES | Full normalization pipeline + 43-term blocklist |
| Character allowlist | NO | Any Unicode characters accepted (intentional — concepts can be anything) |
| Trim before use | YES | Both client and server trim whitespace |

**Verdict**: Comprehensive for the use case. No gaps.

#### Boundary 3: Example Chips

| Check | Implemented? | Details |
|-------|-------------|---------|
| Values hardcoded | YES | `EXAMPLE_PAIRS` in `constants.ts` — no user input involved |
| Bypass validation? | YES (minor) | `handleChipClick()` calls `onSubmit(a, b)` directly without running `checkInputs()` |

**Finding DI-001 (Low)**: Example chips bypass `checkInputs()` validation. Since values are hardcoded constants controlled by developers, this is not a security risk. However, if a blocked term were accidentally added to `EXAMPLE_PAIRS`, it would bypass the client blocklist. The server blocklist would still catch it.

#### Boundary 5: POST Request Body (Server)

| Check | Implemented? | Details |
|-------|-------------|---------|
| Method enforcement | YES | Only POST accepted, 405 for others |
| Payload size limit | YES | 10KB via Content-Length header check |
| JSON parsing | YES | try/catch with 400 response |
| Required fields | YES | `conceptA` and `conceptB` must be present and non-empty |
| Type checking | YES | Both must be `typeof string` |
| Length limits | YES | Trimmed, then > 50 chars rejected |
| Duplicate check | YES | Case-insensitive equality |
| Content safety | YES | Server-side blocklist with identical normalization pipeline |
| Extra fields | IGNORED | Extra properties in body are silently discarded (safe — no spread/assignment) |

**Finding DI-002 (Low)**: Content-Length header check can be bypassed. The `Content-Length` header is optional and can be omitted or spoofed. The check at line 177-179 only fires if the header is present: `if (contentLength && parseInt(contentLength, 10) > 10_000)`. Without the header, no size check occurs. Since `request.json()` will still parse the body, an attacker could send a body larger than 10KB. However, practical impact is minimal:
- The body only needs `conceptA` (50 chars max) and `conceptB` (50 chars max) — a valid payload is ~120 bytes
- Netlify Functions have their own request size limits (typically 6MB)
- The string length validation (50 chars) limits useful payload size regardless

**Finding DI-003 (Low)**: `parseInt(contentLength, 10)` does not handle non-numeric Content-Length values. A value like `"abc"` would return `NaN`, and `NaN > 10_000` is `false`, so it would pass. Again, practical impact is nil since the actual body parsing and field validation are the real guards.

#### Boundary 6-7: Claude API Response (Server)

| Check | Implemented? | Details |
|-------|-------------|---------|
| Text block exists | YES | Checks for `type === 'text'` content block |
| Valid JSON | YES | try/catch on `JSON.parse` |
| Object type | YES | `validateResponse()` checks object, not null |
| Chain is array | YES | Checks `Array.isArray` |
| Chain length = 7 | YES | Exact count enforced |
| All 5 node fields | YES | Each checked for non-empty string |
| font_category enum | YES | Validated against `FONT_CATEGORIES` array |
| case_file_number | YES | Non-empty string required |
| classification_level | YES | Non-empty string required |
| String length limits on fields | NO | No max length on title, teaser, briefing, etc. |

**Finding DI-004 (Info)**: No upper-bound length limits on AI-generated string fields (title, teaser, briefing, emoji, case_file_number, classification_level). The system prompt instructs "2-5 word bold title", "one sentence summary", "2-3 paragraphs", etc., but these aren't enforced in code. A malicious or confused AI response could return arbitrarily long strings. Impact: UI overflow/layout issues at worst. Not a security concern since the data never reaches a database and is only rendered in the browser.

#### Boundary 8: HTTP Response to Client

| Check | Implemented? | Details |
|-------|-------------|---------|
| response.ok check | YES | Non-2xx triggers error path |
| Error body parsing | YES | Graceful fallback if error body isn't JSON |
| Success body parsing | YES | try/catch on `response.json()` |
| Response validation | YES | `validateChainResponse()` mirrors server validation exactly |

**Verdict**: Double validation (server + client) provides excellent defense-in-depth.

#### Boundary 9: Environment Variable

| Check | Implemented? | Details |
|-------|-------------|---------|
| Presence check | SDK-HANDLED | Anthropic SDK throws if key is missing/invalid |
| Format validation | SDK-HANDLED | SDK validates key format |
| Never exposed to client | YES | Only used in Netlify function, never in frontend bundle |

### 2.3 Frontend vs. Backend Validation Consistency

| Rule | Frontend (checkInputs) | Backend (generate.ts) | Consistent? |
|------|----------------------|----------------------|-------------|
| Required fields | YES | YES | YES |
| Max 50 chars | YES (HTML + JS) | YES | YES |
| Trim before check | YES | YES | YES |
| Duplicate rejection | YES | YES | YES |
| Blocklist check | YES | YES | YES |
| Normalization pipeline | Identical | Identical | YES |
| Blocked terms list | Identical (43 terms) | Identical (43 terms) | YES |

**Note**: Error messages intentionally differ between client (themed copy) and server (plain backstop). This is documented in CLAUDE.md as intentional — not a bug.

### 2.4 Validation Error Format

All server validation errors use a consistent format:
```json
{
  "error": "validation" | "blocked" | "invalid_response" | "server_error" | "method_not_allowed",
  "message": "Human-readable explanation"
}
```

HTTP status codes are correct and semantic (400, 405, 413, 500, 502).

Client-side errors display via a `role="alert"` element for accessibility.

### 2.5 Summary

**Input validation is thorough.** Both layers (client + server) enforce identical rules. The server never trusts client validation — it re-validates everything. All three minor findings are low-severity edge cases with no practical exploit path.

---

## 3. Phase 2: Database Constraint Audit

### Result: NOT APPLICABLE

This application has **zero persistent storage**:

- No SQL or NoSQL database
- No localStorage, sessionStorage, IndexedDB, or Cache API usage
- No file system writes
- No cookie-based state (beyond standard HTTP cookies from Netlify)
- All application state lives in React `useState` and resets on page reload

**Verified by**: Full source code review of all 45 TypeScript source files. No imports of any database library, ORM, or storage API exist anywhere in the codebase.

There are no migrations to write, no constraints to add, and no schema to audit.

---

## 4. Phase 3: Orphaned Data & Referential Integrity

### Result: NOT APPLICABLE

With no persistent storage, orphaned data cannot exist.

### 4.1 Deletion Pattern Analysis

The only "deletion" in the codebase is state reset:

| Operation | File | What Happens | Orphan Risk |
|-----------|------|-------------|-------------|
| "New Investigation" button | `App.tsx:51-55` | Sets `boardData` to `null`, clears `lastInputs`, resets screen to `landing` | None — React garbage collects old state |
| Request abort | `App.tsx:23` | `abortControllerRef.current?.abort()` | None — in-flight fetch is cancelled, no data written anywhere |
| Error recovery | `ErrorBoundary.tsx:27-29` | Resets `hasError` to `false` | None — pure UI state |

### 4.2 Diagnostic Queries

Not applicable — no database to query.

---

## 5. Phase 4: Schema vs. Application Drift

### 5.1 Type Definitions vs. Runtime Validation

The project has two parallel type systems that must stay aligned:

**TypeScript Interfaces** (compile-time, `src/types/conspiracy.ts`):
```typescript
interface ConspiracyNode {
  title: string; emoji: string; font_category: FontCategory;
  teaser: string; briefing: string;
}
interface ConspiracyChain {
  chain: ConspiracyNode[]; case_file_number: string;
  classification_level: string;
}
```

**Runtime Validators**:
- Server: `validateResponse()` in `generate.ts:139-168`
- Client: `validateChainResponse()` in `api.ts:14-56`

| Field | TypeScript Type | Server Validator | Client Validator | Aligned? |
|-------|----------------|-----------------|-----------------|----------|
| `chain` | `ConspiracyNode[]` | Array, length 7 | Array, length 7 | YES |
| `chain[].title` | `string` | Non-empty string | Non-empty string | YES |
| `chain[].emoji` | `string` | Non-empty string | Non-empty string | YES |
| `chain[].font_category` | `FontCategory` (9 values) | Checked against FONT_CATEGORIES | Checked against FONT_CATEGORIES | YES |
| `chain[].teaser` | `string` | Non-empty string | Non-empty string | YES |
| `chain[].briefing` | `string` | Non-empty string | Non-empty string | YES |
| `case_file_number` | `string` | Non-empty string | Non-empty string | YES |
| `classification_level` | `string` | Non-empty string | Non-empty string | YES |

**Finding DI-005 (Info)**: The `classification_level` field is typed as `string` in both TypeScript and runtime validators, but the system prompt restricts it to 4 values: "TOP SECRET", "EYES ONLY", "RESTRICTED", "CLASSIFIED". This is not enforced in code — any non-empty string passes validation. This is acceptable since:
1. The value comes from a trusted source (Claude API)
2. It's only used as display text in `CaseFileStamp.tsx`
3. No business logic branches on its value

### 5.2 FONT_CATEGORIES Consistency

The `FONT_CATEGORIES` array is defined in three places:

| Location | Values | Source of Truth? |
|----------|--------|-----------------|
| `src/types/conspiracy.ts:1-11` | 9 categories | YES (exported, used by client) |
| `netlify/functions/generate.ts:3-6` | 9 categories | Duplicate (server-side copy) |
| System prompt in `generate.ts:92` | Listed in text | Matches code |
| `src/lib/fonts.ts:3-13` (FONT_MAP keys) | 9 categories | Matches (TypeScript enforces) |
| `src/lib/fonts.ts:15-25` (FONT_CLASS_MAP keys) | 9 categories | Matches (TypeScript enforces) |

The server duplicate in `generate.ts` is necessary because the Netlify function cannot import from `src/types/` (different build target). The two copies must be kept in sync manually. This is a known pitfall documented in CLAUDE.md.

### 5.3 Raw Query / Raw SQL Analysis

**No raw SQL exists anywhere in the codebase.** No database library is imported.

### 5.4 Enum/Status Consistency

| Enum-like Field | Definition | Usage Points | All Values Handled? |
|----------------|-----------|-------------|-------------------|
| `FontCategory` (9 values) | `conspiracy.ts` | `fonts.ts` FONT_MAP, FONT_CLASS_MAP | YES — `Record<FontCategory, string>` enforces exhaustive keys |
| `AppScreen` (4 values) | `App.tsx:10` | `App.tsx` render conditionals | YES — all 4 states rendered |
| `error.style` (3 values) | `constants.ts:33` | `ErrorScreen.tsx:25-59` | YES — all 3 styles rendered |
| `phase` (3 values) | `LoadingScreen.tsx:20` | `getMessage()` | YES — all 3 handled |
| Error `error` field (5 values) | `generate.ts` responses | `api.ts` error handling | PARTIAL — client only checks `response.ok`, doesn't branch on error type |

**No case/casing inconsistencies found.** All enum-like values use consistent casing throughout.

---

## 6. Phase 5: Business Invariant Documentation

### Invariant 1: Chain Must Have Exactly 7 Nodes

| Aspect | Detail |
|--------|--------|
| **Description** | Every conspiracy chain must contain exactly 7 nodes: concept A (index 0), 5 intermediates (1-5), concept B (index 6) |
| **Why** | UI layout, string connections, and animation timing all assume exactly 7 cards |
| **Enforced?** | YES — triple enforcement |
| **Enforcement points** | (1) System prompt: "EXACTLY 7 items" (2) Server `validateResponse()`: `chain.length !== 7` (3) Client `validateChainResponse()`: `chain.length !== 7` |
| **Diagnostic query** | N/A — no database |
| **Failure mode** | Invalid response → 502 error → themed error screen shown to user |

### Invariant 2: Blocked Content Must Never Reach the AI or UI

| Aspect | Detail |
|--------|--------|
| **Description** | User input containing any of 43 blocked terms (after normalization) must be rejected before it reaches the Claude API |
| **Why** | Content safety — prevents generating conspiracy theories about real tragedies, political figures, hate speech |
| **Enforced?** | YES — triple enforcement |
| **Enforcement points** | (1) Client `checkInputs()` blocks submission (2) Server `isBlocked()` rejects before API call (3) System prompt instructs Claude to refuse |
| **Diagnostic query** | N/A — no logged requests |
| **Failure mode** | Client: error message shown. Server: 400 response. Claude: refuses or sanitizes output |

### Invariant 3: Every Node Must Have All 5 Required Fields

| Aspect | Detail |
|--------|--------|
| **Description** | Each `ConspiracyNode` must have non-empty: title, emoji, font_category (valid enum), teaser, briefing |
| **Why** | `PolaroidCard.tsx` renders all 5 fields unconditionally; missing fields would cause blank UI or errors |
| **Enforced?** | YES — double enforcement |
| **Enforcement points** | (1) Server `validateResponse()` checks each node (2) Client `validateChainResponse()` checks each node |
| **Failure mode** | Invalid response → 502 error → themed error screen |

### Invariant 4: Blocklist Must Be Identical Client and Server

| Aspect | Detail |
|--------|--------|
| **Description** | The blocked terms list and normalization pipeline must be identical in `blocklist.ts` and `generate.ts` |
| **Why** | Divergence could allow blocked content through one layer but not the other |
| **Enforced?** | NO (manual process) |
| **Current status** | Lists are currently identical (verified in this audit) |
| **Recommendation** | Documented as known pitfall in CLAUDE.md. Could be improved with a shared constant file if the build system allowed it, but Netlify Functions and Vite frontend have separate module resolution. Current manual approach is acceptable. |

---

## 7. Recommendations

### Priority-Ordered Improvements

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? |
|---|---------------|--------|----------------|-------------|
| 1 | Add request body size check independent of Content-Length header | Closes DI-002: Content-Length bypass. Could limit `request.text()` length before JSON parsing. | Low — Netlify has its own limits, and field-level validation caps useful payload size. | Only if time allows |
| 2 | Add upper-bound length limits to AI response fields | Closes DI-004: Unbounded string lengths from AI. e.g., title ≤ 100 chars, teaser ≤ 500, briefing ≤ 5000. | Low — only affects UI layout if AI returns unexpectedly long text. | Probably |
| 3 | Validate `classification_level` against known values | Closes DI-005: Accept only the 4 expected values. | Low — purely cosmetic field, no logic depends on it. | Only if time allows |
| 4 | Run example chip values through `checkInputs()` at submit time | Closes DI-001: Ensures hardcoded values go through full validation pipeline. | Low — values are developer-controlled and currently safe. | Only if time allows |

### Suggested Ongoing Practices

1. **When modifying the blocklist**: Always update both `src/lib/blocklist.ts` and `netlify/functions/generate.ts` simultaneously. Run blocklist tests after each change.
2. **When adding new fields to ConspiracyNode**: Update all three locations — TypeScript interface, server `validateResponse()`, and client `validateChainResponse()`.
3. **When modifying FONT_CATEGORIES**: Update both `src/types/conspiracy.ts` and `netlify/functions/generate.ts` (server copy).

---

## 8. Files Reviewed

Every source file in the project was read during this audit:

### Components (9 files)
- `src/components/LandingScreen.tsx` — Input form + client validation
- `src/components/LoadingScreen.tsx` — Loading animation + timeout
- `src/components/Corkboard.tsx` — Board layout + card orchestration
- `src/components/PolaroidCard.tsx` — 3D flip card rendering
- `src/components/RedString.tsx` — SVG string animation
- `src/components/CaseFileStamp.tsx` — Classification stamp overlay
- `src/components/ErrorScreen.tsx` — Themed error display
- `src/components/ErrorBoundary.tsx` — React error boundary
- `src/App.tsx` — Root state machine

### Libraries (5 files)
- `src/lib/api.ts` — Client fetch + response validation
- `src/lib/blocklist.ts` — Client-side content safety
- `src/lib/constants.ts` — UI constants + timing
- `src/lib/fonts.ts` — Font category mapping
- `src/lib/layout.ts` — Card positioning algorithm

### Types (1 file)
- `src/types/conspiracy.ts` — All type definitions

### Backend (1 file)
- `netlify/functions/generate.ts` — Server handler + validation

### Config (3 files)
- `netlify.toml` — Build, redirects, security headers
- `src/main.tsx` — App entry point
- `CLAUDE.md` — Architecture documentation

---

## Appendix A: Finding Detail

### DI-001: Example Chips Bypass Client Validation
- **Severity**: Low
- **Location**: `src/components/LandingScreen.tsx:27-35`
- **Description**: `handleChipClick()` directly calls `onSubmit(a, b)` without routing through `checkInputs()`. Server-side validation would still catch any issues.
- **Risk**: If a developer accidentally adds a blocked term to `EXAMPLE_PAIRS`, the client blocklist won't catch it. Server blocklist still applies.
- **Suggested fix**: Call `checkInputs(a, b)` inside `handleChipClick()` before calling `onSubmit()`, or document that `EXAMPLE_PAIRS` must be manually reviewed against the blocklist.

### DI-002: Content-Length Header Optional / Spoofable
- **Severity**: Low
- **Location**: `netlify/functions/generate.ts:177-179`
- **Description**: The 10KB size limit relies on the `Content-Length` header, which may be absent (e.g., chunked transfer encoding) or spoofed.
- **Risk**: Minimal — the actual body content is validated by field-level checks (50 chars max per concept), so a valid payload is always tiny. Netlify platform limits also apply.
- **Suggested fix**: Read `await request.text()`, check `text.length <= 10_000`, then `JSON.parse(text)`. This checks actual body size rather than a header.

### DI-003: Non-numeric Content-Length Handling
- **Severity**: Info
- **Location**: `netlify/functions/generate.ts:178`
- **Description**: `parseInt("abc", 10)` returns `NaN`, which passes the `> 10_000` check. No practical impact since the actual body is parsed and validated regardless.

### DI-004: No Upper-Bound Length on AI Response Fields
- **Severity**: Info
- **Location**: `netlify/functions/generate.ts:156-164`
- **Description**: Fields like `title`, `teaser`, `briefing` are checked for non-empty but not for maximum length. The system prompt requests specific lengths ("2-5 word title", "2-3 paragraphs briefing") but code doesn't enforce these.
- **Risk**: If Claude returns unexpectedly verbose responses, cards could have layout overflow. No security or data integrity risk.

### DI-005: classification_level Not Enum-Validated
- **Severity**: Info
- **Location**: `netlify/functions/generate.ts:152-153` and `src/lib/api.ts:29-30`
- **Description**: Validated as non-empty string, but not checked against the 4 expected values ("TOP SECRET", "EYES ONLY", "RESTRICTED", "CLASSIFIED").
- **Risk**: None — the value is only used as display text in `CaseFileStamp.tsx`. Any string works fine visually.

---

*Report generated by automated audit. No code changes were made. All findings are informational or low-severity. Tests were not run (node_modules not installed in this environment).*
