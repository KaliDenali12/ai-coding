# Test Quality & Adversarial Coverage Audit — Run 001

**Date**: 2026-03-10
**Project**: conspiracy-board
**Test Files Analyzed**: 23
**Source Files Analyzed**: 16
**Total Tests**: 272+

---

## 1. Executive Summary

**Overall Quality Rating**: **Adequate**
**Assertion Quality Score**: 6.5/10
**Adversarial Coverage Score**: 3/10

**Verdict**: This suite catches most happy-path regressions and validates API contract structure well. However, it **would not catch** a blocklist bypass via Unicode confusables, XSS via concept injection into the rendered board, or subtle state corruption from rapid double-submissions. The adversarial input coverage is the weakest dimension — zero tests exercise Unicode bypass vectors, XSS payloads, or null byte injection on any input boundary.

---

## 2. Assertion Quality Findings

### Category 1: Execution-Only Tests

| File | Test Name | Issue |
|------|-----------|-------|
| `CaseFileStamp.test.tsx:70` | "defaults delay to 0 when not provided" | Only assertion is `expect(container).toBeTruthy()` — proves it rendered without crash, nothing about delay behavior |
| `Corkboard.test.tsx:118` | "does not flip cards during reveal" | Clicks card but makes **zero assertions** about the outcome. Comment says "verifies click is ignored" but nothing actually checks this |
| `smoke.test.tsx:91` | "core library modules load without errors" | Only checks `toBeTypeOf('function')` and `toBeDefined()` — verifies modules load, not that any function produces correct output |

### Category 2: Tautological Assertions

| File | Test Name | Issue |
|------|-----------|-------|
| `generate-contract.test.ts:96-107` | "System prompt contract" (3 tests) | Asserts properties of `validResponse` — a hardcoded test fixture. These verify the test data, not production code. Will always pass regardless of code changes |
| `smoke.test.tsx:113` | "type definitions are consistent" | Checks `FONT_CATEGORIES` has length 9 and contains 'horror' — verifies a constant, not behavior |
| `ErrorScreen.test.tsx:37` | "displays an error message" | `textContent?.length > 0` — since `ERROR_MESSAGES` is hardcoded non-empty, this always passes |
| `constants.test.ts` (multiple) | Timing/array shape checks | Tests like "has at least 4 pairs", "all messages are non-empty strings" verify constants haven't been deleted — not behavioral tests |

### Category 3: Implementation-Coupled Assertions

| File | Test Name | Issue |
|------|-----------|-------|
| `RedString.test.tsx:34` | "has red stroke styling" | Asserts exact `stroke` attribute value `var(--color-string-red)` — tests CSS implementation, not visual behavior |
| `RedString.test.tsx:41` | "has rounded stroke caps" | Asserts `stroke-linecap` is `round` — pure implementation detail |
| `CaseFileStamp.test.tsx:43` | "is non-interactive" | Asserts `className` contains `pointer-events-none` and `select-none` — CSS class implementation |

### Category 4: Assertion Density — 10 Worst Offenders

| # | File | Tests | Meaningful Assertions | Ratio | Worst Example |
|---|------|-------|-----------------------|-------|---------------|
| 1 | `LoadingScreen.test.tsx` | 6 | 6 | **1.0** | 4 of 6 tests have single `toBeInTheDocument()` |
| 2 | `RedString.test.tsx` | 7 | 7 | **1.0** | Each test has exactly one attribute assertion |
| 3 | `cn.test.ts` | 9 | 9 | **1.0** | Pure input/output, acceptable for utility |
| 4 | `api-validation-deep.test.ts` | 17 | 17 | **1.0** | Single `toThrow()` per test — acceptable for validation |
| 5 | `blocklist-deep.test.ts` | 20 | 21 | **1.05** | Most tests assert single boolean |
| 6 | `Corkboard.test.tsx` | 8 | 9 | **1.1** | "does not flip cards during reveal" has zero assertions |
| 7 | `api.test.ts` | 9 | 11 | **1.2** | Some tests only check `toThrow` message fragment |
| 8 | `PolaroidCard.test.tsx` | 9 | 11 | **1.2** | "shows push pin element" checks polaroid-front, not pin |
| 9 | `LandingScreen.test.tsx` | 11 | 13 | **1.2** | Adequate but thin on multi-assertion behavioral checks |
| 10 | `ErrorScreen.test.tsx` | 4 | 5 | **1.25** | "displays an error message" checks length > 0 only |

**Note**: For pure input/output functions (`cn`, `isBlocked`, `validateChainResponse`), a 1.0 ratio is acceptable — one assertion per case is structurally correct. The concern is with component tests where a single `toBeInTheDocument()` rarely proves correctness.

---

## 3. Test Intent vs. Name Mismatches

| File | Test Name | Claims to Test | Actually Tests | Risk |
|------|-----------|---------------|----------------|------|
| `smoke.test.tsx:84` | "example chips are present **and clickable**" | Presence + click behavior | Only checks `chips.length >= 4` — never clicks anything | **Medium** — name gives false confidence about interactivity |
| `Corkboard.test.tsx:118` | "does not flip cards during reveal" | Click is ignored during reveal | Clicks a card, makes zero assertions | **High** — test always passes regardless of whether clicking during reveal works |
| `CaseFileStamp.test.tsx:70` | "defaults delay to 0 when not provided" | Default delay behavior | Only `expect(container).toBeTruthy()` | **Medium** — the delay prop's effect is never verified |
| `PolaroidCard.test.tsx:118` | "shows push pin element" | Push pin renders | Checks `polaroid-front` testid exists (the entire front face, not the pin) | **Low** — assertion is in the right neighborhood but imprecise |
| `api-generate.test.ts:67` | "throws ApiError with fallback message when error body is not JSON" | Error path behavior | Uses `try/catch` without `expect.assertions()` — if the `catch` never fires, test passes with zero assertions | **High** — silent pass on wrong code path |

---

## 4. Boundary Coverage

### Per-Module Rating

| Module | Numeric | String | Collection | Date/Time | Reference | Overall |
|--------|---------|--------|------------|-----------|-----------|---------|
| `blocklist.ts` | N/A | **Thorough** (empty, whitespace, max, unicode, emoji) | N/A | N/A | N/A | **Thorough** |
| `api.ts` (validate) | ✓ numeric types rejected | ✓ empty strings | ✓ wrong counts (0, 6, 7, 8) | N/A | N/A | **Thorough** |
| `api.ts` (generate) | N/A | Partial | N/A | N/A | N/A | **Partial** — no AbortSignal test |
| `layout.ts` | **Partial** — no NaN/Infinity/negative viewport | N/A | ✓ (0, 1, 3, 5, 7, 10 counts) | N/A | N/A | **Partial** |
| `fonts.ts` | N/A | N/A | ✓ all 9 categories + unknown | N/A | N/A | **Thorough** |
| `cn.ts` | N/A | ✓ (empty, undefined, null) | ✓ (arrays, objects) | N/A | N/A | **Thorough** |
| `generate.ts` (server) | ✓ numeric/boolean/array concepts | ✓ empty, long, 50-char boundary | N/A | N/A | N/A | **Partial** — no malformed JSON body test |
| Components (all) | N/A | N/A | N/A | N/A | N/A | **Happy-path only** |

### Specific Missing Cases

- **`layout.ts`**: No test for `viewportWidth: 0`, `viewportHeight: 0`, negative dimensions, `NaN` seed, `cardCount: -1`
- **`generate.ts`**: No test for request body that isn't valid JSON at all (malformed body), no test for missing `Content-Type` header, no test for extremely large payloads (100KB+ concepts within 50-char limit doesn't apply, but what about 50 chars of 4-byte emoji?)
- **`checkInputs`**: No test for `null` or `undefined` as arguments (would crash at `.trim()`)
- **`generateConspiracy`**: No test that passes an `AbortSignal` to verify cancellation works

---

## 5. Adversarial Input Coverage

### Server Endpoint: `POST /.netlify/functions/generate`

| Category | Coverage | Missing Specifics |
|----------|----------|-------------------|
| **Malformed Structure** | **Partially covered** | ✓ wrong types (numeric, boolean, array, null) ✓ missing fields. ✗ Extra unexpected fields (e.g., `{conceptA: "x", conceptB: "y", __proto__: {...}}`) ✗ Non-JSON body (plain text POST) ✗ Extremely large payload |
| **Injection/Encoding** | **Not covered** | ✗ XSS: `<script>alert(1)</script>` as concept — flows through to board display unescaped? ✗ Null bytes: `hello\0world` ✗ Unicode RTL override ✗ Zero-width spaces between blocked letters |
| **Numeric Attacks** | N/A | No numeric user input |
| **Auth Boundary** | N/A | No auth system |

### Client Blocklist: `isBlocked()` / `checkInputs()`

| Category | Coverage | Missing Specifics |
|----------|----------|-------------------|
| **Malformed Structure** | **Partially covered** | ✓ empty, whitespace. ✗ `null`/`undefined` arguments (would throw) |
| **Injection/Encoding** | **Not covered** | ✗ Zero-width joiners between letters: `h\u200Bi\u200Bt\u200Bl\u200Be\u200Br` — **BYPASSES BLOCKLIST** ✗ Unicode confusables: Cyrillic `і` (U+0456) vs Latin `i` — `hіtler` **BYPASSES BLOCKLIST** ✗ Combining diacriticals: `ḣitler` **BYPASSES BLOCKLIST** ✗ Fullwidth characters: `ｈｉｔｌｅｒ` **BYPASSES BLOCKLIST** |

### **CRITICAL FINDING: Unicode Blocklist Bypass**

The `normalizeInput()` function handles:
- ASCII leet-speak substitutions (`@→a`, `0→o`, etc.)
- Separator characters (`.-_`)
- Case normalization

It does **NOT** handle:
1. **Zero-width characters** — `h\u200Bi\u200Bt\u200Bl\u200Be\u200Br` normalizes to `h‌i‌t‌l‌e‌r` (with invisible joiners), does not match "hitler"
2. **Unicode confusables** — Cyrillic `а` (U+0430) looks identical to Latin `a`, so `hitlеr` (Cyrillic е) bypasses
3. **Fullwidth characters** — `ｈｉｔｌｅｒ` (U+FF48 etc.) bypasses
4. **Combining marks** — `h̶i̶t̶l̶e̶r̶` bypasses

This is a **real vulnerability** in the content safety system, not a theoretical concern. No test covers it, and the production code doesn't handle it either.

---

## 6. State-Dependent & Concurrency Gaps

### App State Machine

| Entity | States Tested | States Untested | Idempotency Tested? | Worst Untested Scenario |
|--------|--------------|----------------|---------------------|------------------------|
| App screen transitions | landing→loading→board ✓, landing→loading→error ✓, error→landing ✓, AbortError silent ✓ | **board→landing (New Investigation)** at App level — only tested in Corkboard, not full App integration. **Late API resolve after navigation** — what if promise resolves after user retried? | **No** — no double-submit test, no rapid Enter-key test | User clicks "New Investigation", then a stale API response resolves and overwrites the landing screen with a board |
| Loading phase transitions | normal→slow→timeout ✓, timeout→onTimeout ✓ | **Rapid unmount** — what if component unmounts before timers fire? (cleanup is tested via `clearTimeout` in code but not in tests) | N/A | Timer fires after unmount → state update on unmounted component |
| Card flip state | flip on click ✓, blocked during reveal ✓ (no assertion) | **Toggle flip** (click same card twice) — code supports it (`prev === index ? null : index`) but no test verifies unflip | N/A | Flipped card gets stuck (un-toggle broken) |
| Board click-outside | Not tested at all | `handleBoardClick` closes flipped card when clicking outside — **zero tests** | N/A | User can't close a flipped card by clicking the board |

### Double-Submission / Idempotency

- **Double chip click**: NOT tested — clicking two different chips rapidly could create race condition
- **Double submit button click**: NOT tested — button is disabled during loading via screen transition, but the `handleSubmit` function itself doesn't debounce
- **Rapid Enter key**: NOT tested — `handleKeyDown` fires on every Enter, could trigger multiple submissions before the screen changes

### Late API Response

The app uses `AbortController`, but:
- `AbortError` is tested ✓
- The `generateConspiracy` function does NOT receive the AbortController's signal — looking at the code: `await fetch('/.netlify/functions/generate', { method: 'POST', ... })` — **the AbortController.signal is never passed to fetch**. This means `abortControllerRef.current?.abort()` does nothing. This is a **production bug**, and no test catches it because the mock doesn't enforce signal behavior.

---

## 7. Error Path Coverage

| Module | Error Paths | Tested | Untested | Consequence of Worst Uncovered |
|--------|-------------|--------|----------|-------------------------------|
| `api.ts` (validateChainResponse) | 7 (null, non-object, wrong count, missing fields ×5) | **7/7** | None | — |
| `api.ts` (generateConspiracy) | 4 (non-ok response, non-JSON error body, validation failure, network error) | **4/4** | None, but `api-generate.test.ts:67` lacks `expect.assertions()` guard | Silent test pass |
| `blocklist.ts` (checkInputs) | 4 (empty, too long, same concept, blocked) | **4/4** | None | — |
| `generate.ts` (server handler) | 8 (405, missing fields, too long, same, blocked, SDK error, invalid JSON, invalid chain) | **8/8** | None | — |
| `App.tsx` | 3 (API error, AbortError, ApiError) | **3/3** | AbortController.signal not wired to fetch (bug) | Stale responses corrupt state |
| `LoadingScreen.tsx` | 1 (timeout) | **1/1** | Timer cleanup on unmount | Memory leak / state update on unmounted component |
| `ErrorScreen.tsx` | 0 explicit | **N/A** | All 3 error styles not individually verified | Wrong style variant never caught |
| `layout.ts` | 1 (single card edge) | **1/1** | NaN/Infinity inputs not tested | Layout produces NaN positions → blank board |

**Overall Error Path Coverage: ~95%** — excellent for the paths that exist, but the missing AbortController wiring is a significant gap that slipped through because mocks don't enforce signal behavior.

---

## 8. Priority Remediation List

| # | Priority | Category | What to Fix | Estimated Effort |
|---|----------|----------|-------------|-----------------|
| 1 | **CRITICAL** | Production Bug | `App.tsx:27` — `AbortController.signal` is created but **never passed to `fetch()`** in `generateConspiracy()`. Add `signal` parameter to `generateConspiracy` and pass through to `fetch()`. Write test that verifies fetch receives the signal. | 30 min |
| 2 | **HIGH** | Adversarial | Add Unicode normalization to `normalizeInput()` in both `blocklist.ts` and `generate.ts` — strip zero-width characters, normalize Unicode confusables (NFC/NFKD), strip combining marks. Write tests for each bypass vector. | 2 hours |
| 3 | **HIGH** | Assertion Quality | `Corkboard.test.tsx:118` — "does not flip cards during reveal" has zero assertions. Add: verify the card's transform style is still `rotateY(0deg)` after clicking, or verify `flippedIndex` state didn't change. | 15 min |
| 4 | **HIGH** | Missing Test | `api-generate.test.ts:67` — add `expect.assertions(3)` to the try/catch test to prevent silent passes. | 5 min |
| 5 | **MEDIUM** | State Gap | Add test for `handleBoardClick` (click outside cards closes flipped card). This is untested user interaction. | 20 min |
| 6 | **MEDIUM** | State Gap | Add test for card toggle-unflip (click same card twice returns to front). | 15 min |
| 7 | **MEDIUM** | State Gap | Add App-level integration test for "New Investigation" flow: board→landing with boardData cleared, then new submission. | 30 min |
| 8 | **MEDIUM** | Adversarial | Add test for XSS payload in concept inputs: `<script>alert(1)</script>`. React auto-escapes JSX, but verify the concept text flows through `textContent` not `innerHTML`. | 15 min |
| 9 | **LOW** | Boundary | Add `calculateCardPositions` tests for degenerate inputs: `viewportWidth: 0`, `NaN` seed, negative `cardCount`. | 20 min |
| 10 | **LOW** | Test Name | Rename `smoke.test.tsx:84` from "present and clickable" to "present in sufficient quantity" or add click test. | 5 min |
| 11 | **LOW** | Tautological | Delete `generate-contract.test.ts:94-113` "System prompt contract" describe block — it asserts properties of a hardcoded fixture, providing zero regression value. | 5 min |
| 12 | **LOW** | Missing Test | Add server handler test for non-JSON request body (plain text POST). | 15 min |
| 13 | **LOW** | State Gap | Add test for `ErrorScreen` rendering all 3 style variants (`redacted`, `flickering`, `classified`). Currently relies on `Math.random()` — mock it for deterministic testing. | 20 min |
