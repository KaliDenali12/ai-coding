# Codebase Cleanup Report — Run 01

**Date**: 2026-03-10 16:23 (local)
**Branch**: `codebase-cleanup-2026-03-10`
**Baseline**: 272 tests passing, 0 lint errors

---

## 1. Summary

| Metric | Value |
|--------|-------|
| Total files modified | 8 |
| Lines of code removed (net) | ~99 lines |
| Unused dependencies removed | 2 (`clsx`, `tailwind-merge`) |
| Orphaned files removed | 2 (`cn.ts`, `cn.test.ts`) |
| Dead types removed | 1 (`GenerateError`) |
| Dead CSS removed | 1 keyframe + 1 class + 2 color variables |
| Number of commits | 3 |
| Tests affected | 9 removed (cn.test.ts), 1 updated (smoke.test.tsx). Final: 263 passing. |
| Lint status | Clean (0 errors, 0 warnings) |

---

## 2. Dead Code Removed

### Files Removed

| File | Reason | Confidence |
|------|--------|------------|
| `src/lib/cn.ts` | Utility wrapping `clsx` + `tailwind-merge`. Never imported by any component. Only imported by its own test. | 100% — no production references anywhere |
| `src/lib/__tests__/cn.test.ts` | Tests for removed `cn.ts` | 100% |

### Dependencies Removed

| Package | Type | Reason |
|---------|------|--------|
| `clsx` (^2.1.0) | production | Only used by removed `cn.ts` |
| `tailwind-merge` (^3.0.0) | production | Only used by removed `cn.ts` |

### Dead Types

| Type | File | Reason |
|------|------|--------|
| `GenerateError` | `src/types/conspiracy.ts` | Exported interface never imported anywhere in codebase |

### Dead CSS

| Item | File | Reason |
|------|------|--------|
| `@keyframes draw-string` | `src/index.css` | Keyframe animation defined but never triggered. `RedString` component uses inline JavaScript for stroke-dash animation. |
| `.animate-draw-string` | `src/index.css` | CSS class referencing `draw-string` keyframe. Never used in any component. |
| `--color-cork-dark` | `src/index.css` @theme | CSS variable `#8b6f47` defined but never referenced by any Tailwind class or component. Raw hex values used in `.cork-bg` gradients instead. |
| `--color-cork-light` | `src/index.css` @theme | CSS variable `#d4b896` defined but never referenced. Same as above. |

### Smoke Test Updated

- Removed `cn` module check from `src/__tests__/smoke.test.tsx` (line 109-110) since the module no longer exists.

### Not Removed (Flagged for Awareness)

| Item | File | Reason for keeping |
|------|------|--------------------|
| `getFontFamily()` | `src/lib/fonts.ts` | Not used by any component (only `getFontClass()` is used), but actively tested in `fonts-deep.test.ts` and `smoke.test.tsx`. Part of the font module's API surface. Removing would break 6+ tests. |
| `FONT_MAP` | `src/lib/fonts.ts` | Same as above — tested directly but not used in production components. |

---

## 3. Duplication Reduction

### Documented (Not Changed — By Design)

| Duplication | Location 1 | Location 2 | Rationale |
|------------|------------|------------|-----------|
| Blocklist logic (BLOCKED_TERMS, SUBSTITUTIONS, CONFUSABLES, normalizeInput, isBlocked) | `src/lib/blocklist.ts` | `netlify/functions/generate.ts` | Defense-in-depth content safety. Documented in CLAUDE.md. Server can't import from `src/`. |
| FONT_CATEGORIES array | `src/types/conspiracy.ts` | `netlify/functions/generate.ts` | Server function can't import from `src/`. Separate copy needed. |
| Response validation | `validateChainResponse()` in `src/lib/api.ts` | `validateResponse()` in `netlify/functions/generate.ts` | Client validates API response; server validates Claude output. Different contexts, slightly different implementations. |

### Assessment

No actionable duplication found beyond the intentional blocklist duplication. The codebase is small enough (~20 source files) that the three documented duplications are the correct architectural trade-off for a client/server split with no shared package.

---

## 4. Consistency Changes

### Import Ordering

**Finding**: Already consistent across all files. Pattern: external deps → aliased imports (`@/`) → relative imports → types. No changes needed.

### Naming Conventions

**Finding**: Fully consistent.
- Components: PascalCase (all 7 components)
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase
- CSS classes: kebab-case
- Data attributes: `data-testid` with kebab-case values

### Error Handling

**Finding**: Consistent patterns:
- Custom `ApiError` class for HTTP errors (client)
- `throw new Error()` for validation failures (both client and server)
- Try-catch wrapper in server handler with status code mapping
- Silent `AbortError` handling in App.tsx
- No mixed callbacks/promises — all async/await

### String Quotes

**Finding**: Single quotes throughout. Consistent.

### No changes were needed in this phase.

---

## 5. Configuration & Feature Flags

### Feature Flags

**No feature flags found.** The codebase has no feature flags, LaunchDarkly references, environment-based toggles, or hardcoded boolean switches. All behavior is fixed.

### Flag Coupling

N/A — no flags exist.

### Configuration Sprawl

| Config | Location | Issue | Action |
|--------|----------|-------|--------|
| `ANTHROPIC_API_KEY` | Netlify env / `.env` | Documented, only config value | None needed |
| 7 timing constants | `src/lib/constants.ts` | Well-organized, single source of truth | None needed |
| `max_tokens: 4000` | `netlify/functions/generate.ts:221` | Hardcoded in API call | None — appropriate for single-endpoint app |
| `model: 'claude-sonnet-4-20250514'` | `netlify/functions/generate.ts:220` | Hardcoded model identifier | None — appropriate for single-endpoint app |
| Content-Length limit `10_000` | `netlify/functions/generate.ts:173` | Hardcoded request size limit | None — appropriate |

**Assessment**: Configuration is minimal and well-organized. No sprawl, no duplication, no missing defaults.

### Default Value Audit

| Config | Default | Concern | Recommendation |
|--------|---------|---------|----------------|
| All timing constants | Various (800ms, 1500ms, etc.) | None — appropriate for animation timing | None |
| `max_tokens: 4000` | N/A (set explicitly) | None — reasonable for 7-node chain generation | None |
| `seed` parameter in `calculateCardPositions` | `42` | None — only used as fallback, real seed comes from case file number | None |

No default value concerns found.

### TODO/FIXME/HACK Inventory

| File | Line | Comment | Category | Priority | Recommendation |
|------|------|---------|----------|----------|----------------|
| (none) | — | No TODO/FIXME/HACK/XXX/TEMP comments found in production code | — | — | — |

The only "XXX" occurrence is in the system prompt example (`CASE FILE #XXXX-X`) which is literal prompt text, not a code marker.

---

## 6. Couldn't Touch

| Item | Reason |
|------|--------|
| `getFontFamily()` / `FONT_MAP` exports | Not used in production code but actively tested. Removing would break tests. These are part of the font module's API and could be useful if inline font-family styles are ever preferred over Tailwind classes. |
| Blocklist duplication | Intentional defense-in-depth. Documented as architectural decision. |
| Validation logic duplication | Client and server validate in different contexts with slightly different implementations. Merging would require a shared package. |
| Known Bugs section in CLAUDE.md | Both bugs are marked as fixed with strikethrough. Kept for historical context. |

---

## 7. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---|---|---|---|---|
| 1 | Consider removing `FONT_MAP` and `getFontFamily` | Reduces API surface to what's actually used | Low | Only if time allows | These exports provide an alternative font application approach (inline styles vs Tailwind classes). Currently unused in production but tested. If the team confirms they'll only use the class-based approach, remove these and update tests. |
| 2 | Use CSS variables in `.cork-bg` gradients | Consistency between `@theme` definitions and usage | Low | Only if time allows | The `.cork-bg` class uses hardcoded `rgba()` values that happen to match the removed `--color-cork-dark` and `--color-cork-light` variables. If those colors need to change, developers would need to update both the `@theme` block and the `.cork-bg` gradient values separately. Consider using `var()` references if the cork colors are reinstated. |
| 3 | Move `@anthropic-ai/sdk` to devDependencies | Cleaner dependency categorization | Low | Probably not | The SDK is only used in `netlify/functions/generate.ts`. However, Netlify Functions may require runtime deps in `dependencies` depending on bundling behavior. Safer to leave as-is. |

---

## Quick Wins Applied

No additional quick wins were identified beyond the dead code removal. The codebase is remarkably clean:
- No deprecated API usage found
- No `var` declarations (all `const`/`let`)
- No unnecessary type assertions
- No overly complex conditionals
- No empty files or no-op overrides
- No typos detected in variable names or comments
- All files serve a purpose

---

## CLAUDE.md Updates

Updated CLAUDE.md to reflect changes:
- Removed `cn.ts` from project structure listing
- Removed "CSS Utility" row from tech stack table
- Removed "cn() utility unused" pitfall entry
- Updated test count from "272+" to "263+"
