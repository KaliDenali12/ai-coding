# Cross-Cutting Consistency Audit Report

**Run**: #01
**Date**: 2026-03-10 17:00
**Branch**: `cross-cutting-consistency-2026-03-10`
**Auditor**: Claude Opus 4.6

---

## Executive Summary

The conspiracy-board is a small, stateless SPA with a single API endpoint. Most enterprise cross-cutting concerns (pagination, sorting, soft-delete, multi-tenancy, currency) are not applicable. The primary cross-cutting pattern is **duplication between client and server** — blocklist, validation logic, and font categories are intentionally duplicated across `src/lib/blocklist.ts`, `src/lib/api.ts`, and `netlify/functions/generate.ts`.

**Key finding**: 3 validation error messages have drifted between client and server. No security-severity issues found.

---

## Phase 1: Pagination Consistency

**SKIPPED** — No pagination exists. The app has a single POST endpoint returning one object (not a collection). No lists, no cursors, no offsets.

---

## Phase 2: Sorting & Filtering Consistency

**SKIPPED** — No sorting or filtering endpoints exist. The only "filtering" is the input blocklist (covered under content safety duplication analysis below).

---

## Phase 3: Soft Delete & Data Lifecycle Consistency

**SKIPPED** — No database, no persistent storage, no deletion operations. The app is fully ephemeral by design.

---

## Phase 4: Audit Logging & Activity Tracking Consistency

### Findings

Only 2 logging statements exist in the entire codebase:

| Location | Type | What's Logged |
|----------|------|---------------|
| `App.tsx:32` | `console.error` | "Generation failed:" + error object |
| `App.tsx:34` | `console.error` | API error status code + message |
| `generate.ts:253` | `console.error` | "Generate function error:" + error object |

**Assessment**: Consistent pattern (console.error for errors only, no info/debug/warn). No audit logging needed for an ephemeral app with no auth or user data. **No drift.**

---

## Phase 5: Timezone & Date/Time Handling Consistency

### Findings

All date/time usage is **relative millisecond timing** — no absolute dates, no date formatting, no timezone concerns.

| Location | Operation | Method | Purpose |
|----------|-----------|--------|---------|
| `LoadingScreen.tsx:21` | Capture start time | `Date.now()` | Elapsed time calculation |
| `LoadingScreen.tsx:42-54` | Elapsed comparison | `Date.now() - startTimeRef.current` | Phase thresholds |
| `constants.ts:52-59` | Timing constants | Integer milliseconds | Animation/loading timing |
| `Corkboard.tsx:66-92` | Animation delays | Integer arithmetic | Reveal sequence |

**Assessment**: All timing uses `Date.now()` for relative durations. No date objects, no date libraries, no timezone handling needed. **Fully consistent.**

---

## Phase 6: Currency & Numeric Precision Consistency

**SKIPPED** — No money, prices, or precision-sensitive numbers. All numeric operations are layout coordinates (px), animation timing (ms), and seeded random generation — none requiring precision guarantees.

---

## Phase 7: Multi-Tenancy & Data Isolation Consistency

**SKIPPED** — Single-tenant, no auth, no user concept, no data isolation needed.

---

## Phase 8: Error Response & Status Code Consistency

### Server Error Responses (generate.ts)

All server errors use consistent shape: `{ error: string, message: string }`

| Scenario | Status | `error` field | `message` field |
|----------|--------|---------------|-----------------|
| Wrong HTTP method | 405 | `"method_not_allowed"` | `"Method not allowed"` |
| Request too large | 413 | `"validation"` | `"Request too large."` |
| Missing concepts | 400 | `"validation"` | `"Both concepts are required."` |
| Concepts >50 chars | 400 | `"validation"` | `"Each concept must be 50 characters or fewer."` |
| Identical concepts | 400 | `"validation"` | `"Concepts must be different."` |
| Blocked terms | 400 | `"blocked"` | `"This subject is classified beyond our clearance level. Try something else."` |
| Invalid Claude response | 502 | `"invalid_response"` | `"Our sources indicate this investigation has been shut down. Try different subjects."` |
| Server error | 500 | `"server_error"` | `"Our sources indicate this investigation has been shut down. Try different subjects."` |

**Assessment**: Server error responses are **fully consistent** in shape. All use `{ error, message }` with `Content-Type: application/json`. The `error` field acts as a machine-readable code, `message` is user-facing. **No drift.**

---

## Cross-Cutting Duplication Analysis (Primary Concern)

### A. Blocklist Duplication (blocklist.ts ↔ generate.ts)

| Element | `src/lib/blocklist.ts` | `netlify/functions/generate.ts` | Match? |
|---------|----------------------|-------------------------------|--------|
| BLOCKED_TERMS | 47 terms, 5 categories | 47 terms, 5 categories | **IDENTICAL** |
| SUBSTITUTIONS | 9 mappings | 9 mappings | **IDENTICAL** |
| CONFUSABLES | 30 mappings | 30 mappings | **IDENTICAL** |
| normalizeInput() | 8-step pipeline | 8-step pipeline | **IDENTICAL** |
| isBlocked() | `BLOCKED_TERMS.some(t => normalized.includes(t))` | Same | **IDENTICAL** |

**Assessment**: The intentionally duplicated blocklist is **perfectly synchronized**. No drift.

### B. FONT_CATEGORIES Duplication (conspiracy.ts ↔ generate.ts)

| Source | Values |
|--------|--------|
| `src/types/conspiracy.ts:1-11` | horror, corporate, ancient, chaotic, scientific, military, mystical, retro, underground |
| `netlify/functions/generate.ts:3-6` | horror, corporate, ancient, chaotic, scientific, military, mystical, retro, underground |

**Assessment**: **IDENTICAL** content. Different formatting (multi-line vs compact) but same values in same order. No drift.

### C. Response Validation Duplication (api.ts ↔ generate.ts)

Both files validate the chain response with the same logic but **different error message formats**:

| Check | `api.ts` (client) | `generate.ts` (server) | Match? |
|-------|-------------------|----------------------|--------|
| Not an object | "Invalid response: not an object" | "Response is not an object" | **DRIFT** (cosmetic) |
| Chain length | "Invalid response: chain must have exactly 7 items" | "chain must have exactly 7 items, got {n}" | **DRIFT** (server more detailed) |
| Missing case_file_number | "Invalid response: missing case_file_number" | "missing case_file_number" | **DRIFT** (client has prefix) |
| Missing classification_level | "Invalid response: missing classification_level" | "missing classification_level" | **DRIFT** (client has prefix) |
| Node missing title | "Invalid node {i}: missing title" | "node {i}: missing title" | **DRIFT** (prefix differs) |
| Node invalid font | `"Invalid node {i}: invalid font_category \"{val}\""` | `"node {i}: invalid font_category"` | **DRIFT** (client includes value) |
| Node missing teaser | "Invalid node {i}: missing teaser" | "node {i}: missing teaser" | **DRIFT** (prefix differs) |
| Node missing briefing | "Invalid node {i}: missing briefing" | "node {i}: missing briefing" | **DRIFT** (prefix differs) |

**Assessment**: The validation **logic** is identical (same checks in same order), but error message **formatting** has drifted. This is low-severity because:
- Server validation errors are caught and replaced with a generic user-facing message before reaching the client
- Client validation errors are thrown as exceptions caught by App.tsx which just shows the error screen
- Neither set of messages is user-facing — they're developer diagnostics

**Severity**: Low. These messages never reach end users.

### D. Input Validation Message Duplication (blocklist.ts ↔ generate.ts)

| Validation | `checkInputs()` in blocklist.ts | Server handler in generate.ts | Match? |
|------------|-------------------------------|-------------------------------|--------|
| Empty inputs | "Both fields are required." | "Both concepts are required." | **DRIFT** — "fields" vs "concepts" |
| Length >50 | "Each concept must be 50 characters or fewer." | "Each concept must be 50 characters or fewer." | **IDENTICAL** |
| Identical | "You can't investigate yourself... or can you? (Enter two different subjects.)" | "Concepts must be different." | **DRIFT** — themed vs plain |
| Blocked | "This subject is classified beyond our clearance level. Try something else." | "This subject is classified beyond our clearance level. Try something else." | **IDENTICAL** |

**Assessment**: 2 of 4 input validation messages differ between client and server.

- **Empty inputs drift**: "fields" vs "concepts" — minor wording inconsistency. The client message is shown in the UI; the server message would only appear if the client validation was bypassed.
- **Identical inputs drift**: The client has a themed/playful message while the server has a plain message. This is likely **intentional** — the server acts as a security backstop with plain messages, while the client shows themed messages to users.

**Severity**: Low. Normal flow always hits client validation first. Server messages only appear when client validation is bypassed (direct API calls).

### E. UI canSubmit vs checkInputs Consistency (LandingScreen.tsx ↔ blocklist.ts)

`LandingScreen.tsx:46-49` has a `canSubmit` boolean that mirrors `checkInputs()` but as a simpler check:

| Rule | `canSubmit` (UI guard) | `checkInputs()` (full validation) | Match? |
|------|----------------------|----------------------------------|--------|
| Non-empty | `conceptA.trim().length > 0 && conceptB.trim().length > 0` | `!a \|\| !b` | **EQUIVALENT** |
| Max length | **NOT CHECKED** | `a.length > 50 \|\| b.length > 50` | **DRIFT** — but HTML `maxLength={50}` prevents this |
| Not identical | `conceptA.trim().toLowerCase() !== conceptB.trim().toLowerCase()` | `a.toLowerCase() === b.toLowerCase()` | **EQUIVALENT** |
| Not blocked | **NOT CHECKED** | `isBlocked(a) \|\| isBlocked(b)` | **INTENTIONAL** — blocking is only checked on submit |

**Assessment**: `canSubmit` is a subset of `checkInputs()` — it controls button enabled state, while `checkInputs()` runs on submit with full validation. The missing max-length check in `canSubmit` is harmless because `maxLength={50}` is set on both HTML inputs. This is **intentionally layered**, not drift.

---

## Phase 9: Synthesis & Drift Map

### Drift Heat Map

| Concern | Status | Detail |
|---------|--------|--------|
| Pagination | N/A | No collections |
| Sorting/Filtering | N/A | No sortable data |
| Soft Delete | N/A | No persistence |
| Audit Logging | **Consistent** (100%) | 3 console.error calls, same pattern |
| Date/Time | **Consistent** (100%) | All relative `Date.now()` |
| Currency/Numeric | N/A | No money |
| Multi-Tenancy | N/A | Single-tenant |
| Error Responses | **Consistent** (100%) | All use `{ error, message }` shape |
| Blocklist Duplication | **Consistent** (100%) | All 5 elements perfectly synchronized |
| Font Categories Duplication | **Consistent** (100%) | Same 9 values in same order |
| Response Validation Logic | **Consistent** (100%) | Same checks, same order |
| Response Validation Messages | **Minor drift** (~70%) | Prefix format differs, client includes invalid values |
| Input Validation Messages | **Minor drift** (50%) | 2 of 4 messages differ |
| UI Guard vs Full Validation | **Intentional layering** | canSubmit is a designed subset |

### Root Cause Analysis

| Drift Area | Root Cause |
|-----------|------------|
| Response validation messages | Client and server validators were written independently. Error messages are developer-facing diagnostics that were never standardized because they don't reach users. |
| Input validation messages | Client messages were themed for the UI experience; server messages were written as plain backstop validation. Likely intentional design but undocumented. |

### Prevention Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? |
|---|---|---|---|---|
| 1 | Standardize validation error message format with an "Invalid response:" prefix in both validators | Consistent developer experience when debugging | Low | Only if time |
| 2 | Document the intentional client/server message divergence for input validation in CLAUDE.md | Prevents future "fixes" that would remove the themed client messages | Low | Probably |
| 3 | Consider extracting FONT_CATEGORIES import in generate.ts from shared types (requires build config) | Eliminates one duplication source | Low — values rarely change | Only if time |

---

## Changes Made

**None.** No mechanical fixes were warranted:
- The validation message drift is cosmetic and developer-facing only
- The input validation message differences appear intentional (themed vs backstop)
- All security-relevant duplications (blocklist, normalization, font categories) are perfectly synchronized
