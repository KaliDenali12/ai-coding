# Frontend Quality Report

**Report**: 23_FRONTEND_QUALITY_REPORT_01
**Date**: 2026-03-12
**Branch**: `frontend-quality-2026-03-12`
**Test status**: 279/279 passing after all changes

---

## 1. Executive Summary

| Metric | Result |
|--------|--------|
| Accessibility issues found | 11 |
| Accessibility issues fixed | 9 (2 documented only) |
| UX consistency score | **Good** |
| Bundle size (JS) | 338.91 KB (108.97 KB gzipped) |
| Bundle size (CSS) | 23.36 KB (5.28 KB gzipped) |
| i18n readiness | **Not ready** — no framework, ~65 hardcoded strings |

---

## 2. Accessibility

### 2.1 Issues Fixed

| Component | Issue | Fix |
|-----------|-------|-----|
| `App.tsx` | Root wrapper used `<div>` instead of semantic `<main>` | Changed to `<main>` element |
| `LandingScreen.tsx` | Decorative "+" separator between inputs not hidden from screen readers | Added `aria-hidden="true"` |
| `LoadingScreen.tsx` | No `role="status"` on loading container — screen readers cannot identify loading state | Added `role="status"` and `aria-label` |
| `LoadingScreen.tsx` | Dynamic loading messages not announced to screen readers | Added `aria-live="polite"` on message element |
| `LoadingScreen.tsx` | Decorative elements (CLASSIFIED stamp, redacted lines, blinking cursor) read by screen readers | Added `aria-hidden="true"` to all three |
| `Corkboard.tsx` | SVG red string layer (decorative) exposed to assistive tech | Added `aria-hidden="true"` to SVG container |
| `CaseFileStamp.tsx` | Decorative stamp overlay exposed to assistive tech | Added `aria-hidden="true"` |
| `ErrorScreen.tsx` | Error headings used `<div>` elements instead of semantic `<h1>` | Changed all three error variant headings to `<h1>` / `<motion.h1>` |
| `ErrorScreen.tsx` | Decorative redacted bars in "classified" variant not hidden | Added `aria-hidden="true"` |

### 2.2 Test Updates Required

| File | Change | Reason |
|------|--------|--------|
| `ErrorScreen.test.tsx` | Added `motion.h1` to framer-motion mock | ErrorScreen now uses `<motion.h1>` |
| `ErrorBoundary.test.tsx` | Added `motion.h1` to framer-motion mock | Transitively renders ErrorScreen |

### 2.3 Issues Remaining (Document Only)

| Component | Issue | Severity | Effort to Fix |
|-----------|-------|----------|---------------|
| `Corkboard.tsx` | Board-level click handler on `<motion.div>` lacks keyboard equivalent (Escape to unflip) | Low | Medium — need `onKeyDown` handler + focus management |
| All animated components | No `prefers-reduced-motion` support for Framer Motion animations | Medium | Medium — wrap animations in `useReducedMotion()` hook |

### 2.4 Pre-existing Good Practices

The codebase already had several a11y patterns in place before this audit:
- `PolaroidCard.tsx`: Proper `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter + Space), `aria-label`
- `PolaroidCard.tsx`: Emoji marked with `role="img"` and `aria-label`
- `LandingScreen.tsx`: Inputs have `aria-label`, error messages have `role="alert"`
- `ErrorScreen.tsx`: Error message has `role="alert"`
- `index.html`: `lang="en"` attribute present
- Focus styles: Inputs have visible `:focus` ring via `focus:border-landing-accent focus:ring-1`

### 2.5 Overall WCAG Compliance Assessment

**Partial WCAG 2.1 AA compliance.** The app covers the major requirements:
- Keyboard navigation works for all interactive elements
- Color contrast is generally good (white on near-black, dark on cream)
- Semantic HTML is now used for structure
- Dynamic content is announced via aria-live regions
- Decorative elements are hidden from assistive tech

**Gaps**: No skip-to-content link (justified — single-page app with no repeated navigation), no `prefers-reduced-motion` support for animations.

---

## 3. UX Consistency

### 3.1 Component Inventory

| Pattern | Variants | Assessment |
|---------|----------|------------|
| **Buttons (primary)** | 2: Submit, Retry | **Consistent** — same classes: `font-typewriter text-lg px-8 py-3 rounded-lg bg-landing-accent text-white uppercase tracking-wider` |
| **Buttons (secondary)** | 1: "New Investigation" on corkboard | **Consistent** — intentionally distinct (dark bg, border, smaller) |
| **Buttons (chips)** | 5: Example pair chips | **Consistent** — `rounded-full border text-white/60` pattern |
| **Form inputs** | 2: Concept A, Concept B | **Identical** — same classes, same states |
| **Loading state** | 1: LoadingScreen with progressive messages | **Complete** — phases: normal, slow, timeout, fail |
| **Empty states** | N/A | Not applicable — chain always has exactly 7 items |
| **Error states** | 2: inline validation (LandingScreen), full-screen (ErrorScreen) | **Consistent** — both use `text-landing-accent` red, `font-typewriter`, `role="alert"` |
| **Spacing** | Tailwind scale: `gap-2`, `gap-4`, `mb-6`, `mb-8`, `mb-10` | **Consistent** — follows documented spacing tiers |
| **Typography** | 4 layers: typewriter, handwritten, dynamic, body | **Consistent** — all fonts from `@theme` |
| **Colors** | 5 CSS custom properties | **Consistent** — zero hardcoded hex values in components |
| **Border radius** | Cards: sharp; Buttons/inputs: `rounded-lg`; Chips: `rounded-full` | **Consistent** — matches design system |
| **Responsive** | Breakpoint at `md:` (768px) | **Consistent** throughout |

### 3.2 Inconsistencies Found

**None significant.** The codebase has a well-documented design system in CLAUDE.md that is faithfully followed.

### 3.3 Minor Observations (Not Bugs)

- Card back uses `bg-amber-50` (Tailwind built-in) rather than `bg-polaroid-cream` — the backs are meant to look like notebook paper, not Polaroid frames, so this is intentional
- The "New Investigation" button uses smaller text (`text-sm md:text-base`) vs primary buttons (`text-lg`) — intentional hierarchy

---

## 4. Bundle Size

### 4.1 Current Bundle Composition

| Output | Raw Size | Gzipped |
|--------|----------|---------|
| `index.js` | 338.91 KB | 108.97 KB |
| `index.css` | 23.36 KB | 5.28 KB |
| `index.html` | 1.20 KB | 0.68 KB |
| **Total** | **363.47 KB** | **114.93 KB** |

### 4.2 Estimated Dependency Breakdown

| Dependency | Estimated Size (gzipped) | Usage |
|------------|-------------------------|-------|
| `react` + `react-dom` | ~45 KB | Core framework — required |
| `framer-motion` | ~55 KB | Animation — used in every component |
| Application code | ~9 KB | Components, lib, types |

### 4.3 Optimizations Implemented

None needed. The bundle is already well-optimized:
- Only 4 production dependencies (react, react-dom, framer-motion, @anthropic-ai/sdk)
- `@anthropic-ai/sdk` is server-only (in `netlify/functions/`), not in the client bundle
- Framer-motion uses named imports enabling tree-shaking
- Tailwind v4 with Vite plugin purges unused CSS automatically
- No lodash, no moment.js, no unnecessary large libraries

### 4.4 Optimization Opportunities (Not Implemented)

| Opportunity | Potential Savings | Effort | Worth It? |
|-------------|------------------|--------|-----------|
| Replace `framer-motion` with lighter alternative | ~20-30 KB gzipped | High | No — deeply integrated |
| Lazy-load corkboard components | ~5 KB initial load | Medium | Probably not — marginal for 109KB total |
| Image optimization | N/A | N/A | N/A — no image files exist |

---

## 5. Internationalization (i18n)

### 5.1 Assessment

**Not ready.** No i18n framework is installed. All user-facing text is hardcoded in English.

### 5.2 String Catalog

**Total hardcoded user-facing strings: ~65**

#### Component Strings (inline in JSX)

| File | Line | String | Suggested Key |
|------|------|--------|---------------|
| `LandingScreen.tsx` | 66 | "It's All Connected." | `landing.headline` |
| `LandingScreen.tsx` | 75 | Conspiracy Board | `landing.subtitle` |
| `LandingScreen.tsx` | 93 | Penguins (placeholder) | `landing.placeholder_a` |
| `LandingScreen.tsx` | 112 | IKEA Furniture (placeholder) | `landing.placeholder_b` |
| `LandingScreen.tsx` | 96 | First concept (aria-label) | `landing.aria_label_a` |
| `LandingScreen.tsx` | 115 | Second concept (aria-label) | `landing.aria_label_b` |
| `LandingScreen.tsx` | 142 | Uncover the Truth | `landing.submit_button` |
| `LoadingScreen.tsx` | 73 | Loading investigation results | `loading.aria_label` |
| `LoadingScreen.tsx` | 83 | CLASSIFIED | `loading.stamp_text` |
| `ErrorScreen.tsx` | 81 | Try Again | `error.retry_button` |
| `Corkboard.tsx` | 190 | New Investigation | `board.new_investigation` |
| `PolaroidCard.tsx` | 36 | click to close / read briefing (template) | `card.aria_label` |
| `PolaroidCard.tsx` | 98 | Classified Briefing | `card.briefing_label` |

#### Constants Strings (`src/lib/constants.ts`)

| String Group | Count | Suggested Key Pattern |
|--------------|-------|-----------------------|
| `EXAMPLE_PAIRS` | 10 strings (5 pairs) | `examples.pair_N.a/b` |
| `LOADING_MESSAGES` | 8 messages | `loading.message_N` |
| `SLOW_LOADING_MESSAGES` | 4 messages | `loading.slow_N` |
| `TIMEOUT_MESSAGE` | 1 message | `loading.timeout` |
| `ERROR_MESSAGES` | 6 strings (3 heading + 3 message) | `error.variant_N.heading/message` |

#### Blocklist Messages (`src/lib/blocklist.ts`)

| String | Suggested Key |
|--------|---------------|
| Both fields are required. | `validation.both_required` |
| You can't investigate yourself... | `validation.same_concept` |
| That concept is classified... | `validation.blocked` |
| Keep it under 50 characters... | `validation.too_long` |

#### API Error Messages (`src/lib/api.ts`)

| String | Suggested Key |
|--------|---------------|
| The investigation could not be completed. Please try again. | `api.generic_error` |
| Our server returned an unreadable response. Please try again. | `api.parse_error` |

### 5.3 Other i18n Concerns

| Issue | Location | Severity |
|-------|----------|----------|
| No RTL layout support | All components use `left`/`right` instead of logical properties | Low |
| Concatenated string in PolaroidCard aria-label | `PolaroidCard.tsx:36` | Medium — would break in other languages |
| No date/number formatting needed | N/A | None |

### 5.4 Recommended i18n Approach

If i18n is ever needed:
1. **Framework**: `react-i18next` (most popular, good TypeScript support)
2. **Effort estimate**: ~4-8 hours for extraction + setup
3. **String count**: ~65 strings in ~10 files
4. **Do NOT add now**: The app is a comedic novelty tool. i18n would be over-engineering unless there is a specific business need.

---

## 6. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---------------|--------|-----------------|--------------|---------|
| 1 | Add `prefers-reduced-motion` support | Prevents motion sickness for users with vestibular disorders | Medium | Yes | Framer Motion has built-in `useReducedMotion()` hook. Wrap card reveals, string animations, and stamp slams. ~2 hours. |
| 2 | Add Escape key to close flipped cards | Keyboard users cannot close a flipped card without clicking elsewhere | Low | Probably | Add `onKeyDown` handler to corkboard that listens for Escape. ~15 minutes. |
| 3 | Lazy-load corkboard components | Reduces initial JS by ~5KB — corkboard only needed after API response | Low | Only if time allows | Use `React.lazy()` for Corkboard + children. Marginal benefit at 109KB gzipped total. |
| 4 | Extract i18n strings (only if needed) | Enables localization | Low | Only if time allows | Only pursue if there is a business case for non-English users. |

---

## Appendix: Files Modified

| File | Change Type | Commit |
|------|-------------|--------|
| `src/App.tsx` | `<div>` to `<main>` | `a11y: improve accessibility across all components` |
| `src/components/LandingScreen.tsx` | `aria-hidden` on "+" | Same |
| `src/components/LoadingScreen.tsx` | `role="status"`, `aria-live`, `aria-hidden` (3 elements) | Same |
| `src/components/Corkboard.tsx` | `aria-hidden` on SVG | Same |
| `src/components/CaseFileStamp.tsx` | `aria-hidden` | Same |
| `src/components/ErrorScreen.tsx` | `<div>` to `<h1>`, `aria-hidden` | Same |
| `src/components/__tests__/ErrorScreen.test.tsx` | Added `motion.h1` mock | Same |
| `src/components/__tests__/ErrorBoundary.test.tsx` | Added `motion.h1` mock | Same |
