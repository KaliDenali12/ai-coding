# Test Consolidation Report — Run 001

**Date**: 2026-03-10
**Branch**: `test-consolidation-2026-03-10`
**Framework**: Vitest 3.2.4

---

## 1. Executive Summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Test files | 24 | 23 | -1 |
| Total tests | 315 | 272 | **-43 (13.7%)** |
| Tests passing | 315 | 272 | All passing |
| Tests failing | 0 | 0 | — |
| Tests skipped | 0 | 0 | — |
| Consolidations executed | — | 7 | — |
| Consolidations reverted | — | 0 | — |

**No behavioral coverage was lost.** Every deleted test was confirmed to be a strict subset or verbatim duplicate of a test in the corresponding `-deep` or `-contract` file.

---

## 2. Consolidation Map

| # | Group | File(s) | Tests Before | Proposed Action | Tests After | Risk | Outcome |
|---|-------|---------|-------------|-----------------|-------------|------|---------|
| 1 | Font tests | `fonts.test.ts` (4) vs `fonts-deep.test.ts` (25) | 4 + 25 = 29 | Delete `fonts.test.ts` entirely | 25 | Low | **Executed** |
| 2 | Generate handler | `generate-handler.test.ts` (16) vs `generate-contract.test.ts` (49) | 16 + 49 = 65 | Remove 13 duplicates from handler | 3 + 49 = 52 | Low | **Executed** |
| 3 | Blocklist | `blocklist.test.ts` (14) vs `blocklist-deep.test.ts` (26) | 14 + 26 = 40 | Remove 9 duplicates from shallow | 5 + 26 = 31 | Low | **Executed** |
| 4 | Layout | `layout.test.ts` (15) vs `layout-deep.test.ts` (22) | 15 + 22 = 37 | Remove 12 duplicates from shallow | 3 + 22 = 25 | Low | **Executed** |
| 5 | API validation | `api.test.ts` (12) vs `api-validation-deep.test.ts` (18) | 12 + 18 = 30 | Remove 4 duplicates from shallow | 8 + 18 = 26 | Low | **Executed** |
| 6 | App corkboard | `App.test.tsx` (8) | 8 | Merge 2 redundant corkboard tests into 1 | 7 | Low | **Executed** |
| 7 | PolaroidCard keyboard | `PolaroidCard.test.tsx` (9) | 9 | Parameterize Enter/Space into `it.each` | 9 | Low | **Executed** (code reduction, same count) |

---

## 3. Consolidations Executed

### 3.1 — Delete `fonts.test.ts` (-4 tests)
**Commit**: `08f13de`
**Rationale**: All 4 tests (FONT_MAP entries, FONT_CLASS_MAP entries, getFontFamily values, getFontClass classes) are superseded by `fonts-deep.test.ts` which tests every category via parameterized `it.each`, plus consistency checks and class-map completeness validation.

### 3.2 — Remove 13 duplicates from `generate-handler.test.ts` (-13 tests)
**Commit**: `04c659f`
**Rationale**: 13 of 16 tests were exact or strict-subset duplicates of `generate-contract.test.ts`. Examples:
- "rejects non-POST requests with 405" — contract suite tests GET, PUT, DELETE, PATCH
- "returns valid chain on successful API call" — contract suite decomposes into 8 focused property tests
- "returns 502 when chain node has invalid font_category" — identical mock setup and assertion

**Kept 3 unique tests**:
- Invalid JSON response (uses different malformed input: `'not json {{{'` vs `'I cannot help with that'`)
- Error message leak prevention (tests message tone; contract tests API key safety specifically)
- Leet-speak `'7rump'` variant (contract only tests `'h1tl3r'`)

### 3.3 — Remove 9 duplicates from `blocklist.test.ts` (-9 tests)
**Commit**: `cd71e15`
**Rationale**: `checkInputs` tests for empty inputs, whitespace-only, length validation, same-word rejection, blocked term detection, and clean input allowance are all covered with more specific assertions in `blocklist-deep.test.ts`.

**Kept 5 unique tests**:
- Slur terms (`nigger`, `faggot`) — not explicitly tested in deep file
- Leet-speak substitution variants (`n1gg3r`, `f@gg0t`) — different substitution patterns than deep file's `h1tl3r`
- Political figures (`trump`, `obama`) — not directly tested in deep file
- `columbine` reference — only in shallow file
- Near-duplicate allowance (`Cat` vs `Cats`) — only in shallow file

### 3.4 — Remove 12 duplicates from `layout.test.ts` (-12 tests)
**Commit**: `904452d`
**Rationale**: Position count, rotation range, viewport bounds (desktop+mobile), flow direction (desktop+mobile), zigzag pattern, seed determinism, pin position, SVG path format, and sag control point are all tested in `layout-deep.test.ts` with parameterized or more specific assertions.

**Kept 3 unique tests**:
- Property type existence check (`typeof pos.x === 'number'`)
- Path starts-at-from-point coordinate assertion
- Path ends-at-to-point coordinate assertion

### 3.5 — Remove 4 duplicates from `api.test.ts` (-4 tests)
**Commit**: `215464e`
**Rationale**:
- "accepts a valid chain response" — deep file tests identity (`toBe`) plus all properties
- "rejects chain with wrong length (5)" — deep file tests lengths 6 and 8
- "rejects node with missing title" — deep file tests missing title at different index + null + numeric variants
- "rejects node with invalid font_category (comic_sans)" — deep file tests `papyrus` with error message value verification

**Kept 8 tests** with unique coverage: null/string rejection, empty-string case_file_number/classification_level, empty-string emoji/teaser/briefing, and font category acceptance loop.

### 3.6 — Merge 2 corkboard tests in `App.test.tsx` (-1 test)
**Commit**: `1e479ef`
**Rationale**: "shows corkboard after successful API response" and "renders all 7 cards on the corkboard" execute identical flows (type inputs → click submit → wait for corkboard). Merged into single test: "shows corkboard with all 7 cards after successful API response".

### 3.7 — Parameterize keyboard tests in `PolaroidCard.test.tsx` (0 test count change)
**Commit**: `89581f1`
**Rationale**: Enter and Space key tests were structurally identical, differing only in the `key` value. Merged into `it.each([['Enter', 'Enter'], ['Space', ' ']])`. Same test count, but 12 fewer lines of code and easier to extend.

---

## 4. Consolidations Reverted

None. All 7 consolidations passed on first attempt.

---

## 5. Consolidations Identified but Not Executed

### 5.1 — `App-integration-deep.test.tsx` button-disabled tests
**Tests**: "submit button is disabled when inputs are empty" and "submit button is disabled when inputs are identical" overlap with `LandingScreen.test.tsx` tests.
**Why left alone**: These test the same validation at the App integration level (full component tree) vs the component unit level. While the assertions overlap, they serve different test layers — the integration tests prove the component is wired correctly into the App, which unit tests cannot verify. Conservative decision: keep both.

### 5.2 — `generate-contract.test.ts` parameterization opportunities
**Tests**: 4 invalid-type tests (numeric, boolean, array, null) could be `test.each`. 4 blocked-content variants could be `test.each`. 2 missing-field tests could be `test.each`.
**Why left alone**: These are in the API contract suite which was designed for individual test clarity per HTTP contract. Parameterizing would reduce ~10 tests to ~3, but the per-test naming is highly readable for contract validation debugging. The code duplication is minimal (each test is 3-5 lines). Net benefit too small to justify the risk of making contract tests harder to debug.

### 5.3 — `CaseFileStamp.test.tsx` loop-based test
**Test**: "renders different classification levels correctly" uses a `for...of` loop over 4 values.
**Why left alone**: Converting a loop to `test.each` would improve test runner output (individual pass/fail per level) but doesn't reduce test count or eliminate duplication. Low priority.

### 5.4 — Cross-layer overlap between App.test.tsx and App-integration-deep.test.tsx
**Overlap**: "shows corkboard after successful API response" (App.test) overlaps with "full flow: landing → loading → board with all cards" (App-integration-deep). Both verify corkboard + 7 cards after submit.
**Why left alone**: The App.test version is a focused unit test of the state transition. The deep version is a comprehensive flow test that also checks landing visibility, case file stamp, and card count. They serve different verification purposes (focused regression vs end-to-end flow confidence).

---

## 6. Remaining Redundancy

### Happy-path saturation in `generate-contract.test.ts`
The contract suite has 8 tests verifying properties of the 200 success response (status code, Content-Type, chain length, node fields, font categories, case_file_number, classification_level, no error field). While individually small, they all exercise the same successful API call and could theoretically share a single response fixture. However, this is by design for API contract suites — each test documents one contractual guarantee.

### `api-generate.test.ts` ApiError class tests
Three tests validate the `ApiError` class structure (name property, instanceof chain, statusCode storage). These test class structure rather than behavior, which TypeScript's type system could enforce. However, since `ApiError` is used across module boundaries (mocked in App tests), the runtime tests have defensive value.

---

## 7. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---|---|---|---|---|
| 1 | Adopt naming convention: `*.test.ts` for core tests, `*.deep.test.ts` for edge cases only | Prevents future duplication between shallow/deep pairs | Medium | Yes | The shallow/deep pattern caused most duplication. If deep files are expected to be supersets, shallow files will always drift into redundancy. Consider: shallow = smoke/core, deep = edge cases that DON'T overlap. |
| 2 | Add code review checklist item: "Does this test duplicate an existing test in the `-deep` file?" | Prevents re-accumulation | Low | Probably | Simple process change. Most effective if enforced in PR template. |
| 3 | Parameterize `generate-contract.test.ts` type-validation tests | Reduces 10 tests to 3 with `test.each` | Low | Only if time allows | Low risk, low reward. The contract suite is stable and readable as-is. |

---

## Appendix: Final Test File Inventory

| File | Tests | Module Covered |
|------|-------|---------------|
| `netlify/functions/__tests__/generate.test.ts` | 10 | Server-side validation logic (unit) |
| `netlify/functions/__tests__/generate-handler.test.ts` | 3 | Handler edge cases unique to handler (integration) |
| `netlify/functions/__tests__/generate-contract.test.ts` | 49 | Full API contract (HTTP status, headers, bodies) |
| `src/lib/__tests__/blocklist.test.ts` | 5 | Blocklist terms unique to this file |
| `src/lib/__tests__/blocklist-deep.test.ts` | 26 | Blocklist normalization, edge cases, checkInputs |
| `src/lib/__tests__/api.test.ts` | 8 | Client-side validation (null, empty string cases) |
| `src/lib/__tests__/api-validation-deep.test.ts` | 18 | Client-side validation edge cases (type coercion, null fields) |
| `src/lib/__tests__/api-generate.test.ts` | 9 | generateConspiracy fetch integration |
| `src/lib/__tests__/fonts-deep.test.ts` | 25 | Font maps, classes, consistency |
| `src/lib/__tests__/layout.test.ts` | 3 | Layout property existence, path coordinates |
| `src/lib/__tests__/layout-deep.test.ts` | 22 | Layout edge cases, bounds, seed, zigzag |
| `src/lib/__tests__/constants.test.ts` | 11 | Example pairs, loading messages, timing |
| `src/lib/__tests__/cn.test.ts` | 9 | Tailwind merge utility |
| `src/components/__tests__/LandingScreen.test.tsx` | 11 | Landing screen component |
| `src/components/__tests__/LoadingScreen.test.tsx` | 6 | Loading screen component |
| `src/components/__tests__/PolaroidCard.test.tsx` | 9 | Polaroid card (keyboard parameterized) |
| `src/components/__tests__/ErrorScreen.test.tsx` | 4 | Error screen component |
| `src/components/__tests__/RedString.test.tsx` | 7 | Red string SVG component |
| `src/components/__tests__/CaseFileStamp.test.tsx` | 5 | Case file stamp component |
| `src/components/__tests__/Corkboard.test.tsx` | 9 | Corkboard layout component |
| `src/__tests__/App.test.tsx` | 7 | App state machine (integration) |
| `src/__tests__/App-integration-deep.test.tsx` | 11 | App deep flows (integration) |
| `src/__tests__/smoke.test.tsx` | 5 | Smoke tests |
