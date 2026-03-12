# Design System — As-Built Reference

> Auto-generated from codebase audit on 2026-03-12. Documents what currently exists, not aspirational values.

## Color Palette

### Custom Theme Colors (defined in `index.css` `@theme`)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-cork` | `#b8956a` | Corkboard background |
| `--color-string-red` | `#8B1A1A` | Red yarn connecting strings (SVG stroke) |
| `--color-polaroid-cream` | `#f5f0e1` | Card front photo area |
| `--color-landing-bg` | `#0a0a0a` | Dark screens (landing, loading, error) |
| `--color-landing-accent` | `#c0392b` | Red accents, buttons, stamps |

### Tailwind Standard Colors In Use

| Color | Classes Used | Where |
|-------|-------------|-------|
| `white` | `text-white`, `bg-white`, `border-white/20` | Text on dark screens, card frames |
| `white/5` | `bg-white/5` | Input field backgrounds (subtle glass effect) |
| `white/20` | `bg-white/20`, `border-white/20` | Redacted lines, input/chip borders |
| `white/30` | `placeholder:text-white/30` | Input placeholder text |
| `white/40` | `text-white/40` | `+` separator between inputs |
| `white/60` | `text-white/60` | Example chip default text |
| `white/70` | `text-white/70` | Loading/error messages |
| `white/80` | `text-white/80` | Error heading (classified style) |
| `gray-800` | `text-gray-800` | Card teaser + briefing text |
| `gray-900` | `text-gray-900` | Card title text |
| `red-400` | `bg-red-400` | Push pin highlight dot |
| `red-700` | `bg-red-700` | Push pin body |
| `red-800` | `text-red-800` | Briefing classified label |
| `red-900` | `border-red-900` | Push pin border |
| `amber-50` | `bg-amber-50` | Card back face background |

### Hardcoded Colors (not in theme)

| Value | Where | Notes |
|-------|-------|-------|
| `#999` | PolaroidCard.tsx:90 | Ruled line pattern on card back |
| `rgba(139, 111, 71, 0.3)` | index.css:55 | Cork texture gradient |
| `rgba(212, 184, 150, 0.2)` | index.css:56 | Cork texture gradient |
| `rgba(139, 111, 71, 0.2)` | index.css:57 | Cork texture gradient |
| `rgba(0, 0, 0, 0.3)` | index.css:66 | Vignette effect |

### Two-Palette System

| Context | Background | Text | Accent |
|---------|-----------|------|--------|
| Dark screens (landing/loading/error) | `bg-landing-bg` (#0a0a0a) | `text-white` + opacity variants | `landing-accent` (#c0392b) |
| Corkboard | `cork-bg` (#b8956a) | `text-gray-800`/`900` on cards | `string-red` (#8B1A1A) |

### Deviation: Card Back vs Front Cream

- **Front face**: `bg-polaroid-cream` (#f5f0e1) — custom theme color
- **Back face**: `bg-amber-50` (#fffbeb) — Tailwind default, slightly warmer/yellower

---

## Typography

### Font Stack (12 Google Fonts loaded in `index.html`)

| Variable | Font | Fallback | Role |
|----------|------|----------|------|
| `--font-typewriter` | Special Elite | monospace | UI text, headings, stamps, buttons |
| `--font-handwritten` | Caveat | cursive | Card title strip |
| `--font-body` | Inter | sans-serif | Body text, briefings, inputs |
| `--font-horror` | Creepster | cursive | AI-assigned card category |
| `--font-corporate` | Orbitron | sans-serif | AI-assigned card category |
| `--font-ancient` | Cinzel | serif | AI-assigned card category |
| `--font-chaotic` | Permanent Marker | cursive | AI-assigned card category |
| `--font-scientific` | Source Code Pro | monospace | AI-assigned card category |
| `--font-military` | Black Ops One | system-ui | AI-assigned card category |
| `--font-mystical` | MedievalSharp | cursive | AI-assigned card category |
| `--font-retro` | Righteous | sans-serif | AI-assigned card category |
| `--font-underground` | Rubik Glitch | system-ui | AI-assigned card category |

### Type Scale In Use

| Class | Approximate Size | Where Used |
|-------|-----------------|------------|
| `text-xs` | 12px | Briefing label, case file number (mobile) |
| `text-sm` | 14px | Subtitles, error messages (mobile), chips, card teaser, briefing text, validation messages |
| `text-base` | 16px | Subtitles (md:), loading messages (md:) |
| `text-lg` | 18px | Inputs, buttons, card titles, stamp classification, error buttons |
| `text-2xl` | 24px | Stamp classification (md:) |
| `text-3xl` | 30px | Error headings (mobile) |
| `text-4xl` | 36px | Main heading (mobile), error stamp heading (mobile) |
| `text-5xl` | 48px | Card emoji, CLASSIFIED stamp (mobile) |
| `text-6xl` | 60px | Main heading (md:), error stamp heading (md:) |
| `text-7xl` | 72px | CLASSIFIED stamp (md:) |

**Distinct sizes used**: 10 (text-xs through text-7xl). This is above the 6-8 guideline but spans two very different contexts (dark screens vs. cards) so it's reasonable.

### Font Assignment Rules

| Context | Font |
|---------|------|
| Headlines, buttons, stamps, labels | `font-typewriter` (Special Elite) |
| Card title strip | `font-handwritten` (Caveat) |
| Card teaser (photo area) | Dynamic per AI-assigned `font_category` |
| Card briefing, input fields | `font-body` (Inter) |

---

## Spacing System

### Padding Scale In Use

| Class | Value | Usage |
|-------|-------|-------|
| `py-1` | 4px | Stamp classification box |
| `py-2` | 8px | Card title strip, stamp, example chips |
| `py-2.5` | 10px | New Investigation button |
| `py-3` | 12px | Inputs, submit/retry buttons |
| `px-3` | 12px | Card title strip, stamp classification |
| `px-4` | 16px | Page containers (mobile), inputs, card photo area, card back, chips |
| `px-6` | 24px | Stamps |
| `px-8` | 32px | Buttons |
| `p-4` | 16px | Card photo area, card back |

### Margin Scale In Use

| Class | Value | Usage |
|-------|-------|-------|
| `mb-0` | 0px | Card photo area (override) |
| `mb-1` | 4px | Stamp classification box |
| `mb-2` | 8px | Emoji, error heading, briefing label |
| `m-2` | 8px | Card photo area outer margin |
| `mb-6` | 24px | Input container |
| `mb-8` | 32px | Headings, error messages, error stamp |
| `mb-10` | 40px | Subtitle, CLASSIFIED stamp |
| `mt-4` | 16px | Blinking cursor |
| `-top-3` | -12px | Push pin offset |

### Gap Scale In Use

| Class | Value | Usage |
|-------|-------|-------|
| `gap-2` | 8px | Redacted lines, example chips, error redacted bars |
| `gap-4` | 16px | Input row |

### Position Offsets

| Class | Value | Usage |
|-------|-------|-------|
| `bottom-4 right-4` | 16px | Stamp position (mobile) |
| `bottom-8 right-8` | 32px | Stamp position (desktop) |
| `bottom-4` | 16px | New Investigation button |

**Base unit analysis**: Values cluster around multiples of 4px (4, 8, 12, 16, 24, 32, 40). The 10px (`py-2.5`) is the sole outlier. System is largely 4px-based.

---

## Border Radius

| Class | Value | Usage |
|-------|-------|-------|
| None (sharp corners) | 0px | — (no elements explicitly unrounded) |
| `rounded-sm` | 2px | Card faces (front + back), redacted line bars |
| `rounded-lg` | 8px | Buttons, inputs |
| `rounded-full` | 9999px | Example chips, push pin circles |

**System is consistent**: Cards = `rounded-sm`, interactive controls = `rounded-lg`, pills = `rounded-full`.

---

## Shadows

| Class | Where |
|-------|-------|
| `shadow-md` | Push pin |
| `shadow-lg` | Card front face, card back face, New Investigation button |

Only 2 shadow levels used. Consistent.

---

## Z-Index Layers

| Class | Value | Usage |
|-------|-------|-------|
| `z-0` | 0 | SVG string layer |
| `z-10` | 10 | Push pin, card containers |
| `z-20` | 20 | Case file stamp |
| `z-30` | 30 | New Investigation button |
| `z-50` | 50 | Hovered card (via Framer Motion whileHover) |

**Clear layering**: strings → cards → stamp → button → hovered card.

---

## Transitions

| Class/Property | Duration | Usage |
|----------------|----------|-------|
| `transition-colors` | 150ms (default) | Inputs, retry button |
| `transition-all` | 150ms (default) | Submit button, chips, New Investigation button |
| `transition-transform duration-500` | 500ms | Card 3D flip |
| `stroke-dashoffset ${duration}ms` | 800ms | Red string draw animation |
| Framer Motion spring | ~500ms | Card entrance |
| Framer Motion | 400ms | Page transitions (opacity) |
| `stamp-slam` keyframe | 400ms | CLASSIFIED stamp |

---

## Breakpoints

| Breakpoint | Value | Usage |
|-----------|-------|-------|
| `md:` | 768px | Responsive typography, input layout (col→row), card sizes, stamp positioning |

**Single breakpoint system**: Only `md:` (768px) is used throughout. Mobile (<768px) vs desktop (≥768px).

---

## Card Dimensions

| Viewport | Width | Height |
|----------|-------|--------|
| Mobile (<768px) | 150px | 210px |
| Desktop (≥768px) | 200px | 280px |

Defined in both `PolaroidCard.tsx` (CSS classes) and `Corkboard.tsx` (layout calculation). Must be updated in both.

---

## Custom CSS Classes

| Class | File | Purpose |
|-------|------|---------|
| `.cork-bg` | index.css:52 | Cork texture (multi-layer radial gradients) |
| `.cork-vignette` | index.css:61 | Dark edge vignette (::after pseudo-element) |
| `.animate-stamp` | index.css:85 | CLASSIFIED stamp slam animation |
| `.perspective` | index.css:39 | `perspective: 1000px` for 3D flip |
| `.preserve-3d` | index.css:43 | `transform-style: preserve-3d` |
| `.backface-hidden` | index.css:47 | `backface-visibility: hidden` |

---

## Deviations From Dominant Patterns

| Deviation | Expected | Actual | File:Line |
|-----------|----------|--------|-----------|
| Card back background | `bg-polaroid-cream` | `bg-amber-50` | PolaroidCard.tsx:82 |
| Button vertical padding | `py-3` (12px, dominant) | `py-2.5` (10px) | Corkboard.tsx:202 |
| Stamp vertical padding | `py-3` (buttons) | `py-2` (8px) | LoadingScreen.tsx:78 |
| Push pin colors | Theme colors | Tailwind `red-700`/`400`/`900` | PolaroidCard.tsx:55-56 |
| Ruled line color | Theme or Tailwind class | Hardcoded `#999` | PolaroidCard.tsx:90 |
