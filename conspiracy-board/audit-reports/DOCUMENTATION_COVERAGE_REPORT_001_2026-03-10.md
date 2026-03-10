# Documentation Coverage Report #001

**Date**: 2026-03-10
**Scope**: Full documentation generation pass — three-tier system
**Branch**: `documentation-2026-03-10`
**Tests**: 120/120 passing (no changes to code)

---

## Executive Summary

Rebuilt the project's documentation system from a single 310-line CLAUDE.md into a three-tier architecture optimized for AI agent token efficiency. The previous CLAUDE.md contained accurate information but was bloated with Tier 2 detail (TypeScript interfaces, full font category tables, spacing tables) and had several stale references to files that were never created.

---

## Phase 0: Existing Standards Check

**Finding**: Existing CLAUDE.md (310 lines) already had a Documentation Hierarchy section and was structured for AI consumption. No conflicts with three-tier approach — only optimization needed.

**Issues found in existing CLAUDE.md**:
1. Referenced `RevealSequence.tsx` — never created (absorbed into Corkboard.tsx)
2. Referenced `SoundToggle.tsx` — never created (P2 feature)
3. Referenced `src/components/ui/` — no Shadcn/UI components exist
4. Referenced `src/lib/sound.ts` — never created
5. Referenced `tailwind.config.ts` — doesn't exist (Tailwind v4 uses `@theme` in CSS)
6. Referenced `public/` directory — doesn't exist (cork texture is CSS-only)
7. Tech stack listed Vitest as "TODO" — it has 120 tests across 13 files
8. Listed Shadcn/UI in stack — no Shadcn components exist

---

## Phase 1: Codebase Discovery

### Architecture Summary
- **13 source files** (7 components, 5 lib modules, 1 type file)
- **1 serverless function** (Claude API proxy)
- **13 test files** with 120 tests total
- **4-state machine**: landing → loading → board | error
- **Single data flow**: client → POST → Netlify Function → Claude API → validate → render

### Key Patterns Identified
1. **Blocklist duplication**: Client (`src/lib/blocklist.ts`) and server (`netlify/functions/generate.ts`) maintain separate copies of blocked terms and normalization logic
2. **FONT_CATEGORIES duplication**: Defined in both `src/types/conspiracy.ts` and `netlify/functions/generate.ts`
3. **Import extensions required**: `verbatimModuleSyntax: true` means all imports need `.ts`/`.tsx`
4. **Seeded random**: Layout positions are deterministic per case file number hash
5. **No shared code between client and server**: Netlify Functions don't share code with `src/`

### Pitfalls Documented
- Tailwind v4 uses `@theme` blocks, not config files
- No `public/` directory exists despite PRD references
- Font loading is in `index.html` `<link>` tag, not dynamic
- Animation timing constants are interconnected (changing one affects total sequence)
- Card dimensions hardcoded in Corkboard.tsx

---

## Phase 2: CLAUDE.md (Tier 1) — 246 Lines

**Before**: 310 lines containing TypeScript interfaces, detailed font category tables, references to non-existent files

**After**: 246 lines of accurate, terse, imperative documentation

### Changes from Previous Version
| Change | Rationale |
|--------|-----------|
| Removed TypeScript interfaces | Moved to Tier 2 (api-and-data.md) |
| Removed dynamic font category table | Moved to Tier 2 (design-system.md) |
| Fixed project structure tree | Removed 6 non-existent files/dirs |
| Added version numbers to tech stack | Prevents version confusion |
| Added Key Pitfalls section | Prevents common mistakes across tasks |
| Added App State Machine diagram | Cross-cutting architectural knowledge |
| Updated test count | 120, not "TODO" |
| Removed Shadcn/UI references | Not used in actual codebase |
| Added spacing/padding tables | Prevents UI inconsistency |
| Added two-palette note | Critical for any UI work |

### Token Budget
| Metric | Value |
|--------|-------|
| Lines | 246 |
| Est. tokens | ~8K |
| % of 200K context | ~4% |

---

## Phase 3: Tier 2 Memory Files — 6 Files Created

| File | Lines | Coverage |
|------|-------|----------|
| `animation-system.md` | 68 | Reveal sequence timing, CSS 3D flip, SVG stroke-dash, CLASSIFIED stamp, Framer Motion patterns |
| `design-system.md` | 69 | Color tokens, font stack (12 fonts), cork texture CSS, Polaroid anatomy, responsive breakpoints, CSS classes |
| `testing.md` | 71 | Vitest config, mocking patterns (Framer Motion, SVG, API, timers), test data, assertion style, full test ID table |
| `content-safety.md` | 63 | 3-layer safety system, blocked categories, blocklist sync process, validation flow diagram |
| `api-and-data.md` | 72 | Endpoint spec, request/response formats, error codes, client/server validation, Anthropic SDK usage, pitfalls |
| `feature-inventory.md` | 77 | Component-by-component feature details, shared utilities, not-implemented items with context |

**Total Tier 2**: ~420 lines across 6 files (~1-2% per task when 1-2 files loaded)

---

## Phase 4: MEMORY.md — 38 Lines

Updated index with:
- Corrected test count (120, not 126)
- Added all 6 topic file references with load triggers
- Updated key technical decisions
- Noted Shadcn/UI non-usage and blocklist duplication

---

## Phase 5: Version Control

- Created branch: `documentation-2026-03-10`
- All 120 tests passing (no code changes)
- `.gitignore` already handles `.claude/*` except `.claude/memory/`

---

## Issues Found During Audit

### CRITICAL
None.

### HIGH
1. **Blocklist duplication**: Client and server maintain separate copies of `BLOCKED_TERMS` and `normalizeInput()`. If one is updated without the other, safety bypass is possible.
2. **FONT_CATEGORIES duplication**: `src/types/conspiracy.ts` and `netlify/functions/generate.ts` each define the list independently. Schema drift risk.

### MEDIUM
3. **No server-side blocklist tests**: `netlify/functions/__tests__/generate.test.ts` validates response structure but doesn't test blocklist enforcement.
4. **Claude markdown wrapping**: If Claude wraps JSON in markdown fences, `JSON.parse()` will fail. No stripping logic exists.
5. **No rate limiting**: Single endpoint with no rate limiting or abuse prevention.

### LOW
6. **Missing `public/` assets**: PRD mentions cork-texture.jpg but CSS gradients are used instead. Not a bug, but PRD/docs were stale.
7. **Test count discrepancy**: Previous MEMORY.md said 120 tests, but actual count at subagent time showed 126 in test analysis (likely counting nested `it` blocks differently). Verified with `vitest run`: 120 tests.

---

## Token Budget Summary

| Tier | Files | Lines | Est. Tokens | % of 200K |
|------|-------|-------|-------------|-----------|
| Tier 1 (CLAUDE.md) | 1 | 246 | ~8K | ~4% |
| Tier 1 (MEMORY.md) | 1 | 38 | ~1.2K | ~0.6% |
| Tier 2 (per task, 1-2 files) | 1-2 of 6 | 63-77 ea | ~2-5K | ~1-2.5% |
| **Typical total** | **3-4** | **347-361** | **~11-14K** | **~5.5-7%** |

Target was 6-9%. Achieved 5.5-7%. Within budget.
