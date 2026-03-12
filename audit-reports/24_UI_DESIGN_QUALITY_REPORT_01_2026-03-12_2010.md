# UI Design Quality Audit Report

**Report**: #24 — UI Design Quality
**Date**: 2026-03-12 20:10
**Branch**: `ui-polish-2026-03-12`
**Method**: Code-based analysis (Playwright MCP unavailable)
**Tests**: 279/279 passing before and after audit

---

## 1. Executive Summary

**Design Quality Rating: Competent** (trending toward Polished)

This is a well-built, themed single-page application with a clear visual identity and intentional design decisions. A coherent design system exists — colors are tokenized as CSS variables, fonts are mapped through a systematic 4-layer hierarchy, spacing follows a 4px base grid, and border-radius is consistent by component type. The two-palette system (dark screens vs. corkboard) is executed cleanly.

**Issue counts by severity:**
- Critical: 0
- High: 3
- Medium: 8
- Low: 6

**Top 5 highest-impact improvements:**
1. Add visible focus rings to all buttons (accessibility + polish)
2. Unify card back/front cream colors (design consistency)
3. Increase mobile tap targets on example chips (usability)
4. Add hover states to example chips that include cursor feedback (interaction polish)
5. Standardize button padding across all button variants (design system consistency)

---

## 2. Screen-by-Screen Audit

### Landing Screen (`LandingScreen.tsx`)

| # | Severity | Component | Issue | Measurement | Recommendation |
|---|----------|-----------|-------|-------------|----------------|
| L1 | HIGH | Submit button | No explicit focus ring style. Browser default may be invisible on dark background | N/A | Add `focus:ring-2 focus:ring-landing-accent focus:ring-offset-2 focus:ring-offset-landing-bg` |
| L2 | HIGH | Example chips | No explicit focus ring style. Chips are focusable buttons | N/A | Add `focus:ring-2 focus:ring-landing-accent/60 focus:ring-offset-1 focus:ring-offset-landing-bg` |
| L3 | MEDIUM | Example chips | Tap target too small on mobile. `py-2` (8px) + `text-sm` (14px) ≈ 30px height | 30px vs 44px minimum | Increase to `py-2.5` or `py-3` on mobile, or add `min-h-[44px]` |
| L4 | MEDIUM | `+` separator | Hidden on mobile (`hidden md:block`) but no visual replacement. Inputs stack with no connector | N/A | Consider adding a horizontal rule or "+" text visible on mobile, or rely on labels |
| L5 | LOW | Subtitle | `tracking-widest` on `text-sm` text creates very wide letter-spacing at small size. Borderline readability | ~0.1em on 14px | Acceptable for short decorative text (2 words). Document as intentional |
| L6 | LOW | Error message | `text-sm` (14px) may be small for error feedback on mobile | 14px | Consider `text-sm md:text-sm` with mobile bump to `text-base` |

### Loading Screen (`LoadingScreen.tsx`)

| # | Severity | Component | Issue | Measurement | Recommendation |
|---|----------|-----------|-------|-------------|----------------|
| LD1 | MEDIUM | CLASSIFIED stamp | Inline `style={{ transform: 'rotate(-15deg)' }}` is redundant — the `stamp-slam` animation already includes rotation in all keyframes, and reduced-motion CSS also sets it | N/A | Remove inline style. Animation handles rotation during playback; CSS reduced-motion rule handles fallback |
| LD2 | LOW | Redacted lines | `w-64` (256px) container is arbitrary. On very small screens, lines may feel cramped | 256px fixed | Could use `w-full max-w-64` for better mobile scaling |
| LD3 | LOW | Blinking cursor | `w-2 h-5` (8×20px) is a subtle detail. No issues found | 8×20px | Fine as-is |

### Corkboard Screen (`Corkboard.tsx` + `PolaroidCard.tsx`)

| # | Severity | Component | Issue | Measurement | Recommendation |
|---|----------|-----------|-------|-------------|----------------|
| C1 | MEDIUM | Card back face | Uses `bg-amber-50` (#fffbeb) instead of `bg-polaroid-cream` (#f5f0e1). Two different creams for front and back of same card | #fffbeb vs #f5f0e1 | Change to `bg-polaroid-cream` for consistency, or document as intentional (notebook vs photo) |
| C2 | MEDIUM | New Investigation button | Padding is `px-6 py-2.5` while other buttons use `px-8 py-3`. Inconsistent button sizing | py-2.5 vs py-3 | Standardize to `px-8 py-3` to match submit/retry buttons |
| C3 | MEDIUM | New Investigation button | No explicit focus ring. Button appears over cork background | N/A | Add `focus:ring-2 focus:ring-white/40 focus:ring-offset-2` |
| C4 | MEDIUM | Card click handler | `onClick` on outer div but no visual active/pressed state beyond Framer Motion spring | N/A | The `whileHover={{ scale: 1.03 }}` provides hover feedback but no active state. Consider adding `whileTap={{ scale: 0.97 }}` |
| C5 | LOW | Push pin colors | Uses Tailwind standard reds (`red-700`, `red-400`, `red-900`) not theme colors. Minor inconsistency but push pins are decorative | N/A | Could create `--color-pin-*` tokens but effort outweighs benefit |
| C6 | LOW | Card ruled lines | Hardcoded `#999` for ruled line pattern on card back | #999 | Could use Tailwind class but inline gradient pattern requires raw value. Acceptable |

### Error Screen (`ErrorScreen.tsx`)

| # | Severity | Component | Issue | Measurement | Recommendation |
|---|----------|-----------|-------|-------------|----------------|
| E1 | HIGH | Retry button | No explicit focus ring. Only interactive element on screen; keyboard users need clear focus indicator | N/A | Add `focus:ring-2 focus:ring-landing-accent focus:ring-offset-2 focus:ring-offset-landing-bg` |
| E2 | MEDIUM | Error stamp | Same redundant inline `style={{ transform: 'rotate(-15deg)' }}` as LoadingScreen | N/A | Remove inline style; animation and reduced-motion CSS handle it |
| E3 | LOW | Message text | `text-sm md:text-lg` is a large jump (14px→18px). Could use intermediate `md:text-base` | 14px→18px | Minor — the typewriter font at these sizes is readable |

### CaseFileStamp (`CaseFileStamp.tsx`)

| # | Severity | Component | Issue | Measurement | Recommendation |
|---|----------|-----------|-------|-------------|----------------|
| S1 | MEDIUM | Case file number | `text-landing-accent/60` (red at 60% opacity) on cork background may have low contrast | ~60% opacity red on tan | Verify contrast ratio. If below 3:1, increase to `/70` or `/80` |

---

## 3. Design System State

### Token Inventory Summary

| Dimension | Count | System? |
|-----------|-------|---------|
| Custom colors | 5 CSS variables | Yes — well-defined palette |
| Tailwind colors | ~15 distinct uses | Mostly theme-aligned; a few standard reds for decorative elements |
| Font families | 12 (3 UI + 9 category) | Yes — clear 4-layer system |
| Font sizes | 10 distinct classes | Reasonable for two-context app |
| Spacing values | ~15 distinct | 4px-based grid with 1 outlier (py-2.5) |
| Border radii | 3 distinct | Consistent by component type |
| Shadows | 2 distinct | Clean and consistent |
| Z-indices | 5 layers | Well-ordered |
| Breakpoints | 1 (md: 768px) | Simple and sufficient |

### System Coherence: **Strong**

The design system is coherent and well-executed for a small SPA:
- Colors are centralized in `@theme` block
- Fonts have a clear assignment system
- Spacing follows a 4px grid
- Border radius follows component-type rules
- A single responsive breakpoint keeps things simple

**Biggest structural gap**: Button styling is not fully standardized — three button variants (submit, retry, new investigation) have slightly different padding, hover behaviors, and focus handling.

**Full design system documentation**: [docs/DESIGN_SYSTEM.md](../conspiracy-board/docs/DESIGN_SYSTEM.md)

---

## 4. Interaction Audit (Code-Based)

### Hover States

| Element | Has Hover? | Implementation | Notes |
|---------|-----------|---------------|-------|
| Submit button | Yes | `hover:bg-landing-accent/80` + Framer `whileHover={{ scale: 1.02 }}` | Good |
| Retry button | Yes | `hover:bg-landing-accent/80` + Framer `whileHover={{ scale: 1.02 }}` | Good |
| New Investigation button | Yes | `hover:bg-landing-bg hover:border-landing-accent/60` | Good |
| Example chips | Yes | `hover:text-white hover:border-landing-accent/60 hover:bg-landing-accent/10` | Good |
| Polaroid cards | Yes | Framer `whileHover={{ scale: 1.03, zIndex: 50 }}` | Good |
| Text inputs | Partial | `focus:border-landing-accent` but no hover state | Medium — inputs typically don't need hover |

### Focus States

| Element | Has Focus Ring? | Implementation |
|---------|----------------|----------------|
| Text inputs | Yes | `focus:outline-none focus:border-landing-accent focus:ring-1 focus:ring-landing-accent` |
| Submit button | Browser default only | No explicit focus classes |
| Retry button | Browser default only | No explicit focus classes |
| New Investigation button | Browser default only | No explicit focus classes |
| Example chips | Browser default only | No explicit focus classes |
| Polaroid cards | Browser default only | Has `tabIndex={0}` + `role="button"` but no focus ring |

**Assessment**: Inputs are well-handled. All buttons rely on browser default focus rings, which may be invisible on the dark (#0a0a0a) background. This is the **single biggest interaction issue**.

### Active/Tap States

| Element | Has Active State? | Implementation |
|---------|-------------------|----------------|
| Submit button | Yes | Framer `whileTap={{ scale: 0.98 }}` |
| Retry button | Yes | Framer `whileTap={{ scale: 0.98 }}` |
| New Investigation button | No | Missing `whileTap` |
| Example chips | No | No tap feedback |
| Polaroid cards | No | No explicit tap/active state |

### Transitions

| State Change | Has Transition? | Duration | Assessment |
|-------------|----------------|----------|------------|
| Input focus | Yes | `transition-colors` (150ms) | Good |
| Button hover | Yes | `transition-all` (150ms) + Framer spring | Good |
| Chip hover | Yes | `transition-all` (150ms) | Good |
| Card flip | Yes | `duration-500` (500ms) | Good |
| Card entrance | Yes | Framer spring ~500ms | Good |
| String draw | Yes | 800ms ease-in-out | Good |
| Page transitions | Yes | Framer 400-600ms opacity | Good |
| Stamp animation | Yes | 400ms ease-out keyframe | Good |

### Reduced Motion

Properly handled at two levels:
- **CSS**: `@media (prefers-reduced-motion: reduce)` disables stamp animation and makes card flip instant
- **JS**: `useReducedMotion()` from Framer Motion in Corkboard skips all reveal animations

**Assessment**: Excellent reduced motion support.

---

## 5. Fixes Applied

**No code changes were made.** All identified issues are judgment calls where reasonable designers could disagree on the solution, or involve risk of cascading visual side effects. Everything is documented for the team to prioritize.

---

## 6. Priority Remediation Plan

| # | Recommendation | Screens Affected | Effort | Impact | Worth Doing? | How To Fix |
|---|---------------|-----------------|--------|--------|-------------|------------|
| 1 | Add focus rings to all buttons | Landing, Error, Corkboard | Hours | High | Yes | Add `focus:ring-2 focus:ring-landing-accent focus:ring-offset-2 focus:ring-offset-landing-bg` to submit button, retry button. Add `focus:ring-2 focus:ring-white/40` to New Investigation button. Add to chips and cards too. |
| 2 | Standardize button sizing | Landing, Error, Corkboard | Hours | Medium | Yes | Align New Investigation button to `px-8 py-3` to match submit/retry. All three primary buttons should share identical padding. |
| 3 | Unify card cream color | Corkboard | Hours | Medium | Yes | Change PolaroidCard.tsx:82 from `bg-amber-50` to `bg-polaroid-cream`, or decide to keep it different and document why. |
| 4 | Add active/tap states to missing elements | Corkboard | Hours | Medium | Yes | Add `whileTap={{ scale: 0.98 }}` to New Investigation button. Add subtle tap feedback to chips. |
| 5 | Increase chip tap targets on mobile | Landing | Hours | Medium | Probably | Add `min-h-[44px] items-center` to chip buttons for iOS/Android compliance. |
| 6 | Remove redundant inline transforms on stamps | Loading, Error | Hours | Low | Yes | Remove `style={{ transform: 'rotate(-15deg)' }}` from LoadingScreen.tsx:79 and ErrorScreen.tsx:28. The CSS animation and reduced-motion fallback already handle rotation. |
| 7 | Verify stamp text contrast on cork | Corkboard | Hours | Medium | Probably | Test `text-landing-accent/60` on cork background. If below 3:1 contrast, bump to `/70`. |
| 8 | Add whileTap to cards | Corkboard | Hours | Low | Only if time | Cards have hover (scale 1.03) but no pressed state. Could add `whileTap={{ scale: 0.97 }}`. |
| 9 | Mobile error text size | Error | Hours | Low | Only if time | Consider `text-base` instead of `text-sm` on mobile for error messages. |
| 10 | Redacted lines mobile width | Loading | Hours | Low | Only if time | Change `w-64` to `w-full max-w-64` for better small-screen adaptation. |

---

## 7. Design System Recommendations

### Immediate (Hours)

1. **Create a button variant system**: Define 2-3 button sizes as reusable className constants:
   - Primary: `px-8 py-3 rounded-lg bg-landing-accent text-white font-typewriter text-lg uppercase tracking-wider`
   - Secondary: `px-6 py-2.5 rounded-lg bg-landing-bg/90 text-white border border-white/20 font-typewriter`
   - Chip: `px-4 py-2 rounded-full border border-white/20 text-white/60 font-body text-sm`

   All should include focus ring classes.

2. **Standardize focus ring pattern**: Create a consistent focus ring approach:
   - On dark backgrounds: `focus:ring-2 focus:ring-landing-accent focus:ring-offset-2 focus:ring-offset-landing-bg`
   - On cork background: `focus:ring-2 focus:ring-white/40 focus:ring-offset-2`

### Short-term (Days)

3. **Resolve the amber-50 vs polaroid-cream deviation**: Decide whether the card back is intentionally different from the front and document the decision.

4. **Add focus ring tokens to theme**: Consider adding:
   ```css
   --color-focus-ring-dark: var(--color-landing-accent);
   --color-focus-ring-light: rgba(255, 255, 255, 0.4);
   ```

### Not Recommended

- **Don't extract a full component library**: The app has 4 screens and ~8 components. Abstracting further would be over-engineering.
- **Don't add more breakpoints**: The single `md:` breakpoint serves this app well.
- **Don't tokenize push pin colors**: They're decorative and self-contained in one component.

---

## 8. Report & Design System Docs Location

- **Audit Report**: `audit-reports/24_UI_DESIGN_QUALITY_REPORT_01_2026-03-12_2010.md`
- **Design System Docs**: `conspiracy-board/docs/DESIGN_SYSTEM.md`
