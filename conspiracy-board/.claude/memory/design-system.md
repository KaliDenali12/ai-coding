# Design System

## Color Tokens (index.css @theme)
```css
--color-cork: #b8956a        /* Board background */
--color-cork-dark: #8b6f47   /* Gradient accents */
--color-cork-light: #d4b896  /* Gradient accents */
--color-string-red: #8B1A1A  /* Yarn strings */
--color-polaroid-cream: #f5f0e1  /* Card photo area */
--color-landing-bg: #0a0a0a  /* Dark screens */
--color-landing-accent: #c0392b  /* Red UI accents */
```

## Font Stack (12 Google Fonts)
All loaded in `index.html` `<link>` tag. CSS variables in `@theme`:

| Variable | Font | Weight | Usage |
|----------|------|--------|-------|
| `--font-typewriter` | Special Elite | — | UI chrome, stamps, buttons |
| `--font-handwritten` | Caveat | 400, 700 | Card title strips |
| `--font-body` | Inter | 400, 500, 600 | Briefing text, body |
| `--font-horror` | Creepster | — | Dynamic: sinister nodes |
| `--font-corporate` | Orbitron | 500 | Dynamic: bureaucratic nodes |
| `--font-ancient` | Cinzel | 700 | Dynamic: historical nodes |
| `--font-chaotic` | Permanent Marker | — | Dynamic: unhinged nodes |
| `--font-scientific` | Source Code Pro | 500 | Dynamic: academic nodes |
| `--font-military` | Black Ops One | — | Dynamic: classified nodes |
| `--font-mystical` | MedievalSharp | — | Dynamic: occult nodes |
| `--font-retro` | Righteous | — | Dynamic: nostalgic nodes |
| `--font-underground` | Rubik Glitch | — | Dynamic: punk nodes |

### Font Class Mapping (src/lib/fonts.ts)
`FONT_CLASS_MAP` maps category → CSS class name (e.g., `horror` → `font-horror`).
`FONT_MAP` maps category → CSS font-family string (e.g., `"'Creepster', cursive"`).

## Corkboard Texture (CSS only)
No image files. `.cork-bg` class uses:
- `background-color: var(--color-cork)`
- Three overlapping `radial-gradient` for depth

`.cork-vignette::after` adds dark radial edge shadow.

## Polaroid Card Anatomy
```
┌──────────────────┐  ← White frame (bg-white, no border-radius)
│    [Push Pin]     │  ← Red circle, positioned -top-3
│ ┌──────────────┐ │
│ │  🎭 emoji    │ │  ← bg-polaroid-cream, aspect-square
│ │  teaser text │ │  ← Dynamic font per category
│ └──────────────┘ │
│    Title Strip    │  ← font-handwritten (Caveat)
└──────────────────┘
```
Back: `bg-amber-50`, faint ruled lines (CSS gradient), briefing in `font-body`

## Responsive Breakpoints
- Mobile: `< 768px` → card 150×210px, vertical flow, `padding: 20px`
- Desktop: `≥ 768px` → card 200×280px, horizontal zigzag, `padding: 40px`
- Tailwind responsive: `md:` prefix for desktop overrides

## CSS Classes (index.css)
| Class | Purpose |
|-------|---------|
| `.perspective` | `perspective: 1000px` for 3D flip |
| `.preserve-3d` | `transform-style: preserve-3d` |
| `.backface-hidden` | `backface-visibility: hidden` |
| `.cork-bg` | Cork texture via gradients |
| `.cork-vignette` | Dark edge vignette |
| `.animate-stamp` | CLASSIFIED stamp slam keyframe |
| `.animate-draw-string` | SVG stroke drawing keyframe |
