# Test Hardening Report #01 — 2026-03-10

## Summary

| Metric | Count |
|--------|-------|
| Flaky tests found and fixed | 1 |
| Flaky tests found but couldn't fix | 0 |
| Previously disabled tests re-enabled | 1 |
| API endpoints found | 1 |
| Contract tests written | 49 |
| Documentation discrepancies found | 1 |

**Before**: 265 passing, 1 skipped (23 test files)
**After**: 315 passing, 0 skipped (24 test files)

---

## Phase 1: Flaky Test Diagnosis & Repair

### Detection Method

- Full test suite run 5 times sequentially — all 5 runs produced identical results (265 pass, 1 skip)
- No intermittent failures detected across runs
- Manual code audit for common flaky patterns: wall-clock time dependencies, shared mutable state, non-deterministic data, race conditions, real timers in tests

### Flaky Tests Fixed

| Test Name | File | Root Cause | Fix Applied |
|-----------|------|-----------|-------------|
| `handles AbortError silently` | `src/__tests__/App-integration-deep.test.tsx:186` | Used real `setTimeout(r, 100)` to wait for async promise settlement. This is timing-dependent and could fail on slow/overloaded systems. | Replaced `await new Promise(r => setTimeout(r, 100))` with `await waitFor(() => expect(mockGenerateConspiracy).toHaveBeenCalledTimes(1))` — deterministic promise-based waiting instead of arbitrary delay. |

### Previously Disabled Tests Re-enabled

| Test Name | File | Root Cause | Fix Applied |
|-----------|------|-----------|-------------|
| `catches terms with separator bypasses` | `src/lib/__tests__/blocklist-deep.test.ts:15` | Documented as BUG-001. `normalizeInput()` replaced separators (`.`, `-`, `_`) with space instead of removing them, so `h.i.t.l.e.r` became `h i t l e r` (doesn't match `hitler`). | Split the regex into two operations: (1) strip non-space separators `[\-_.]+` entirely, (2) collapse whitespace `\s+` to single space. Fix applied to BOTH `src/lib/blocklist.ts` and `netlify/functions/generate.ts`. |

### Flaky Tests Unresolved

None.

### Additional Hardening

| Issue | File | Fix Applied |
|-------|------|-------------|
| Magic number `15000` hardcoded in test instead of imported constant | `src/components/__tests__/Corkboard.test.tsx:80,93,106` | Imported `FAIL_THRESHOLD_MS` from `@/lib/constants.ts` and replaced all 3 occurrences. Tests now stay in sync if the constant changes. |

### Patterns Audited (No Issues Found)

| Pattern | Files Checked | Result |
|---------|--------------|--------|
| `vi.useFakeTimers()` / `vi.useRealTimers()` pairing | LoadingScreen, Corkboard, RedString tests | All properly paired in beforeEach/afterEach |
| Shared mutable state at describe level | All 24 test files | All use `vi.clearAllMocks()` in beforeEach; no mutation of shared state |
| `Math.random()` without seeding | `ErrorScreen.tsx` | Used in `useMemo([], [])` — memoized once per mount, tests don't assert on specific message selection. Low risk. |
| SVG polyfills (`getTotalLength`) | 4 test files | Consistently applied in `beforeAll` blocks |
| Framer Motion mocking | 8 component test files | Consistent mock implementation filtering animation props |
| `Date.now()` in production code | `LoadingScreen.tsx` | Properly isolated with `vi.useFakeTimers()` in tests |

---

## Phase 2: API Contract Testing

### API Endpoint Map

| Method | Path | Auth | Request Body | Status Codes | Test Status |
|--------|------|------|-------------|-------------|-------------|
| POST | `/.netlify/functions/generate` (redirected from `/api/generate`) | None (API key server-side only) | `{ conceptA: string, conceptB: string }` | 200, 400, 405, 500, 502 | 49 contract tests |

### Contract Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| HTTP method enforcement | 6 | GET, PUT, DELETE, PATCH rejected with 405; correct body and headers |
| 200 success response structure | 8 | Chain array length, node field types/presence, font_category validation, top-level fields, no error field |
| 400 validation errors | 11 | Missing/null/numeric/boolean/array concepts, length limits, identical concepts, consistent error format |
| 400 blocked content | 5 | Blocked terms, leet-speak bypass, separator bypass, themed messages |
| 502 invalid AI response | 5 | Wrong chain length, missing node fields, invalid font_category, themed messages |
| 500 server errors | 6 | SDK throws, empty content, non-JSON text, no leaked internals, themed messages |
| Input handling behavior | 5 | Whitespace trimming, correct model/max_tokens/system prompt, concept inclusion |
| Error format consistency | 3 | All errors have `error` + `message` fields, correct `error` values per category |

### Documentation Discrepancies

| What Docs Say | What Code Does | Location |
|---------------|---------------|----------|
| CLAUDE.md BUG-001 says fix is "change `' '` to `''`" | Naive `''` replacement breaks multi-word blocked terms (e.g., `sandy hook`). Actual fix requires splitting into two regex operations: strip `[\-_.]+` → `''`, then collapse `\s+` → `' '`. | CLAUDE.md "Key Pitfalls" section |

### Undocumented Behavior

| Behavior | Location | Notes |
|----------|----------|-------|
| 405 response body is `{ error: "Method not allowed" }` — uses only `error` field, no `message` field | `generate.ts:143` | Inconsistent with all other error responses which have both `error` and `message` fields |
| Validation order: method → body parsing → type checks → length → duplicates → blocklist | `generate.ts:141-185` | Not documented anywhere; determines which error message a user sees for inputs that violate multiple rules |
| Server-side duplicate check only compares `.toLowerCase()`, not `.trim().toLowerCase()` | `generate.ts:170` | Trimming happens on line 160-161, so this works, but the flow dependency is implicit |
| `console.error` is called for all 500/502 errors, logging full error details to server logs | `generate.ts:224` | Useful for debugging but not documented. Could leak sensitive info in log aggregation services. |
| The `isValidation` heuristic checks for string patterns in error messages to determine 500 vs 502 | `generate.ts:226` | Fragile — if validation error messages change format, errors could be miscategorized |

---

## Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---|---|---|---|---|
| 1 | Make 405 response format consistent with other errors | API consumers get predictable error shapes regardless of error type | Low | Only if time allows | Add `message` field to 405 response: `{ error: "Method not allowed", message: "Only POST is accepted." }` |
| 2 | Use error class/code enum instead of string pattern matching for 500 vs 502 | Eliminates fragile string-matching heuristic in error handler | Medium | Probably | The `isValidation` check on line 226 pattern-matches error messages. A `ValidationError` class would be more robust. |
| 3 | Update CLAUDE.md BUG-001 fix description | Prevents someone applying the naive fix and breaking multi-word blocklist terms | Medium | Yes | The documented fix of "change `' '` to `''`" is incomplete. Should describe the two-step regex approach. |
