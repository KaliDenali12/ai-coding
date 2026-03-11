# Performance Audit Report #18

**Run**: 01
**Date**: 2026-03-11 19:20
**Branch**: `performance-optimization-2026-03-11`
**Baseline**: 267 tests passing | All types check clean
**Post-changes**: 267 tests passing | All types check clean

---

## 1. Executive Summary

This is a small, stateless SPA with a single serverless function. The codebase is lean (37 source files, 4 production dependencies) and already well-optimized for its scale. No critical or high-severity performance issues were found.

### Top 5 Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Resize handler in Corkboard fires at 60fps without debounce, triggering unnecessary re-renders of 7 cards + 6 strings per frame | Medium | **Fixed** |
| 2 | All 12 Google Fonts load eagerly on initial page load; only 3 are needed for landing screen | Low | Documented |
| 3 | Blocklist normalization creates intermediate strings per character substitution | Low | Not worth fixing (max 50 chars, not a hot path) |
| 4 | Anthropic SDK client instantiated per request in serverless function | Low | Expected pattern for serverless |
| 5 | No bundle analysis configured (no way to track bundle size regression) | Low | Documented |

**Quick wins implemented**: 1 (resize debounce)
**Larger efforts documented**: 2 (font splitting, bundle analysis)

---

## 2. Database Performance

**N/A** - This project has no database. It is fully stateless and ephemeral. The only external data call is a single POST to the Anthropic Claude API via a Netlify serverless function.

### API Call Analysis

| Endpoint | Method | External Call | Latency | Optimization Potential |
|----------|--------|---------------|---------|----------------------|
| `/.netlify/functions/generate` | POST | Claude API (`claude-sonnet-4-20250514`, max_tokens: 4000) | 2-10s (AI generation) | None practical - latency is inherent to LLM inference |

- No N+1 queries (single API call per user interaction)
- No missing indexes (no database)
- No unbounded queries (fixed 7-node response, validated)
- Request size limited to 10KB; input limited to 50 chars per concept

---

## 3. Application Performance

### 3.1 Expensive Operations

| Location | Issue | Complexity | Recommendation |
|----------|-------|-----------|---------------|
| `blocklist.ts:51-69` / `generate.ts:38-54` | `normalizeInput()` iterates `Object.entries()` for CONFUSABLES (31 entries) and SUBSTITUTIONS (9 entries), calling `replaceAll` each time | O(n*k) where n=input length, k=substitution count | **Not worth optimizing.** Input is max 50 chars, runs once per submission. Total work: ~2000 string operations. Microsecond-scale. |
| `generate.ts:223` | `new Anthropic()` instantiated per request | O(1) | **Expected for serverless.** Each function invocation is a new execution context. No connection pooling possible or needed. |
| `api.ts:14-68` | `validateChainResponse` validates 7 nodes with string length checks | O(1) fixed | **No issue.** Fixed 7 iterations, simple type checks. |
| `layout.ts:25-67` | `calculateCardPositions` computes positions for 7 cards | O(1) fixed | **No issue.** Fixed 7 iterations, simple math. Already memoized in Corkboard. |

### 3.2 Caching Opportunities

| Data | Strategy | Invalidation | Impact | Worth It? |
|------|----------|-------------|--------|-----------|
| Claude API responses for identical concept pairs | Redis/KV store keyed by sorted concept pair | TTL-based (e.g., 24h) | Saves ~$0.01-0.05 per cached hit + 2-10s latency | **No.** Users expect unique results. The app's value is novelty/variety. Caching defeats the purpose. |
| Google Fonts | Already cached by browser (CDN with long cache headers) | N/A | N/A | Already optimal |
| Blocklist normalization | Could pre-build a RegExp from BLOCKED_TERMS | N/A | Saves microseconds | **No.** Not a hot path. |

### 3.3 Async/Concurrency

- **API call**: Already async with AbortController signal for cancellation. Correct.
- **No sequential calls to parallelize**: Each user interaction makes exactly one API call.
- **No blocking I/O on hot paths**: All file operations are at build time (Vite).
- **No connection pooling needed**: Serverless function creates SDK client per invocation (standard pattern).
- **No external API throttling needed**: Single user, single API call per interaction.

---

## 4. Memory & Resources

### 4.1 Memory Leak Patterns

All event listeners, intervals, and timers have proper cleanup:

| Component | Resource | Cleanup | Status |
|-----------|----------|---------|--------|
| `Corkboard.tsx` | `resize` event listener | `removeEventListener` in useEffect return | OK |
| `Corkboard.tsx` | Reveal completion timer | `clearTimeout` in useEffect return | OK |
| `Corkboard.tsx` | Debounce timer (new) | `clearTimeout` in useEffect return | OK |
| `LoadingScreen.tsx` | Message cycling interval | `clearInterval` in useEffect return | OK |
| `LoadingScreen.tsx` | Stamp visibility timer | `clearTimeout` in useEffect return | OK |
| `LoadingScreen.tsx` | Phase tracking interval | `clearInterval` in useEffect return | OK |
| `RedString.tsx` | Visibility timer | `clearTimeout` in useEffect return | OK |
| `App.tsx` | AbortController | `abort()` called before creating new controller | OK |

**No memory leaks found.**

### 4.2 Potential Issues (Non-Critical)

- **No growing collections**: No in-memory caches, no unbounded arrays, no module-level accumulators.
- **No circular references**: Simple prop-based component tree.
- **No unclosed streams**: No streams used (fetch response consumed immediately via `.json()`).
- **No orphaned child processes**: No child processes spawned.
- **No temp files**: No file operations.

### 4.3 Resource Management

- **Serverless function**: Stateless, no persistent connections to manage. Anthropic SDK handles HTTP connection lifecycle internally.
- **AbortController**: Properly aborts in-flight requests before starting new ones (`App.tsx:23`).

---

## 5. Frontend Performance

### 5.1 Render Performance

#### Fixes Applied

| Component | Issue | Fix |
|-----------|-------|-----|
| `Corkboard.tsx` | Resize handler fired at 60fps during window resize, causing re-renders of entire board (7 PolaroidCards, 6 RedStrings, CaseFileStamp, SVG layer) on every animation frame | Added 150ms debounce using `setTimeout`/`clearTimeout`. Resize events now coalesce into a single state update after user stops resizing. |

**Before:**
```typescript
useEffect(() => {
  function handleResize() {
    setViewportSize({ width: window.innerWidth, height: window.innerHeight })
  }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

**After:**
```typescript
const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  function handleResize() {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    resizeTimerRef.current = setTimeout(() => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }, 150)
  }
  window.addEventListener('resize', handleResize)
  return () => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
  }
}, [])
```

#### Documented for Review (Not Actioned)

| Component | Issue | Impact | Effort |
|-----------|-------|--------|--------|
| `Corkboard.tsx:154` | `onClick={() => handleCardClick(i)}` creates new function per card per render | Negligible (7 cards, function creation is near-free) | Not worth fixing |
| `LandingScreen.tsx:46-49` | `canSubmit` recomputes `.trim()` and `.toLowerCase()` on every render | Negligible (max 50-char strings, keystroke frequency) | Not worth fixing |
| `LoadingScreen.tsx:56-62` | `getMessage` useCallback recreates on every `messageIndex`/`phase` change | Expected (values it depends on change frequently) | Not worth fixing |
| `ErrorScreen.tsx:10-13` | `useMemo` with `Math.random()` and empty deps | Intentional design (random error variant per mount) | N/A |

**No unnecessary re-renders requiring `React.memo`**: Components only re-render when their props or state actually change. The component tree is shallow (max 3 levels deep). No context providers with inline values.

### 5.2 Loading Performance

#### Critical Rendering Path

| Resource | Blocking? | Status |
|----------|-----------|--------|
| `main.tsx` | No (module scripts are deferred by default) | OK |
| Google Fonts CSS | Render-blocking `<link>` in `<head>` | See font analysis below |
| Tailwind CSS | Bundled by Vite, inlined in build | OK |
| Vite bundle | `<script type="module">` (deferred) | OK |

#### Fonts

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| `font-display` | `swap` (via `&display=swap` in Google Fonts URL) | OK - prevents FOIT |
| Preconnect | `fonts.googleapis.com` and `fonts.gstatic.com` with `crossorigin` | OK |
| Font count | 12 fonts loaded in single `<link>` | See below |
| Font loading strategy | All 12 fonts load eagerly on initial page load | Could split: 3 essential (Special Elite, Caveat, Inter) + 9 mood fonts deferred |

**Font splitting opportunity**: Only 3 fonts are needed for the landing screen (Special Elite for UI, Inter for body, and possibly Caveat for later). The 9 mood fonts (Creepster, Orbitron, Cinzel, etc.) are only used when the Corkboard renders after AI response. Loading them eagerly adds ~200-400KB of font data to initial load.

**However**: With `font-display: swap`, fonts don't block rendering. They load in the background while the landing screen renders. By the time the user submits and the AI responds (2-10 seconds), all fonts are likely cached. The practical impact is **near-zero for perceived performance** but increases initial bandwidth.

**Recommendation**: Document only. Splitting the Google Fonts `<link>` tag is a minor optimization with minimal real-world impact given the natural 2-10s AI generation delay.

#### Images

**No images in the project.** All visuals are CSS-generated (cork texture via gradients, push pins via colored divs, vignette via radial gradient). This is excellent for loading performance.

#### Third-Party Scripts

| Script | Purpose | Size | Async? | Deferrable? |
|--------|---------|------|--------|-------------|
| Google Fonts CSS | Font loading | ~2KB CSS + font files | Render-blocking `<link>` | Could use `media="print" onload` pattern, but `swap` already prevents FOIT |

**No analytics, chat widgets, A/B testing, ads, or embeds.** Extremely lean third-party footprint.

#### Code Splitting

Not implemented. Routes are not lazy-loaded. However:
- Total source: 37 files, ~2000 lines of application code
- 4 production dependencies (React, ReactDOM, Framer Motion, Anthropic SDK)
- Anthropic SDK is server-only (not bundled in client)
- Estimated client bundle: React (~40KB gzipped) + Framer Motion (~30KB gzipped) + app code (~15KB gzipped) = ~85KB gzipped total

**Code splitting would add complexity for negligible benefit at this bundle size.** Not recommended.

### 5.3 Runtime Event Handlers

| Handler | Location | Issue | Status |
|---------|----------|-------|--------|
| `resize` | `Corkboard.tsx:43-49` | Was unthrottled, firing at 60fps | **Fixed** (150ms debounce) |
| `onChange` (inputs) | `LandingScreen.tsx:88-91, 108-111` | Simple setState per keystroke | OK (no expensive operations) |
| `onKeyDown` | `LandingScreen.tsx:37-44` | Checks for Enter key only | OK |
| `onClick` (cards) | `Corkboard.tsx:85-91` | Simple state toggle | OK |
| `onClick` (board) | `Corkboard.tsx:94-100` | `closest()` DOM query + setState | OK |

**No scroll handlers, no mousemove handlers, no touch listeners needing `passive: true`.**

### 5.4 Animation Performance

| Animation | Technique | Compositor-Friendly? | Status |
|-----------|-----------|---------------------|--------|
| Card flip | CSS `transform: rotateY()` + `transition-transform` | Yes | OK |
| Card entrance | Framer Motion `opacity` + `scale` + `y` | Yes (`transform` + `opacity`) | OK |
| Red string drawing | CSS `stroke-dashoffset` transition | Yes (SVG paint, no layout) | OK |
| Stamp slam | CSS `@keyframes` with `transform` + `opacity` | Yes | OK |
| Screen transitions | Framer Motion `opacity` | Yes | OK |
| Blinking cursor | Framer Motion `opacity` | Yes | OK |
| Flickering error | Framer Motion `opacity` | Yes | OK |
| Button hover | Framer Motion `scale` | Yes | OK |

**All animations use compositor-friendly properties (`transform`, `opacity`).** No layout-triggering animations. No `setInterval` for animations (all use CSS transitions or Framer Motion's requestAnimationFrame-based engine).

### 5.5 DOM Size

Estimated DOM nodes at peak (Corkboard screen):
- 7 PolaroidCards (each ~20 nodes) = ~140
- 6 RedString SVG paths = ~6
- SVG container = 1
- Corkboard wrapper = 1
- CaseFileStamp = ~5
- New Investigation button = ~3
- **Total: ~156 nodes**

Well under the 1500-node threshold. No virtualization needed.

---

## 6. Optimizations Implemented

### 6.1 Resize Handler Debounce

- **File**: `src/components/Corkboard.tsx`
- **Change**: Added 150ms debounce to window resize handler
- **Before**: `setViewportSize()` called on every resize event (~60 calls/second during resize)
- **After**: `setViewportSize()` called once, 150ms after user stops resizing
- **Impact**: Eliminates ~59/60 unnecessary re-renders per second during window resize. Each prevented re-render avoids: layout recalculation for 7 cards, string path regeneration for 6 paths, and React reconciliation of ~156 DOM nodes.
- **Risk**: 150ms delay before layout updates during resize. Imperceptible to users.
- **Tests**: All 267 tests passing. Type check clean.

---

## 7. Optimization Roadmap

| # | Effort | Impact | Estimated Work | Worth Doing? |
|---|--------|--------|---------------|-------------|
| 1 | Split Google Fonts `<link>` into essential (3) + deferred mood fonts (9) | Saves ~200-400KB on initial load bandwidth; no perceived speed improvement due to `font-display: swap` | 30 minutes | Only if bandwidth-constrained users are a concern |
| 2 | Add bundle size analysis (`vite-plugin-visualizer` or `source-map-explorer`) | Enables tracking bundle size regression over time | 15 minutes | Yes, for development hygiene |
| 3 | Add `loading="lazy"` if images are ever added | Prevents below-fold image blocking | N/A (no images currently) | N/A |

---

## 8. Monitoring Recommendations

### Key Metrics to Track

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | ~1-2s (landing screen text renders immediately) | Primary LCP element is the "It's All Connected" heading |
| INP (Interaction to Next Paint) | < 200ms | < 50ms (simple setState interactions) | No expensive computations on interaction |
| CLS (Cumulative Layout Shift) | < 0.1 | ~0 (no dynamic content insertion, font-display: swap may cause minor shift) | Monitor font swap shift |
| TTI (Time to Interactive) | < 3.8s | ~1-2s (small bundle, minimal JS) | |
| Bundle size (gzipped) | < 150KB | ~85KB estimated | Track with CI |

### Alert-Worthy Conditions

- Bundle size exceeds 200KB gzipped (would indicate accidental large dependency)
- LCP exceeds 3s on 3G connection
- Claude API P95 latency exceeds 15s (current FAIL_THRESHOLD_MS)

### Suggested Performance Testing Approach

1. **Lighthouse CI**: Run in CI pipeline on each PR. Track LCP, INP, CLS, TTI, bundle size.
2. **Bundle budget**: Set a 150KB gzipped budget. Alert on exceeding.
3. **Manual spot-check**: After adding features, check Chrome DevTools Performance tab for:
   - Resize behavior (verify debounce working)
   - Animation smoothness (verify no layout thrashing)
   - Font loading waterfall (verify swap behavior)

---

## Appendix: Files Read

All 37 TypeScript/TSX source files were read during this audit:
- `src/App.tsx`, `src/main.tsx`, `src/index.css`
- All 8 components in `src/components/`
- All 5 lib files in `src/lib/`
- `src/types/conspiracy.ts`
- `netlify/functions/generate.ts`
- `index.html`, `vite.config.ts`, `vitest.config.ts`
- `CLAUDE.md`
