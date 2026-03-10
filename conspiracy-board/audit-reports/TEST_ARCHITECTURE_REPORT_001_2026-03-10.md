# Test Architecture & Antipattern Audit Report

**Run:** 001
**Date:** 2026-03-10
**Suite:** Conspiracy Board — Vitest + Testing Library
**Test Files:** 24 | **Tests:** 315 | **Runtime:** 8.33s (tests) / 4.59s (total)
**All tests passing:** Yes

---

## 1. Executive Summary

**Suite Health Rating: Adequate (trending toward Fragile)**

| Metric | Value |
|--------|-------|
| Antipattern instances found | 98+ |
| Tests with zero assertions | 1 |
| Tautological / fixture-only tests | 4 |
| Near-duplicate tests (should consolidate) | ~55 pairs |
| Tests for trivially simple code | ~27 |
| Implementation-coupling assertions | ~16 |
| Unguarded expect() in callbacks | 7 |
| Mock duplication (framer-motion) | 10 files, ~50 lines each |
| Tests that mock local copies instead of production code | 7 |
| Misleading test names | 3 |
| Fragile CSS/attribute assertions | 6 |
| Regression effectiveness score | **Weak-to-Adequate** |

**Verdict:** This test suite would catch a catastrophic break (deleted function, wrong return type) but would likely miss a subtle behavioral bug introduced on a Friday afternoon — especially in the backend validation layer, where tests validate a local copy of `validateResponse` instead of the production code.

The biggest structural problem is **massive duplication**: `generate-handler.test.ts` is almost entirely a copy of `generate-contract.test.ts`, every `-deep` test file re-tests what the base file already covers, and the framer-motion mock is copy-pasted across 10 files. This inflates the 315 test count without proportionally increasing regression coverage. The true effective test count is closer to ~200 unique behavioral assertions.

---

## 2. Test Inventory

### Classification Table

| File | Tests | Type | Module | Runtime |
|------|-------|------|--------|---------|
| `src/lib/__tests__/blocklist.test.ts` | 14 | Unit | blocklist | Fast |
| `src/lib/__tests__/blocklist-deep.test.ts` | 26 | Unit | blocklist | Fast |
| `src/lib/__tests__/fonts.test.ts` | 4 | Unit | fonts | Fast |
| `src/lib/__tests__/fonts-deep.test.ts` | 9 | Unit | fonts | Fast |
| `src/lib/__tests__/api.test.ts` | 12 | Unit | api | Fast |
| `src/lib/__tests__/api-generate.test.ts` | 9 | Unit | api | Fast |
| `src/lib/__tests__/api-validation-deep.test.ts` | 18 | Unit | api | Fast |
| `src/lib/__tests__/layout.test.ts` | 15 | Unit | layout | Fast |
| `src/lib/__tests__/layout-deep.test.ts` | 26 | Unit | layout | Fast |
| `src/lib/__tests__/cn.test.ts` | 9 | Unit | cn | Fast |
| `src/lib/__tests__/constants.test.ts` | 11 | Unit | constants | Fast |
| `src/components/__tests__/LandingScreen.test.tsx` | 11 | Unit | LandingScreen | ~327ms |
| `src/components/__tests__/LoadingScreen.test.tsx` | 6 | Unit | LoadingScreen | Fast |
| `src/components/__tests__/PolaroidCard.test.tsx` | 9 | Unit | PolaroidCard | Fast |
| `src/components/__tests__/ErrorScreen.test.tsx` | 4 | Unit | ErrorScreen | Fast |
| `src/components/__tests__/RedString.test.tsx` | 7 | Unit | RedString | Fast |
| `src/components/__tests__/CaseFileStamp.test.tsx` | 5 | Unit | CaseFileStamp | Fast |
| `src/components/__tests__/Corkboard.test.tsx` | 9 | Unit | Corkboard | Fast |
| `src/components/__tests__/App.test.tsx` | 8 | Integration | App | ~2364ms |
| `src/__tests__/smoke.test.tsx` | 5 | Smoke | App | Fast |
| `src/__tests__/App-integration-deep.test.tsx` | 11 | Integration | App | ~2756ms |
| `netlify/functions/__tests__/generate.test.ts` | 10 | Unit | generate | Fast |
| `netlify/functions/__tests__/generate-handler.test.ts` | 16 | Unit | generate | Fast |
| `netlify/functions/__tests__/generate-contract.test.ts` | 49 | Unit | generate | Fast |

### Testing Pyramid

| Layer | Tests | Percentage |
|-------|-------|-----------|
| Unit | 286 | 90.8% |
| Integration | 19 | 6.0% |
| Smoke | 5 | 1.6% |
| E2E | 0 | 0% |

**Assessment:** Pyramid shape is correct (heavy unit, light integration, no E2E). However, many "unit" tests are duplicates of each other, inflating the unit count. The effective unique-behavior unit test count is ~190.

### Coverage Distribution

| Module | Test Files | Test Count | Notes |
|--------|-----------|------------|-------|
| blocklist | 2 | 40 | Heavy duplication between files |
| api/validation | 3 | 39 | Heavy duplication between files |
| layout | 2 | 41 | Heavy duplication between files |
| fonts | 2 | 13 | Moderate duplication |
| cn | 1 | 9 | Tests third-party library behavior |
| constants | 1 | 11 | Tests static data |
| generate (backend) | 3 | 75 | handler file nearly 100% duplicate of contract file |
| Components (6) | 6 | 51 | Reasonable |
| App integration | 3 | 24 | Some duplication |

### Modules Without Tests
All source modules have corresponding test files. No gaps.

### File Organization
- Consistent: all tests in co-located `__tests__/` directories
- Discoverable: test files named `{module}.test.ts(x)` or `{module}-deep.test.ts(x)`
- Pattern issue: The `-deep` naming convention creates confusion — these aren't "deeper" tests, they're largely duplicates with minor additions

---

## 3. Antipattern Findings

### 3.1 Implementation Coupling (16 instances)

| File | Test | What's Wrong | Severity | Fix |
|------|------|-------------|----------|-----|
| `layout-deep.test.ts` | `desktop zigzag: even-indexed cards are above center, odd below` | Asserts internal zigzag formula (even=above, odd=below) with specific seed | Medium | Test "cards have vertical variation" instead |
| `layout-deep.test.ts` | `all positions are within viewport bounds (desktop)` | Asserts `x >= 40` (internal padding constant) | Low | Assert `x >= 0` and `x <= viewportWidth` |
| `layout-deep.test.ts` | `control point is below midpoint (sag effect)` | Parses raw SVG path string by index `parts[5]` | High | Extract path parsing to a helper; test behavior not format |
| `layout-deep.test.ts` | `sag amount is capped at 60px` | Same SVG path parsing by index | High | Same fix |
| `layout-deep.test.ts` | `sag is proportional to distance` | Same SVG path parsing by index | High | Same fix |
| `layout.test.ts` | `control point creates downward sag` | Regex-parses SVG path string | Medium | Same fix |
| `generate-contract.test.ts` | `uses claude-sonnet-4-20250514 model` | Asserts exact model string in mock call | Medium | Remove or accept this as intentional config test |
| `generate-contract.test.ts` | `sets max_tokens to 4000` | Asserts exact config value | Medium | Same |
| `generate-contract.test.ts` | `includes system prompt in API call` | Asserts prompt substring | Low | Acceptable if treated as contract test |
| `generate-contract.test.ts` | `includes both concepts in user message` | Asserts message template format | Medium | Test that concepts appear, not exact format |
| `generate-contract.test.ts` | `trims whitespace from concepts before processing` | Inspects mock call arguments structure | Medium | Test via response behavior, not mock internals |
| `generate-handler.test.ts` | `trims whitespace from concepts` | Same mock call inspection | Medium | Same |
| `App.test.tsx` | `chip click triggers immediate API call` | Hardcoded to first `EXAMPLE_PAIRS` entry | Low | Use `EXAMPLE_PAIRS[0]` reference |
| `App-integration-deep.test.tsx` | `handles multiple successive API calls` | Only makes 1 call despite name | Medium | Fix test to actually test multiple calls |
| `CaseFileStamp.test.tsx` | `is non-interactive` | Asserts exact Tailwind class names | Medium | Test computed styles or behavior |
| `PolaroidCard.test.tsx` | `applies dynamic font class` | Queries by CSS class name `.font-corporate` | Medium | Use test ID or role instead |

### 3.2 Misleading Tests (4 instances)

| File | Test | What's Wrong | Severity | Fix |
|------|------|-------------|----------|-----|
| `Corkboard.test.tsx` | `does not flip cards during reveal` | **ZERO assertions** — always passes | **Critical** | Add assertions or delete |
| `PolaroidCard.test.tsx` | `shows push pin element` | Asserts front face exists, not push pin | Medium | Assert on actual pin element |
| `App-integration-deep.test.tsx` | `handles multiple successive API calls` | Only tests single call | Medium | Rename or implement properly |
| `App-integration-deep.test.tsx` | `shows client-side validation error for empty inputs` | Input-a has "Cats", only input-b is empty | Low | Fix test name |

### 3.3 Tautological / Fixture-Only Tests (4 instances)

| File | Test | What's Wrong | Severity | Fix |
|------|------|-------------|----------|-----|
| `generate.test.ts` | `requires exactly 7 chain items` | Asserts `Array.from({length: 7})` has length 7 | **High** | Delete — tests own fixture |
| `generate.test.ts` | `chain items have all required fields` | Asserts literal object has its own keys | **High** | Delete — tests own fixture |
| `generate.test.ts` | `response has case file metadata` | Same — fixture self-assertion | **High** | Delete — tests own fixture |
| `CaseFileStamp.test.tsx` | `defaults delay to 0 when not provided` | `expect(container).toBeTruthy()` — always true | Medium | Assert actual delay behavior |

### 3.4 Testing Local Copy Instead of Production Code (7 tests)

| File | Test | What's Wrong | Severity | Fix |
|------|------|-------------|----------|-----|
| `generate.test.ts` | Entire "Server-side response validation" block (7 tests) | Re-implements `validateResponse` and `FONT_CATEGORIES` locally, then tests the local copy. Production code could diverge undetected. | **Critical** | Import and test production `validateResponse` |

### 3.5 Unguarded expect() in Callbacks/Loops (7 instances)

| File | Test | What's Wrong | Severity | Fix |
|------|------|-------------|----------|-----|
| `api-generate.test.ts` | `throws ApiError on non-ok response with JSON error body` | expect() in catch block — silently skipped if no throw | **High** | Add `expect.assertions(N)` |
| `api-generate.test.ts` | `throws ApiError with fallback message when error body is not JSON` | Same — **entire test could pass with 0 assertions** | **Critical** | Add `expect.assertions(N)` |
| `generate-contract.test.ts` | `each chain node has required string fields` | expect() in `for...of` loop | Low | Add `expect.assertions()` |
| `generate-contract.test.ts` | `each chain node has a valid font_category` | Same loop pattern | Low | Same |
| `generate-contract.test.ts` | `all error responses are valid JSON...` | expect() in loop | Low | Same |
| `generate-contract.test.ts` | `validation errors use error=validation` | expect() in loop | Low | Same |
| `CaseFileStamp.test.tsx` | `renders different classification levels correctly` | expect() in `for...of` loop | Low | Same |

### 3.6 Near-Duplicate Tests (~55 pairs)

**Worst offenders:**

| Duplicate Pair | Overlap | Impact |
|---------------|---------|--------|
| `generate-handler.test.ts` ↔ `generate-contract.test.ts` | ~15 tests are near-identical | **Critical** — entire file is redundant |
| `blocklist.test.ts` ↔ `blocklist-deep.test.ts` | ~10 test pairs | High — inflates count |
| `layout.test.ts` ↔ `layout-deep.test.ts` | ~11 test pairs | High |
| `api.test.ts` ↔ `api-validation-deep.test.ts` | ~8 test pairs | High |
| `fonts.test.ts` ↔ `fonts-deep.test.ts` | ~4 test pairs | Medium |
| `App.test.tsx` ↔ `App-integration-deep.test.tsx` | ~5 test pairs | Medium |

**Fix pattern:** Merge `-deep` files into base files. Delete `generate-handler.test.ts` entirely (superseded by `generate-contract.test.ts`).

### 3.7 Mock Overuse & Duplication

| Issue | Files Affected | Impact |
|-------|---------------|--------|
| Framer-motion mock (~50 lines) copy-pasted | All 7 component tests + 3 App tests (10 files) | High maintenance burden |
| `ApiError` class re-implemented in test mocks | `App.test.tsx`, `smoke.test.tsx`, `App-integration-deep.test.tsx` | Medium — production class could diverge |

**Fix:** Extract framer-motion mock to `src/test/__mocks__/framer-motion.tsx` or `vitest.setup.ts`. Import real `ApiError` class instead of re-implementing.

### 3.8 Tests for Trivially Simple Code (~27 tests)

| File | Tests | What's Trivial |
|------|-------|---------------|
| `cn.test.ts` | 9 | Tests `twMerge(clsx(...))` — a one-liner wrapping two third-party libs |
| `constants.test.ts` | 11 | Tests static arrays and numbers (`1500 > 0`, array length checks) |
| `fonts.test.ts` + `fonts-deep.test.ts` | ~7 | Tests `Record<FontCategory, string>` maps — TypeScript already enforces |
| 5 component tests | 5 | "renders the X" tests that only check `data-testid` exists |
| `smoke.test.tsx` | 2 | `toBeTypeOf('function')` — type system catches this |
| `api-generate.test.ts` | 3 | `ApiError` class constructor (trivial 5-line class) |

### 3.9 Fragile Assertions (6 instances)

| File | Test | Fragile Assertion |
|------|------|-------------------|
| `RedString.test.tsx` | `has red stroke styling` | Exact CSS variable string match |
| `RedString.test.tsx` | `has rounded stroke caps` | Exact SVG attribute value |
| `RedString.test.tsx` | `is visible immediately when animate=false` | Exact `opacity` attribute |
| `RedString.test.tsx` | `starts hidden when animate=true` | Exact `opacity` attribute |
| `RedString.test.tsx` | `becomes visible after delay` | Exact `opacity` attribute |
| `CaseFileStamp.test.tsx` | `is non-interactive` | Exact Tailwind class names |

---

## 4. Regression Effectiveness

| Module | Test Count | Effective Tests | Rating | Why |
|--------|-----------|----------------|--------|-----|
| **blocklist** | 40 | ~25 | **Strong** | Good behavioral coverage of normalization, leet-speak, edge cases. Duplication is wasteful but the unique tests are solid. |
| **api/validation** | 39 | ~20 | **Adequate** | Good validation boundary testing. Weakened by 2 tests with unguarded assertions that could silently pass. |
| **layout** | 41 | ~20 | **Adequate** | Good bounds/determinism testing. Weakened by SVG path string parsing (fragile to format changes). |
| **fonts** | 13 | ~4 | **Decorative** | Most tests verify what TypeScript already enforces. Only the parameterized mapping tests add value. |
| **cn** | 9 | 0 | **Decorative** | Tests third-party library behavior, not application code. |
| **constants** | 11 | 0 | **Decorative** | Tests static data. Any change is intentional and requires test update. Zero regression value. |
| **generate (backend)** | 75 | ~35 | **Weak** | Massive duplication. 7 tests validate a LOCAL copy of `validateResponse`, not production code. The contract tests are decent but the handler tests are redundant. |
| **LandingScreen** | 11 | ~9 | **Strong** | Good behavioral tests for input, validation, submission, chip clicks. |
| **LoadingScreen** | 6 | ~4 | **Adequate** | Tests message display and cycling. |
| **PolaroidCard** | 9 | ~6 | **Adequate** | Good interaction tests. Some implementation coupling. |
| **ErrorScreen** | 4 | ~3 | **Adequate** | Simple component with adequate coverage. |
| **RedString** | 7 | ~2 | **Weak** | Most assertions are fragile attribute checks. |
| **CaseFileStamp** | 5 | ~2 | **Weak** | Tautological and implementation-coupled tests. |
| **Corkboard** | 9 | ~7 | **Adequate** | One zero-assertion test, but others are decent. |
| **App (integration)** | 24 | ~12 | **Adequate** | Good state machine coverage. Heavy duplication between files. |
| **Smoke** | 5 | ~2 | **Weak** | Module import checks are redundant with the type system. |

### Most Dangerous Gaps

1. **Backend `validateResponse` is tested via a local copy** — a bug in production validation would go undetected by 7 tests that appear to cover it.
2. **`api-generate.test.ts` error path** — if `generateConspiracy` stops throwing on non-OK responses, a test would silently pass with zero assertions executed.
3. **Corkboard reveal sequence** — the "does not flip cards during reveal" test has zero assertions and provides zero protection.
4. **RedString animation** — all animation behavior tests rely on exact attribute values that could change with any refactor.

---

## 5. Structural Assessment

### Organization
- **Consistent:** All tests co-located in `__tests__/` directories — good.
- **Discoverable:** Yes, predictable naming.
- **Problem:** The `-deep` file convention creates a false impression of "basic + advanced" testing. In reality, the deep files are ~60% duplicates of the base files.

### Naming Conventions
- **Generally good:** Most test names are descriptive (`should return 404 when...` style).
- **3 misleading names** identified (see Section 3.2).
- **No `test1` / `works correctly` anti-patterns.**

### Setup/Teardown Patterns
- **Appropriate scope:** `beforeEach` used correctly for mock clearing.
- **Problem:** Framer-motion mock duplicated in every file instead of shared setup.
- **Problem:** `ApiError` re-implemented in 3 files instead of imported.

### Custom Matchers/Utilities
- **None.** The project has no shared test utilities, custom matchers, or test factories.
- This is a gap — a shared mock setup and a `buildConspiracyChain()` factory would eliminate significant duplication.

### Test Configuration
- **Reasonable:** jsdom environment, globals enabled, React plugin, path alias.
- **No custom timeouts** — relies on Vitest defaults (appropriate for this suite).
- **Fast:** 8.33s total test execution — well within acceptable range.

---

## 6. Recommendations

| # | Priority | Recommendation | Impact | Risk if Ignored |
|---|----------|---------------|--------|----------------|
| 1 | **P0** | Fix `generate.test.ts` to import and test the PRODUCTION `validateResponse`, not a local re-implementation | 7 tests go from decorative to actually catching regressions | **Critical** — production validation bugs invisible to tests |
| 2 | **P0** | Add `expect.assertions(N)` to all tests with `expect()` in catch blocks or loops | Prevents silent zero-assertion passes | **Critical** — `api-generate.test.ts` error tests can pass without running any assertions |
| 3 | **P0** | Add assertions to `Corkboard > does not flip cards during reveal` or delete it | Eliminates a test that catches nothing | **High** — false confidence |
| 4 | **P1** | Delete `generate-handler.test.ts` entirely — it's ~95% duplicate of `generate-contract.test.ts` | Removes ~15 duplicate tests, reduces maintenance | **Medium** — wasted maintenance effort |
| 5 | **P1** | Merge each `-deep` file into its base file, removing duplicates | Reduces ~40 duplicate tests, clarifies actual coverage | **Medium** — inflated test count masks real coverage |
| 6 | **P1** | Extract framer-motion mock to shared setup file | Eliminates ~500 lines of duplicated mock code across 10 files | **Medium** — any mock change requires 10 file edits |
| 7 | **P2** | Import real `ApiError` class in App tests instead of re-implementing | Prevents class divergence | **Low** — class is simple and stable |
| 8 | **P2** | Delete `cn.test.ts` and `constants.test.ts` (or reduce to 1-2 smoke checks) | Removes ~20 decorative tests that test third-party libs and static data | **Low** — maintenance waste |
| 9 | **P2** | Create a `buildConspiracyChain()` test factory | Eliminates fixture duplication across test files | **Low** — convenience improvement |
| 10 | **P3** | Replace SVG path string parsing in layout tests with a helper function | Reduces fragility of 4 layout tests | **Low** — tests break on formatting changes |
| 11 | **P3** | Replace exact CSS/attribute assertions in RedString tests with behavioral checks | 5 tests become refactor-resistant | **Low** — tests break on styling changes |
| 12 | **P3** | Delete trivial "renders the X" tests that only check `data-testid` | Removes 5 zero-value tests | **Low** — no regression value |

---

## Appendix: Antipattern Summary Counts

| Category | Count |
|----------|-------|
| Implementation coupling | 16 |
| Misleading tests | 4 |
| Tautological / fixture-only | 4 |
| Testing local copy not production code | 7 |
| Unguarded expect() in callbacks/loops | 7 |
| Near-duplicate tests | ~55 pairs |
| Mock overuse / duplication | 10 files (framer-motion) + 3 files (ApiError) |
| Tests for trivially simple code | ~27 |
| Fragile assertions | 6 |
| Tests passing with empty render | 6 |
| Zero-assertion tests | 1 |
| **Total antipattern instances** | **~98+** |
