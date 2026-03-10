# Feature Inventory

## Implemented (P0/P1 — Complete)

### LandingScreen.tsx
- Two text inputs with `maxLength={50}`, Enter key submit
- Client-side validation via `checkInputs()` (blocklist, empty, same-word, length)
- 5 example chips that auto-fill and submit
- Disabled submit button when inputs invalid
- Framer Motion entrance animations (staggered fade-in)
- Error display below inputs

### LoadingScreen.tsx
- CLASSIFIED stamp (CSS `stamp-slam` keyframe, 300ms delay)
- 5 animated redacted text lines
- Cycling status messages (1.5s interval from `LOADING_MESSAGES`)
- Phase transitions: normal (0-8s) → slow (8-12s) → timeout (12-15s) → fail (15s)
- Blinking cursor indicator
- `onTimeout` callback fires at 15s (`FAIL_THRESHOLD_MS`)

### Corkboard.tsx
- Responsive layout via `calculateCardPositions()` (zigzag desktop, vertical mobile)
- Viewport resize listener
- Seeded random layout (deterministic per case file number)
- SVG string layer (6 paths between 7 cards)
- Sequential reveal animation orchestration
- Click-outside-card unflips any flipped card
- CaseFileStamp overlay (bottom-right)
- "New Investigation" button (appears after reveal completes)

### PolaroidCard.tsx
- Front: push pin, emoji, teaser (dynamic font), title strip (handwritten font)
- Back: classification header, briefing text on ruled-line paper
- CSS 3D flip on click (500ms transition)
- Keyboard accessible (Enter, Space)
- Framer Motion spring entrance + hover scale
- Responsive sizing: 150px mobile, 200px desktop

### RedString.tsx
- SVG quadratic Bezier path with sag effect
- Stroke-dash animation (dashoffset transition)
- Delay-based visibility (setTimeout, not Framer Motion)
- Uses CSS variable `--color-string-red`

### CaseFileStamp.tsx
- Classification level in red-bordered box
- Case file number below
- Spring entrance animation (scale 1.5→1, rotate -12deg)
- Positioned absolute bottom-right, pointer-events-none

### ErrorScreen.tsx
- Random error variant per render (3 styles: redacted, flickering, classified)
- Style-specific animations (stamp slam, opacity flicker, or static)
- Themed error message
- Retry button → returns to landing

### App.tsx
- 4-state machine: landing → loading → board | error
- AbortController for canceling in-flight requests
- Preserves last inputs for retry
- AnimatePresence for screen transitions

## Shared Utilities

### layout.ts
- `calculateCardPositions()`: zigzag (desktop) or vertical (mobile) card placement
- `getPinPosition()`: card center-top for string endpoints
- `generateStringPath()`: quadratic Bezier with gravity sag
- Seeded PRNG for deterministic random jitter

### fonts.ts
- `FONT_MAP`: category → CSS font-family string
- `FONT_CLASS_MAP`: category → Tailwind class name
- `getFontFamily()` / `getFontClass()`: lookup with fallback to `chaotic`

### constants.ts
- `EXAMPLE_PAIRS`: 5 concept pairs for chips
- `LOADING_MESSAGES` / `SLOW_LOADING_MESSAGES`: status text arrays
- Timing constants for loading phases and reveal sequence

## Not Implemented (P2)

| Feature | ID | Notes |
|---------|------|-------|
| Share/screenshot export | F-017 | html2canvas for image export, clipboard for text |
| Sound effects | F-018 | Howler.js: pin-drop, string-stretch, paper-flip, typewriter |
| RevealSequence component | — | Planned but absorbed into Corkboard.tsx |
| SoundToggle component | — | Planned for F-018, not built |
| Shadcn/UI components | — | Planned but custom HTML used instead |
| public/ directory | — | Cork texture done via CSS, no image assets |
