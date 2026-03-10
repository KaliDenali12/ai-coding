# Architectural Complexity Audit Report

**Report**: 14_ARCHITECTURAL_COMPLEXITY_REPORT_01
**Date**: 2026-03-10 21:00
**Codebase**: conspiracy-board
**Source files analyzed**: 17 (1,552 lines total, excluding tests and config)
**Audit type**: READ-ONLY analysis

---

## 1. Executive Summary

**Overall complexity assessment: LEAN**

This is a remarkably well-structured codebase for its scope. With 17 source files, zero circular dependencies, a maximum dependency chain depth of 5, and no unnecessary abstraction layers, the architecture matches the problem's actual complexity. The single biggest "complexity tax" is the intentional blocklist duplication across client and server — which is a justified security design decision, not accidental complexity.

**Top 3 findings:**

1. **Duplicated validation logic** — `validateChainResponse()` (client, `api.ts`) and `validateResponse()` (server, `generate.ts`) perform near-identical 7-item chain validation with slightly different error messages and type definitions. This is the only real architectural redundancy beyond the documented blocklist duplication.

2. **Dual type definitions for chain data** — The server (`generate.ts`) defines its own `ChainNode` and `ChainResponse` interfaces (lines 125-137) that mirror the client's `ConspiracyNode` and `ConspiracyChain` types in `conspiracy.ts`. These are structurally identical but can't diverge because JSON flows between them.

3. **`useCallback` wrapping pure computations** — `getCardDelay` and `getStringDelay` in `Corkboard.tsx` (lines 66-82) are wrapped in `useCallback` with empty dependency arrays, but they're pure arithmetic functions that would be better as plain functions. Zero performance benefit from memoization here.

**Verdict**: There is very little to simplify. This codebase was built with discipline and has not accumulated organic complexity. Most "findings" below are minor or accepted.

---

## 2. Structural Complexity Map

### 2.1 Dependency Graph Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Total source files | 17 | Compact |
| Hub modules (3+ importers) | 2 (`constants.ts`: 4 components, `conspiracy.ts`: 4 files) | Healthy |
| Maximum dependency chain | 5 hops (`main → App → Corkboard → PolaroidCard → fonts`) | Shallow |
| Circular dependencies | 0 | Clean |
| Orphaned modules | 0 (all files are reachable from entry point or are HTTP endpoints) | Clean |

**Hub modules are genuine shared utilities**, not junk drawers:
- `constants.ts` (59 lines): timing values, message arrays, example data — all appropriately shared
- `conspiracy.ts` (32 lines): core data types — the canonical source of truth

**No file is a junk drawer.** The largest file is `generate.ts` at 250 lines, which handles the complete serverless function lifecycle (blocklist + validation + Claude API + response). This was evaluated in the File Decomposition audit (report #12) and determined to not need splitting.

### 2.2 Layer Analysis per Operation

| Operation | Files Touched | Meaningful Layers | Indirection Ratio | Glue Code (lines) |
|-----------|:------------:|:-----------------:|:-----------------:|:-----------------:|
| Submit concepts | 4 (Landing → App → api → blocklist) | 4 | **1.0** | 0 |
| Backend generation | 1 (generate.ts) | 1 | **1.0** | 0 |
| Board rendering | 4 (App → Corkboard → layout + constants) | 4 | **1.0** | 0 |
| Card flip | 2 (Corkboard → PolaroidCard) | 2 | **1.0** | 0 |
| String animation | 2 (Corkboard → RedString) | 2 | **1.0** | 0 |
| Error handling | 3 (App → LoadingScreen → ErrorScreen) | 3 | **1.0** | 0 |
| Input validation | 2 (LandingScreen → blocklist) | 2 | **1.0** | 0 |
| New investigation | 2 (Corkboard → App) | 2 | **1.0** | 0 |

**Every operation has an indirection ratio of 1.0** — every file in every call chain does meaningful work. There are zero forwarding layers, zero pass-through functions, and zero glue code lines.

### 2.3 Abstraction Inventory

| Abstraction | Type | Location | Implementations | Justification | Verdict |
|-------------|------|----------|:--------------:|---------------|---------|
| `ApiError` class | Error subclass | `api.ts:4-12` | 1 throw, 1 catch | Type-safe HTTP error with status code | **Accept** — 9 lines, enables `instanceof` check |
| `LayoutConfig` interface | Parameter object | `layout.ts:7-14` | 1 usage | Keeps `calculateCardPositions()` signature clean | **Accept** — improves readability, enables testing |
| `CardPosition` interface | Data shape | `layout.ts:1-5` | Used in Corkboard | Return type for layout calculations | **Accept** — essential for type safety |
| `ChainNode` / `ChainResponse` | Server-side types | `generate.ts:125-137` | 1 validation fn | Mirrors client types but in isolated serverless context | **Minor issue** — see Finding F-001 |
| `FONT_MAP` + `FONT_CLASS_MAP` | Dual record maps | `fonts.ts:3-25` | 1 each via getter fns | Separate CSS font-family from Tailwind class name | **Accept** — Tailwind v4 architectural constraint |
| `getFontFamily()` / `getFontClass()` | Getter with fallback | `fonts.ts:27-33` | 1 call site each | Provides fallback to `chaotic` category | **Accept** — 3 lines each, adds safety |
| `jsonResponse()` helper | Response factory | `generate.ts:117-122` | 6 call sites | Reduces `new Response()` + headers boilerplate | **Accept** — classic DRY extraction |
| `seededRandom()` | PRNG closure | `layout.ts:17-23` | 1 call site | Enables deterministic layouts per board | **Accept** — essential for feature (same input = same layout) |
| `normalizeInput()` | Normalization pipeline | `blocklist.ts:51-70` + `generate.ts:38-54` | 2 (identical copies) | Unicode normalization for blocklist bypass prevention | **Accept** — intentional security duplication |

**Abstraction tax**: 0 unnecessary abstractions found. Every abstraction serves a concrete purpose.

### 2.4 Directory Structure Assessment

```
conspiracy-board/
├── src/
│   ├── components/    7 files — one per visual component ✓
│   ├── lib/           5 files — one per concern (api, blocklist, constants, fonts, layout) ✓
│   ├── types/         1 file — central type definitions ✓
│   └── __tests__/     Integration/smoke tests ✓
├── netlify/functions/  1 file — single serverless endpoint ✓
```

**Assessment: Excellent.** Directory structure perfectly mirrors actual architecture:
- No catch-all `utils/` or `helpers/` directories
- No empty wrapper directories or excessive nesting
- Components are co-located by role, not by technical layer
- Tests are co-located in `__tests__/` subdirectories next to their source
- Maximum nesting depth: 3 levels (`src/components/__tests__/`) — matches actual architecture depth

---

## 3. Data Flow Complexity

### 3.1 Transformation Chains

**Core data type: `ConspiracyChain`** (the only domain object)

```
User Input (2 strings)
  → LandingScreen: trim + validate
  → App: wrap in { conceptA, conceptB }
  → api.ts: serialize to JSON
  ─── HTTP boundary ───
  → generate.ts: parse JSON, validate, trim
  → Claude API: prompt → raw text response
  → generate.ts: JSON.parse → validateResponse() → typed ChainResponse
  ─── HTTP boundary ───
  → api.ts: JSON.parse → validateChainResponse() → typed ConspiracyChain
  → App: store in state
  → Corkboard: read chain array
  → PolaroidCard: read individual node
```

**Transformations: 4 meaningful reshapes**
1. User strings → `GenerateRequest` (trivial shape change) ✓
2. Claude raw text → `ChainResponse` (JSON parse + validation) ✓
3. HTTP JSON → `ConspiracyChain` (JSON parse + validation) ✓
4. Chain array → individual card props (array indexing) ✓

**All 4 transformations do meaningful work.** No gratuitous reshaping, no field-renaming layers, no DTO-to-domain mapping ceremonies. Data flows from input to display with the minimum number of transformations required by the HTTP boundary.

**Finding F-001: Duplicated validation across HTTP boundary**

`validateChainResponse()` in `api.ts` (lines 14-56, 43 lines) and `validateResponse()` in `generate.ts` (lines 139-168, 30 lines) perform structurally identical validation:
- Both check chain length === 7
- Both check `case_file_number` and `classification_level` are non-empty strings
- Both iterate chain nodes checking all 5 required fields
- Both validate `font_category` against allowed values

The server version validates Claude's output; the client version validates the server's response. Both are necessary (defense in depth), but the logic is duplicated.

**Impact**: ~70 lines of near-identical validation code across two files.

**Recommendation**: **Accept** — this is defense-in-depth at an HTTP boundary. The client cannot trust the server (it could be a proxy, CDN, or attacker). The server cannot trust Claude's output. Both validations protect against different failure modes. Collapsing them would require a shared module importable by both frontend and serverless function, adding build complexity that exceeds the duplication cost.

### 3.2 State Management Assessment

| State | Location | Scope | Assessment |
|-------|----------|-------|------------|
| Current screen | `App.tsx` `useState` | App-wide | Single source of truth ✓ |
| Board data | `App.tsx` `useState` | App-wide | Single source of truth ✓ |
| Last inputs | `App.tsx` `useState` | App-wide | For retry UX ✓ |
| Abort controller | `App.tsx` `useRef` | App-wide | Mutable ref, appropriate ✓ |
| Flipped card | `Corkboard.tsx` `useState` | Board only | Local state ✓ |
| Reveal complete | `Corkboard.tsx` `useState` | Board only | Derived from timer ✓ |
| Viewport size | `Corkboard.tsx` `useState` | Board only | Local state ✓ |
| Input values | `LandingScreen.tsx` `useState` | Form only | Local state ✓ |
| Error message | `LandingScreen.tsx` `useState` | Form only | Local state ✓ |
| Loading phase | `LoadingScreen.tsx` `useState` | Loading only | Local state ✓ |

**Assessment: Pristine.**
- Zero state duplication
- Zero global state (no Redux, no Context, no stores)
- Every piece of state lives at the narrowest possible scope
- No derived state stored and manually synced — computed inline where needed
- No state management library — React `useState` is exactly right for this complexity level

### 3.3 Configuration Layer Map

| Layer | Mechanism | Files | What it configures |
|-------|-----------|-------|-------------------|
| Environment variables | `.env` / Netlify dashboard | 1 var: `ANTHROPIC_API_KEY` | API authentication |
| Build config | `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json` | Build tool behavior | Standard, no custom logic |
| App constants | `src/lib/constants.ts` | Timing, messages, examples | Single file, single import |
| CSS theme | `src/index.css` `@theme` block | Colors, fonts | Standard Tailwind v4 |
| Claude behavior | `SYSTEM_PROMPT` in `generate.ts` | AI output tone, format, safety | Inline string constant |

**Assessment: Minimal.** One env var, one constants file, one theme block. No config-of-config, no precedence conflicts, no runtime configuration. You can understand the entire configuration by reading 3 files.

---

## 4. Pattern Complexity

### 4.1 Premature Generalizations

**Found: None.**

No multi-tenant infrastructure, no plugin systems, no configurable pipelines, no abstract base classes, no schema versioning, no i18n wrappers, no multi-provider abstractions. The codebase was built for exactly one thing and does exactly one thing.

### 4.2 Unnecessary Indirection

**Found: One minor instance.**

**Finding F-002: `useCallback` wrapping pure arithmetic**

In `Corkboard.tsx` lines 66-82:
```tsx
const getCardDelay = useCallback(
  (index: number) => {
    const stepDuration = REVEAL_CARD_ENTRANCE_MS + REVEAL_STRING_DURATION_MS
    return index * stepDuration + REVEAL_CARD_DELAY_MS
  },
  [],
)
```

These are pure functions with no dependencies — the `useCallback` with empty deps array provides zero memoization benefit. They could be plain functions defined outside the component:

```tsx
function getCardDelay(index: number): number {
  const stepDuration = REVEAL_CARD_ENTRANCE_MS + REVEAL_STRING_DURATION_MS
  return index * stepDuration + REVEAL_CARD_DELAY_MS
}
```

**Impact**: ~10 lines of unnecessary React hook wrapping. Negligible performance and readability impact.
**Risk**: Trivial — pure arithmetic, fully tested.
**Recommendation**: **Remove** `useCallback` wrappers; extract as module-level functions.

### 4.3 Cargo-Culted Patterns

**Found: None.**

No CQRS, no DDD ceremony, no microservice patterns in a monolith, no repository wrapping an ORM, no Clean Architecture layers. The codebase uses React components, plain functions, and a serverless handler — the simplest tools appropriate for the job.

### 4.4 Organic Growth Tangles

**Found: None.**

No features bolted on that don't fit, no old-way/new-way coexistence, no temporary solutions (`grep` for TODO/FIXME/HACK/TEMPORARY returned zero results in source files). The codebase appears to have been built with a clear plan and maintained with discipline.

---

## 5. Complexity Quantification

### 5.1 Indirection Scores per Operation

| Operation | Files Touched | Meaningful Layers | Indirection Ratio | Rating |
|-----------|:------------:|:-----------------:|:-----------------:|:------:|
| Submit concepts | 4 | 4 | 1.0 | 🟢 |
| Backend generation | 1 | 1 | 1.0 | 🟢 |
| Board rendering | 4 | 4 | 1.0 | 🟢 |
| Card flip | 2 | 2 | 1.0 | 🟢 |
| String animation | 2 | 2 | 1.0 | 🟢 |
| Error handling | 3 | 3 | 1.0 | 🟢 |
| Input validation | 2 | 2 | 1.0 | 🟢 |
| New investigation | 2 | 2 | 1.0 | 🟢 |

**All operations score 1.0 (perfect).** No operation passes through a file that doesn't do meaningful work.

### 5.2 Abstraction Overhead Inventory

| Category | Count | Estimated Lines |
|----------|:-----:|:---------------:|
| Interfaces with 1 implementation | 0 | 0 |
| Factories creating 1 type | 0 | 0 |
| Wrapper classes that don't transform | 0 | 0 |
| Generic types with 1 instantiation | 0 | 0 |
| Event emissions with 1 listener | 0 | 0 |
| Config options that never vary | 0 | 0 |
| **Total abstraction tax** | **0** | **0 lines** |

**Abstraction tax: 0% of codebase.** Every abstraction mechanism in this codebase has a concrete justification.

### 5.3 Onboarding Complexity Estimate

| Area | Files to Read | Layers | Patterns to Learn | Rating |
|------|:------------:|:------:|:-----------------:|--------|
| Landing screen / input | 2 (LandingScreen, blocklist) | 2 | React forms, validation | **Simple** |
| API flow | 2 (api.ts, generate.ts) | 2 | fetch, Anthropic SDK | **Simple** |
| Board rendering | 3 (Corkboard, PolaroidCard, layout) | 2 | Framer Motion, CSS 3D | **Moderate** |
| Animation system | 4 (Corkboard, PolaroidCard, RedString, constants) | 2 | Timing orchestration, SVG stroke-dash | **Moderate** |
| Content safety | 2 (blocklist.ts, generate.ts) | 2 | Unicode normalization | **Moderate** |
| State machine | 1 (App.tsx) | 1 | useState, AnimatePresence | **Simple** |
| Styling | 1 (index.css) | 1 | Tailwind v4 @theme | **Simple** |

**"You just have to know" conventions**: 3
1. Blocklist is intentionally duplicated (documented in CLAUDE.md)
2. Import paths must include `.ts`/`.tsx` extensions (enforced by tsconfig)
3. Animation timing constants are interconnected (documented in CLAUDE.md)

All 3 are documented. No tribal knowledge exists that isn't captured in CLAUDE.md.

---

## 6. Simplification Roadmap

### Full Finding List

| # | Finding | Category | Effort | Risk | Impact | Priority |
|:-:|---------|----------|:------:|:----:|:------:|:--------:|
| F-001 | Duplicated chain validation (api.ts + generate.ts) | Accept | — | — | — | — |
| F-002 | `useCallback` wrapping pure arithmetic in Corkboard | Remove | Trivial (<1h) | Low | Low (10 lines) | This week |
| F-003 | Server-side type defs mirror client types | Accept | — | — | — | — |
| F-004 | Blocklist duplication (client + server) | Accept | — | — | — | — |

### This Week

**F-002: Remove unnecessary `useCallback` on pure functions** (Trivial, Low risk)
- Extract `getCardDelay()` and `getStringDelay()` from `Corkboard.tsx` as module-level functions
- Remove `useCallback` wrappers (lines 66-82)
- Saves ~10 lines, improves clarity
- Can be done in next Code Elegance run
- Test coverage: Corkboard tests cover animation timing

### This Month

Nothing. The codebase has no medium-priority simplification needs.

### This Quarter

Nothing. No architectural restructuring is warranted.

### Backlog

**Consider shared blocklist module** — If the blocklist grows significantly or sync failures occur between `blocklist.ts` and `generate.ts`, extract a shared `safety/` module importable by both frontend and serverless function. Current cost of duplication (~120 lines across 2 files) does not justify the build system complexity this would introduce today. Revisit if:
- Blocklist exceeds 50 terms
- A sync bug occurs in production
- A third consumer needs the blocklist

---

## 7. Accepted Complexity

These items were evaluated and determined to be justified. The team should not re-investigate them.

### A-001: Blocklist Duplication (Client + Server)
**What**: `BLOCKED_TERMS`, `SUBSTITUTIONS`, `CONFUSABLES`, and `normalizeInput()` are duplicated in `src/lib/blocklist.ts` and `netlify/functions/generate.ts`.
**Why it's justified**: Security boundary enforcement. The client blocklist provides immediate UX feedback. The server blocklist is a security backstop against direct API callers who bypass the UI. Sharing code would require a build-time extraction step that adds complexity exceeding the duplication cost. Documented in CLAUDE.md.

### A-002: Duplicated Chain Validation (Client + Server)
**What**: `validateChainResponse()` in `api.ts` and `validateResponse()` in `generate.ts` perform structurally identical validation.
**Why it's justified**: Defense in depth across an HTTP boundary. The server validates Claude's output (untrusted AI response). The client validates the server's response (untrusted network response). Both are necessary. The ~70 lines of duplication is the correct trade-off vs. a shared module that would couple frontend and serverless build pipelines.

### A-003: Server-Side Type Definitions
**What**: `generate.ts` defines `ChainNode` and `ChainResponse` interfaces that mirror `ConspiracyNode` and `ConspiracyChain` in `conspiracy.ts`.
**Why it's justified**: The serverless function is an independent deployment unit. It cannot import from `src/` (different build context). Defining its own types keeps it self-contained and deployable independently.

### A-004: Dual Font Maps
**What**: `FONT_MAP` (CSS font-family strings) and `FONT_CLASS_MAP` (Tailwind class names) in `fonts.ts`.
**Why it's justified**: Tailwind v4 uses `@theme` blocks in CSS, not JS config. The CSS font-family (used in inline styles) and the Tailwind class name (used in `className`) are different concerns requiring different values.

### A-005: Seeded Random for Layout
**What**: Custom linear congruential generator in `layout.ts` instead of `Math.random()`.
**Why it's justified**: Same conspiracy chain always produces same card layout. This is a deliberate feature enabling consistent visual experience.

### A-006: Animation Timing Constants
**What**: 7 interconnected timing constants in `constants.ts` that must be tuned together.
**Why it's justified**: Centralizing timing values in one file is the correct approach. The alternative — hardcoding timings in individual components — would make tuning the reveal sequence require changes across 3 files.

---

## 8. Recommendations

### Priority-Ordered Next Steps

1. **Run Code Elegance** on `Corkboard.tsx` to extract `getCardDelay`/`getStringDelay` as module-level functions (F-002). This is the only actionable simplification found.

2. **No other audits needed.** This codebase is at or near its complexity floor for the feature set it provides.

### Which Overnight Prompts Should Run Next

| Prompt | Target | Rationale |
|--------|--------|-----------|
| Code Elegance | `Corkboard.tsx` | Extract `useCallback`-wrapped pure functions (F-002) |
| File Decomposition | Not needed | Previous audit (#12) confirmed no splits needed |
| Codebase Cleanup | Not needed | Previous audit (#10) found no dead code |

### Conventions to Prevent Future Complexity

The team is already following these conventions. Documenting them here to reinforce:

1. **No forwarding layers**: Every file in a call chain must do meaningful work
2. **No premature abstraction**: Interfaces only when multiple implementations exist or for testability
3. **Local state by default**: Global state only when genuinely shared across components
4. **One file per concern**: No junk-drawer `utils/` directories
5. **Duplicate across security boundaries**: Blocklist and validation are correctly duplicated, not shared

### Decision Framework: "Should We Add This Abstraction?"

Before adding any new abstraction (interface, wrapper, factory, event system, configuration layer):

1. **Does it have 2+ concrete implementations today?** If no, don't add it.
2. **Does it enable testing that's otherwise impossible?** If yes, add it (but keep it minimal).
3. **Does it cross a security/deployment boundary?** If yes, duplication is likely better than sharing.
4. **Will removing it later be easy?** If yes, it's fine to add. If no, prove the need first.
5. **Does a junior developer need more than 30 seconds to understand why it exists?** If yes, it's probably not pulling its weight.

This codebase passes all five checks for every abstraction it contains. Maintain this standard.
