# Animation System

## Reveal Sequence (Corkboard.tsx)
Cards and strings animate in sequential order on board mount:
1. Each card enters with spring animation (scale 0.8→1, y:-20→0, opacity 0→1)
2. After card entrance, its outgoing string draws via stroke-dashoffset
3. Next card enters, repeat until all 7 cards + 6 strings are revealed
4. CaseFileStamp slams in after last card
5. "New Investigation" button fades in after `revealComplete` flag is set

### Timing Constants (src/lib/constants.ts)
| Constant | Value | Purpose |
|----------|-------|---------|
| `REVEAL_CARD_DELAY_MS` | 800 | Initial delay before first card |
| `REVEAL_CARD_ENTRANCE_MS` | 500 | Duration of each card's entrance |
| `REVEAL_STRING_DURATION_MS` | 800 | Duration of each string's draw |

Total sequence: ~800 + 7×(500+800) = ~9.9s + 500ms stamp buffer

### Card Delay Formula
```
cardDelay(i) = i * (ENTRANCE + STRING_DURATION) + CARD_DELAY
stringDelay(i) = cardDelay(i) + ENTRANCE
```

Cards are NOT interactive until `revealComplete = true`.

## 3D Card Flip (PolaroidCard.tsx + index.css)
- Pure CSS transform: `rotateY(180deg)` on click
- Requires three CSS utility classes in `index.css`:
  - `.perspective` → `perspective: 1000px`
  - `.preserve-3d` → `transform-style: preserve-3d`
  - `.backface-hidden` → `backface-visibility: hidden`
- Transition: `duration-500` (500ms)
- Front and back are absolutely positioned, both with `.backface-hidden`
- Back face has `transform: rotateY(180deg)` applied inline

## Red String (RedString.tsx)
- SVG `<path>` element with quadratic Bezier curve
- Animation: stroke-dasharray = pathLength, dashoffset transitions from pathLength → 0
- `getTotalLength()` measured on mount via ref (polyfilled in tests)
- Sag: control point drops below midpoint by `min(distance * 0.15, 60)px`
- Color: `var(--color-string-red)` (#8B1A1A)
- Delayed visibility via `setTimeout` + `isVisible` state

## CLASSIFIED Stamp (LoadingScreen.tsx + index.css)
- CSS keyframe `stamp-slam`: scale 3→1.1→1, opacity 0→0.9→0.8
- Duration: 0.4s ease-out
- Applied via `.animate-stamp` class
- Appears after 300ms delay on LoadingScreen mount

## Framer Motion Usage
- `AnimatePresence mode="wait"` wraps screen transitions in App.tsx
- `motion.div` for page-level enter/exit (opacity 0→1)
- `whileHover={{ scale: 1.03 }}` on Polaroid cards (disabled during reveal)
- `whileTap={{ scale: 0.98 }}` on buttons
- Spring animation: `stiffness: 200, damping: 20` for card entrance

## Common Mistakes
- Don't add Framer Motion `animate` prop to elements that already use CSS transitions (card flip uses CSS, not FM)
- String visibility is boolean state, not Framer Motion — don't try to use FM for stroke-dash
- `getTotalLength()` returns 0 in jsdom — must polyfill in tests
