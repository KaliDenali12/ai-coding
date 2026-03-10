# File Decomposition & Module Structure Report

**Report #12 | Run 01 | 2026-03-10 18:35**
**Branch**: `file-decomposition-2026-03-10`
**Status**: No splits needed — all files are already well-decomposed.

---

## 1. Executive Summary

Scanned 18 source files across `src/` and `netlify/` (excluding test files, config files, node_modules, and dist). **No file exceeds the 300-line conservative threshold**. The largest source file is `netlify/functions/generate.ts` at 269 lines. The codebase is already well-structured with clear single-responsibility modules.

- **Files analyzed**: 18 source files
- **Files over 300 lines**: 0
- **Files split**: 0
- **Tests**: 263 passing (22 test files)

---

## 2. File Size Inventory

### Source Files (sorted by line count)

| # | File | Lines | Primary Responsibility | Exports | Importers |
|---|------|-------|----------------------|---------|-----------|
| 1 | `netlify/functions/generate.ts` | 269 | Claude API proxy — validation, prompt, API call, response parsing | 1 (handler) | Test files only |
| 2 | `src/components/Corkboard.tsx` | 197 | Board container, layout, reveal orchestration | 1 (Corkboard) | App.tsx |
| 3 | `src/components/LandingScreen.tsx` | 164 | Input form, validation, example chips | 1 (LandingScreen) | App.tsx |
| 4 | `src/components/PolaroidCard.tsx` | 138 | Card with 3D flip animation | 1 (PolaroidCard) | Corkboard.tsx |
| 5 | `src/components/LoadingScreen.tsx` | 129 | Loading animation, redacted lines, timeout | 1 (LoadingScreen) | App.tsx |
| 6 | `src/lib/blocklist.ts` | 107 | Input normalization + blocked term checking | 2 (normalizeInput, checkBlockedInput) | LandingScreen, generate.ts |
| 7 | `src/lib/layout.ts` | 94 | Card positioning with seeded random | 2 (calculateCardPositions, seededRandom) | Corkboard.tsx |
| 8 | `src/App.tsx` | 90 | Root state machine (landing → loading → board \| error) | 1 (App) | main.tsx |
| 9 | `src/index.css` | 87 | Tailwind @theme, custom CSS classes | N/A (CSS) | N/A |
| 10 | `src/components/ErrorScreen.tsx` | 84 | Themed error display with retry | 1 (ErrorScreen) | App.tsx |
| 11 | `src/lib/api.ts` | 79 | Client fetch + response validation | 1 (generateConspiracy) | App.tsx |
| 12 | `src/lib/constants.ts` | 59 | Example pairs, loading messages, timing values | ~10 constants | Multiple |
| 13 | `src/components/RedString.tsx` | 53 | SVG path with stroke-dash animation | 1 (RedString) | Corkboard.tsx |
| 14 | `src/lib/fonts.ts` | 33 | FontCategory → CSS font-family mapping | 2 (FONT_MAP, FONT_CLASS_MAP) | PolaroidCard.tsx |
| 15 | `src/types/conspiracy.ts` | 32 | TypeScript types for chain, node, font | ~5 types | Multiple |
| 16 | `src/components/CaseFileStamp.tsx` | 32 | Classification stamp overlay | 1 (CaseFileStamp) | Corkboard.tsx |
| 17 | `src/main.tsx` | 10 | Entry point (StrictMode) | 0 | N/A |
| 18 | `src/test/setup.ts` | 1 | Test setup | 0 | vitest config |

### Test Files (excluded from splitting per rules)

| File | Lines |
|------|-------|
| `netlify/functions/__tests__/generate-contract.test.ts` | 562 |
| `src/__tests__/App-integration-deep.test.tsx` | 289 |
| `src/lib/__tests__/layout-deep.test.ts` | 212 |
| `src/__tests__/App.test.tsx` | 193 |
| `src/lib/__tests__/api-validation-deep.test.ts` | 168 |
| `src/lib/__tests__/blocklist-deep.test.ts` | 157 |
| `src/components/__tests__/PolaroidCard.test.tsx` | 145 |
| `src/components/__tests__/LandingScreen.test.tsx` | 138 |
| `src/components/__tests__/Corkboard.test.tsx` | 133 |
| Other test files (12 more) | 30–120 each |

---

## 3. Splits Executed

None. No files met the 300-line threshold for splitting.

---

## 4. Splits Attempted but Reverted

None.

---

## 5. Files Analyzed but Not Split

### `netlify/functions/generate.ts` (269 lines) — Closest to threshold

**Classification**: Single responsibility, just long.

This file handles the full serverless function lifecycle: input validation, blocklist checking, system prompt construction, Claude API call, and response validation. While it contains multiple logical sections, they form a single pipeline that processes linearly. Splitting into separate files (e.g., `validation.ts`, `prompt.ts`, `response-parser.ts`) would:

1. Create 3+ tiny files (60-80 lines each) with tight coupling between them
2. Complicate the blocklist duplication pattern (currently self-contained)
3. Add import overhead with no readability gain — the file reads top-to-bottom as a pipeline
4. Risk breaking test mocks in `generate-contract.test.ts` (562 lines of carefully constructed mocks)

**Decision**: Do not split. At 269 lines it's well under the 300-line threshold and the pipeline structure is inherently sequential.

### `src/components/Corkboard.tsx` (197 lines) — Second largest

**Classification**: Single responsibility. Contains layout logic, card rendering, string rendering, and reveal orchestration for the board view. All tightly coupled to the same render cycle. No benefit from splitting.

### All other files (164 lines and below)

Already appropriately sized with clear single responsibilities.

---

## 6. Structural Observations (Documentation Only)

### Directory Structure
The project follows a clean pattern:
- `src/components/` — React components (one per file)
- `src/lib/` — Utilities and business logic
- `src/types/` — TypeScript types
- `netlify/functions/` — Serverless functions

This structure is appropriate for the project size (18 source files). No reorganization needed.

### Barrel Files
The project does **not** use barrel files (`index.ts` re-exports). Given the small number of files and direct import style, this is correct. Adding barrel files would add complexity without benefit.

### Shared Module Opportunities
None identified. The `src/lib/` directory already serves as the shared utility layer. The intentional blocklist duplication between client and server is documented and by design.

---

## 7. File Size Distribution

| Range | Count | Files |
|-------|-------|-------|
| 0–100 lines | 12 | main.tsx, setup.ts, CaseFileStamp.tsx, fonts.ts, conspiracy.ts, RedString.tsx, constants.ts, api.ts, ErrorScreen.tsx, index.css, App.tsx, layout.ts |
| 100–200 lines | 5 | blocklist.ts, LoadingScreen.tsx, PolaroidCard.tsx, LandingScreen.tsx, Corkboard.tsx |
| 200–300 lines | 1 | generate.ts |
| 300–500 lines | 0 | — |
| 500+ lines | 0 | — |

**Average file size**: 91 lines
**Median file size**: 84 lines
**Largest file**: 269 lines (`generate.ts`)

---

## 8. Recommendations

No file decomposition is warranted at this time. The codebase is already well-structured with appropriately sized, single-responsibility modules.

| # | Observation | Assessment |
|---|-------------|------------|
| 1 | Largest file (generate.ts) is 269 lines | Healthy — sequential pipeline, splitting would over-engineer |
| 2 | Average file size is 91 lines | Excellent — well within maintainability norms |
| 3 | No file exceeds 300 lines | No action needed per conservative threshold |
| 4 | Test file generate-contract.test.ts is 562 lines | Expected for comprehensive contract tests — excluded by rules |

---

## 9. Conclusion

This codebase demonstrates strong modular design. Each file has a clear, single responsibility. The component-per-file pattern in `src/components/` and the utility separation in `src/lib/` follow React best practices. No decomposition work is needed at this time.
