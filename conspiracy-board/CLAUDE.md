# Conspiracy Board — AI Codebase Guide

A comedic, AI-powered single-page web app that generates elaborate conspiracy theories connecting any two unrelated concepts, displayed on an interactive animated corkboard with Polaroid-style cards, red string animations, and deadpan investigative-journalist prose. Desktop-first, no auth, no database, fully ephemeral.

## Workflow Rules

- **Always deploy after changes**: Push to `main` on GitHub; Netlify auto-deploys. Verify the deploy preview before merging PRs.
- **Content safety is non-negotiable**: Every change touching AI output, input handling, or user-facing text must respect the 3-layer safety system (input blocklist, system prompt constraints, Claude's built-in safety).
- **No partial boards**: The board either renders completely or shows a themed error. Never render a half-built conspiracy chain.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Shadcn/UI |
| Animation | Framer Motion (reveal sequence, transitions, hover), CSS 3D transforms (card flip), SVG stroke-dash (red strings) |
| Backend | Netlify Functions (single serverless function as Claude API proxy) |
| Database | None — fully ephemeral, no persistence |
| Storage | None |
| Auth | None |
| AI — Text | Anthropic Claude Sonnet (via Netlify Function proxy) |
| AI — Images | None — emoji + dynamic fonts replace generated images |
| External APIs | Claude API only |
| Icons | TODO: Lucide React or similar (if needed) |
| Fonts | Google Fonts (12+ fonts: typewriter, handwritten, 9 dynamic mood fonts, sans-serif) |
| CSS Utility | Tailwind CSS (clsx + tailwind-merge via cn() helper from Shadcn) |
| Testing | TODO: Vitest (not in initial scope per PRD, but recommended) |

## Project Structure

```
conspiracy-board/
├── public/
│   ├── cork-texture.jpg              # Corkboard background texture
│   └── sounds/                       # Optional sound effect files (P2)
├── src/
│   ├── components/
│   │   ├── ui/                       # Shadcn/UI components (Input, Button, Toggle, Tooltip)
│   │   ├── LandingScreen.tsx         # Dark input screen with fields, chips, submit
│   │   ├── LoadingScreen.tsx         # CLASSIFIED stamps, redacted text, flickering messages
│   │   ├── Corkboard.tsx            # Board container, layout engine
│   │   ├── PolaroidCard.tsx         # Individual Polaroid with flip interaction
│   │   ├── RedString.tsx            # SVG Bezier path with stroke-dash animation
│   │   ├── RevealSequence.tsx       # Animation orchestrator (6-10s timeline)
│   │   ├── CaseFileStamp.tsx        # Decorative stamp flourish (P2)
│   │   ├── ErrorScreen.tsx          # Themed error states with retry
│   │   └── SoundToggle.tsx          # Mute/unmute button (P2)
│   ├── lib/
│   │   ├── api.ts                   # Client-side fetch to /api/generate
│   │   ├── fonts.ts                 # font_category -> Google Font mapping
│   │   ├── layout.ts               # Card position calculation (zigzag algorithm)
│   │   ├── blocklist.ts            # Input blocklist (client-side pre-check)
│   │   └── sound.ts                # Sound manager / Howler.js wrapper (P2)
│   ├── types/
│   │   └── conspiracy.ts           # TypeScript types for chain data structure
│   ├── App.tsx                      # Root component, 3-state machine (input -> loading -> board)
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles, Tailwind directives, font imports
├── netlify/
│   └── functions/
│       └── generate.ts              # Claude API proxy: validate input, call API, validate response
├── PRD.md/                          # Product requirements (5 documents)
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── package.json
└── netlify.toml                     # Build config: npm run build, dist, netlify/functions
```

## Build & Run Commands

```bash
# Install dependencies
npm install

# Local development (Vite dev server)
npm run dev

# Local dev with Netlify Functions
npx netlify dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit

# Deploy (automatic on push to main via Netlify)
git push origin main
```

## Environment Variables

### Backend — Secrets (Netlify dashboard)
- `ANTHROPIC_API_KEY` — Claude API key (never exposed to client)

### Frontend
- None required — all config is compile-time

### Backend — Local Dev
- `ANTHROPIC_API_KEY` — set in `.env` file (gitignored) or via `netlify env:set`

## Key Architectural Rules

### Frontend

- **Path alias**: `@/` maps to `src/`
- **CSS framework**: Tailwind CSS (check version — v4 uses `@theme` in CSS, not `tailwind.config.js`)
- **Theme**: Two distinct modes — dark landing page (near-black) and warm corkboard (cork-brown). NOT a toggle; each screen has its own palette.
- **State management**: React built-in only (useState, useReducer). No Zustand/Redux — app has only 3 states and 1 data object.
- **Routing**: None — single-page with state-driven views (landing -> loading -> board)
- **Sensitive operations**: `ANTHROPIC_API_KEY` stays server-side in Netlify Function. Client never touches it.
- **Font loading**: All 12+ Google Fonts preloaded during landing page idle time. No font-swap flicker during board reveal.

### Backend

- **Single endpoint**: `POST /api/generate` — the only server-side route
- **Init order**: Receive inputs -> blocklist validation -> construct Claude prompt -> call API -> validate JSON response structure -> return to client
- **Secrets management**: Netlify environment variables, accessed via `process.env.ANTHROPIC_API_KEY`
- **Response validation**: JSON must parse, chain array must have exactly 7 items, every item must have title/emoji/font_category/teaser/briefing, font_category must be from approved list
- **Spending/rate limits**: None for MVP. Claude Sonnet at ~$0.003-0.008 per generation.
- **Error responses**: Return appropriate HTTP status + themed error message, never leak API errors to client

## Conventions

- **Imports**: Use `@/` alias with TypeScript path mapping
- **Types**: API response types in `src/types/conspiracy.ts`, shared between client and function
- **Components**: Named exports, one component per file, page-level components in `src/components/`
- **UI primitives**: Use Shadcn/UI for Input, Button, Toggle, Tooltip. Everything else (Polaroid, corkboard, strings) is fully custom.
- **Animation**: Framer Motion for orchestrated sequences and transitions. Raw CSS for 3D flip. Raw SVG for string drawing.
- **Timestamps**: Not applicable (no database)

## Design System Standards

> Do NOT deviate from these values when writing new UI or editing existing UI.

### Colors — Semantic Usage

| Semantic | Token | Usage |
|----------|-------|-------|
| Cork background | warm browns/tans | Corkboard viewport fill |
| Polaroid frame | white (#FFFFFF) | Card border, thick bottom strip |
| Polaroid photo area | warm cream/aged yellow | Card interior (not pure white) |
| String | deep red (~#8B1A1A) | Yarn-like connecting strings (not neon) |
| Pin heads | red or gold | Push pin at top of each Polaroid |
| Landing background | near-black | Dark detective office aesthetic |
| Landing accents | red, typewriter ink | Headlines, stamps, emphasis |
| Text (cards) | dark, near-black | Card titles and briefing text |
| Text (landing) | white/off-white | Light text on dark background |
| Error/stamp | red | CLASSIFIED, REDACTED stamps |

### Border Radius

| Context | Class |
|---------|-------|
| Polaroid cards | None (sharp corners — real Polaroids) |
| Buttons, inputs | `rounded-lg` |
| Chips | `rounded-full` |

### Typography Strategy (4 layers)

| Layer | Font | Usage |
|-------|------|-------|
| UI chrome / landing | Special Elite or Courier Prime (monospaced/typewriter) | Headlines, stamps, buttons, labels |
| Polaroid title strip | Caveat or Indie Flower (handwritten) | Bottom strip of every card — consistent |
| Polaroid photo area | Dynamic per card (9 categories) | Mood-matched font chosen by AI |
| Briefing text (card back) | Inter or system sans-serif | Readable paragraphs on flipped cards |

### Dynamic Font Categories

| Category | Style | Example Font |
|----------|-------|-------------|
| horror | Heavy blackletter, dripping | Creepster, Nosifer |
| corporate | Cold geometric sans-serif | Orbitron, Rajdhani |
| ancient | Classical serif | Cinzel, IM Fell English |
| chaotic | Messy handwriting | Permanent Marker, Rock Salt |
| scientific | Monospaced/technical | Source Code Pro, IBM Plex Mono |
| military | Stencil | Black Ops One |
| mystical | Ornate decorative script | MedievalSharp, Uncial Antiqua |
| retro | Vintage display | Bungee, Righteous |
| underground | Grungy, punk-style | Rubik Glitch, Monoton |

### Spacing

| Tier | Value | Usage |
|------|-------|-------|
| Tight | `gap-1` | Icon+text inline |
| Standard | `gap-2` | Default element groups |
| Comfortable | `gap-3` | Card sections, form fields |
| Spacious | `gap-6` | Page sections |

### Padding

| Context | Class |
|---------|-------|
| Card inner sections | `p-4` |
| Page containers | `p-6` |

## Accessibility Standards

### Interactive Elements
Any non-interactive element with onClick must also have:
`role="button"` `tabIndex={0}`
`onKeyDown` handler for Enter and Space
`focus-visible` outline styling

### Icon-Only Buttons
Must have `aria-label`

### Images
Cork texture and decorative elements: `alt=""`

## Data Model

No database. The only data structure is the API response:

```typescript
interface ConspiracyChain {
  chain: ConspiracyNode[];        // Exactly 7 items
  case_file_number: string;       // e.g., "CASE FILE #4471-B"
  classification_level: string;   // e.g., "TOP SECRET", "EYES ONLY"
}

interface ConspiracyNode {
  title: string;                  // 2-5 words, Polaroid bottom strip
  emoji: string;                  // Single emoji, Polaroid photo area
  font_category: FontCategory;    // One of 9 approved categories
  teaser: string;                 // One sentence summary
  briefing: string;               // 2-3 paragraphs, shown on card back
}

type FontCategory =
  | "horror" | "corporate" | "ancient" | "chaotic" | "scientific"
  | "military" | "mystical" | "retro" | "underground";
```

## Auth & Roles

- No authentication
- No user accounts
- No roles
- API key secured server-side in Netlify Function

## Core Workflow

1. User lands on dark input screen, types two concepts (or taps example chip)
2. Client validates inputs (non-empty, different words, not blocklisted)
3. Client POSTs to `/api/generate` with both concepts
4. Netlify Function validates inputs server-side, calls Claude API with system prompt
5. Claude returns structured JSON (7 nodes with titles, emojis, fonts, briefings)
6. Function validates response structure, returns to client
7. Loading screen transitions to corkboard
8. Board reveal auto-animates: cards drop in, strings draw (6-10 seconds)
9. User explores by flipping Polaroids to read briefings
10. User taps "New Investigation" to restart

## Common Recipes

### Adding a New Font Category
1. Add category to `FontCategory` type in `src/types/conspiracy.ts`
2. Add font mapping in `src/lib/fonts.ts`
3. Add Google Font `<link>` to HTML head
4. Update system prompt in `netlify/functions/generate.ts` to include new category
5. Update validation in the function to accept the new category

### Adding a New Example Chip
1. Add pair to the examples array in `src/components/LandingScreen.tsx`
2. Keep to 4-6 total chips — don't overcrowd

### Modifying the System Prompt
1. Edit `netlify/functions/generate.ts`
2. Test with diverse input pairs to verify tone, structure, and safety
3. Validate that JSON output still matches `ConspiracyChain` type

## What's Not Yet Implemented

All P0 and P1 features are implemented. Remaining P2 items:

- **F-017 Share/Screenshot Export**: Image export (html2canvas), text-to-clipboard
- **F-018 Sound Effects**: Pin-drop, string-stretch, paper-flip, typewriter-click (Howler.js)
- **F-019 Case File Stamp**: DONE (implemented in CaseFileStamp.tsx)

### Deployment
- Netlify site needs to be created and linked
- `ANTHROPIC_API_KEY` must be set in Netlify environment variables

## Documentation Hierarchy

When you learn something worth preserving, put it in the right place:

| Layer | Loaded | What goes here |
|-------|--------|---------------|
| **CLAUDE.md** (this file) | Every conversation | Rules/constraints that prevent mistakes on ANY task |
| **Auto-memory MEMORY.md** | Every conversation | Cross-cutting patterns and pitfalls learned across sessions |
| **Sub-memory files** (.claude/memory/) | On demand, by topic | Feature-specific deep dives — see topic table below |
| **Inline code comments** | When code is read | Non-obvious "why" explanations, right next to the code |

**Rule of thumb**: If it prevents mistakes on unrelated tasks -> CLAUDE.md. If it's a pattern/pitfall that spans features -> auto-memory. If it's only relevant when working on one feature -> sub-memory file. If it explains a single non-obvious line -> inline comment.

**Updating docs**: When you change code that affects a rule in CLAUDE.md, update CLAUDE.md. When you change a feature covered by a sub-memory file, update that file. If a new feature area doesn't fit any existing file, create a new one and add it to the table below.

### Sub-Memory Files — Load When Working On

| File | When to load |
|------|-------------|
| No topic files yet — create as patterns emerge during development |
