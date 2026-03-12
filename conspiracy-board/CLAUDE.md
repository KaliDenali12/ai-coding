# Conspiracy Board — AI Codebase Guide

Comedic AI-powered SPA: user enters two concepts, Claude generates a 7-node conspiracy chain, displayed on an animated corkboard with Polaroid cards and red string. Desktop-first, no auth, no database, fully ephemeral.

## Workflow Rules

- **Always deploy after changes**: Push to `main` on GitHub; Netlify auto-deploys.
- **Content safety is non-negotiable**: 3-layer safety (client blocklist, server blocklist, Claude system prompt). Every change touching AI output or user input must respect all three.
- **No partial boards**: Board renders completely or shows a themed error. Never render a half-built chain.
- **Run tests before committing**: `npm test` (279+ tests, all must pass).

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React, TypeScript, Vite | 19, 5.9, 7.3 |
| Styling | Tailwind CSS v4 | 4.x (`@theme` in CSS, no config file) |
| Animation | Framer Motion + CSS 3D + SVG stroke-dash | 12.x |
| Backend | Netlify Functions (single serverless endpoint) | — |
| AI | Anthropic Claude Sonnet via `@anthropic-ai/sdk` | 0.78 |
| Testing | Vitest + Testing Library + jsdom | 3.x + 28.x |
| Linting | ESLint + typescript-eslint + React hooks/refresh | 9.x (flat config) |

## Project Structure

```
conspiracy-board/
├── src/
│   ├── components/
│   │   ├── LandingScreen.tsx      # Dark input screen, example chips, validation
│   │   ├── LoadingScreen.tsx      # CLASSIFIED stamp, redacted lines, timeout
│   │   ├── Corkboard.tsx          # Board container, layout, reveal orchestration
│   │   ├── PolaroidCard.tsx       # Card with 3D flip (front: emoji+teaser, back: briefing)
│   │   ├── RedString.tsx          # SVG path with stroke-dash animation
│   │   ├── CaseFileStamp.tsx      # Classification stamp overlay
│   │   ├── ErrorScreen.tsx        # Themed error with retry
│   │   ├── ErrorBoundary.tsx     # React Error Boundary — catches render crashes, shows ErrorScreen
│   │   └── __tests__/             # Component tests (one per component)
│   ├── lib/
│   │   ├── api.ts                 # Client fetch + response validation
│   │   ├── fonts.ts               # FontCategory → CSS font-family mapping
│   │   ├── layout.ts              # Card positioning (zigzag + seeded random)
│   │   ├── blocklist.ts           # Client-side input blocklist
│   │   ├── constants.ts           # Example pairs, loading messages, timing values
│   │   └── __tests__/             # Lib tests
│   ├── types/
│   │   └── conspiracy.ts          # ConspiracyChain, ConspiracyNode, FontCategory, GenerateRequest
│   ├── test/
│   │   └── setup.ts               # Vitest setup: jest-dom + SVG polyfill
│   ├── App.tsx                    # Root: 4-state machine (landing → loading → board | error)
│   ├── main.tsx                   # Entry point (StrictMode + ErrorBoundary)
│   └── index.css                  # Tailwind @theme, custom CSS classes
├── netlify/
│   └── functions/
│       ├── generate.ts            # Claude API proxy: validate → prompt → call → validate → respond
│       └── __tests__/generate.test.ts
├── .github/
│   └── dependabot.yml             # Weekly npm dependency update PRs
├── PRD.md/                        # Product requirements (5 docs, reference only)
├── index.html                     # Google Fonts preload (12 fonts)
├── eslint.config.js               # ESLint 9 flat config (React + TS + hooks)
├── vite.config.ts                 # React + Tailwind plugins, @/ alias
├── vitest.config.ts               # jsdom, globals, setup file
├── netlify.toml                   # Build + redirect /api/* → functions
└── package.json
```

## Build & Run Commands

```bash
npm install                # Install dependencies
npm run dev                # Vite dev server (port 5173)
npx netlify dev            # Dev with Netlify Functions
npm run build              # tsc -b && vite build → dist/
npm run lint               # eslint (flat config, must pass)
npm test                   # vitest run (276+ tests)
npm run test:watch         # vitest watch mode
npx tsc --noEmit           # Type check only
```

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Netlify dashboard / `.env` local | Claude API key (never client-side) |
| `ANTHROPIC_TIMEOUT_MS` | Netlify dashboard / `.env` local | SDK timeout in ms (default 25000). Optional. |

## Architectural Rules

### Frontend
- **Path alias**: `@/` → `src/` (configured in vite, vitest, and tsconfig)
- **Tailwind v4**: Uses `@theme` block in `index.css`. No `tailwind.config.ts` exists.
- **State**: React built-in only (`useState`, `useCallback`, `useRef`). No external state libs.
- **Routing**: None. Single page with state-driven views.
- **Screens**: 4 states — `landing | loading | board | error`. Transitions via `AnimatePresence`.
- **No Shadcn/UI components**: Despite early plans, all UI is custom HTML + Tailwind.
- **Fonts**: 12 Google Fonts loaded via `<link>` in `index.html`. Custom CSS classes defined in `@theme`.

### Backend
- **Single endpoint**: `POST /.netlify/functions/generate` (redirected from `/api/generate`)
- **Flow**: Rate limit check → validate inputs → server-side blocklist → construct Claude prompt → call API → validate JSON → return
- **Rate limiting**: Per-IP, 20 requests per 15-minute window. In-memory (resets on cold start). Extracts IP from `x-nf-client-connection-ip` or `x-forwarded-for`. Returns 429 with themed message. `_resetRateLimiter()` exported for test isolation.
- **Anthropic SDK**: Uses `new Anthropic({ timeout: 25_000 })` — reads `ANTHROPIC_API_KEY` from env automatically. Timeout is configurable via `ANTHROPIC_TIMEOUT_MS` env var (default 25s). SDK default of 10 minutes is too long for serverless.
- **Prompt caching**: System prompt uses `cache_control: { type: 'ephemeral' }` for Anthropic prompt caching (90% input token discount on cache hits)
- **Model**: `claude-sonnet-4-20250514` with `max_tokens: 4000`
- **Response validation**: Chain must have exactly 7 items, each with title/emoji/font_category/teaser/briefing. Length limits enforced: title ≤ 100, emoji ≤ 20, teaser ≤ 500, briefing ≤ 5000 chars (both server and client validators).
- **Request size limit**: 10KB enforced by reading actual body (`request.text()`) — not the Content-Length header
- **Error responses**: Themed messages, never leak raw API errors. Anthropic SDK errors are classified: timeout → 504, rate limit → 503, auth → 500 with CRITICAL log, validation → 502, other → 500.
- **Function timeout**: Set to 26s in `netlify.toml` `[functions]` block (Netlify default is 10s, too tight for Anthropic calls).

### Content Safety (3 Layers)
1. **Client blocklist** (`src/lib/blocklist.ts`): Normalizes input (leet-speak substitution), checks against blocked terms
2. **Server blocklist** (`netlify/functions/generate.ts`): Duplicated blocklist for server-side enforcement
3. **System prompt**: Explicit safety rules in Claude prompt (no real politics, no real tragedies, no hate speech)

> **Pitfall**: Blocklist is duplicated between client and server. Changes must be made in BOTH files.

## Data Model

No database. Single API response type — see `src/types/conspiracy.ts`:
- `ConspiracyChain`: 7-item chain + case file number + classification level
- `ConspiracyNode`: title, emoji, font_category, teaser, briefing
- `FontCategory`: 9 values — `horror | corporate | ancient | chaotic | scientific | military | mystical | retro | underground`
- Chain is exactly 7 items: concept A → 5 intermediate steps → concept B

## Conventions

- **Imports**: `@/` alias. Include `.ts`/`.tsx` extension in import paths.
- **Components**: Named exports, one per file, in `src/components/`
- **Tests**: Co-located in `__tests__/` dirs. One test file per source file. `data-testid` on all interactive elements.
- **Animation**: Framer Motion for orchestrated reveals/transitions. Raw CSS for 3D card flip. Raw SVG for string drawing.
- **Naming**: PascalCase components, camelCase functions/variables, SCREAMING_SNAKE constants.

## Design System (Do NOT Deviate)

### Colors (defined in `index.css` `@theme`)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-cork` | `#b8956a` | Corkboard background |
| `--color-string-red` | `#8B1A1A` | Yarn-like connecting strings |
| `--color-polaroid-cream` | `#f5f0e1` | Card photo area |
| `--color-landing-bg` | `#0a0a0a` | Dark landing/error screens |
| `--color-landing-accent` | `#c0392b` | Red accents, stamps, buttons |

### Typography (4 layers)
| Layer | Font Variable | Usage |
|-------|--------------|-------|
| UI / landing | `--font-typewriter` (Special Elite) | Headlines, stamps, buttons |
| Card titles | `--font-handwritten` (Caveat) | Bottom strip of Polaroids |
| Card photo area | Dynamic per category (9 fonts) | Mood-matched by AI |
| Briefing text | `--font-body` (Inter) | Readable paragraphs on card backs |

### Border Radius
| Context | Style |
|---------|-------|
| Polaroid cards | None (sharp corners) |
| Buttons, inputs | `rounded-lg` |
| Chips | `rounded-full` |

### Spacing
| Tier | Value | Usage |
|------|-------|-------|
| Tight | `gap-1` | Icon+text inline |
| Standard | `gap-2` | Default element groups |
| Comfortable | `gap-3` / `gap-4` | Card sections, form fields |
| Spacious | `gap-6` | Page sections |

### Padding
| Context | Class |
|---------|-------|
| Card inner sections | `p-4` |
| Page containers | `p-6` / `px-4` (mobile) |

### Two Palettes (NOT a toggle)
- **Landing / Loading / Error screens**: `bg-landing-bg` (near-black), white text, red accents
- **Corkboard**: `cork-bg` class (warm browns), white card frames, dark text

## Accessibility

- Non-interactive elements with `onClick`: add `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter + Space)
- Icon-only buttons: `aria-label` required
- Decorative elements: `alt=""` or `aria-hidden`
- Error messages: `role="alert"` for screen reader announcement (already on ErrorScreen + LandingScreen)

## Key Pitfalls

- **Tailwind v4**: No `tailwind.config.ts`. Colors/fonts defined in `@theme` block in `index.css`. Don't create a config file.
- **Blocklist duplication**: `src/lib/blocklist.ts` and `netlify/functions/generate.ts` have separate copies. Update BOTH.
- **Validation message divergence (intentional)**: Client `checkInputs()` uses themed messages ("Both fields are required.", "You can't investigate yourself...") while server `generate.ts` uses plain backstop messages ("Both concepts are required.", "Concepts must be different."). This is by design — the client shows user-facing copy, the server is a security fallback for direct API callers. Don't "fix" by making them match.
- **Blocklist normalization pipeline**: `normalizeInput()` applies: (1) strip zero-width chars, (2) NFKD normalization (fullwidth→ASCII), (3) strip combining marks, (4) lowercase, (5) Cyrillic/Greek confusable→Latin mapping, (6) leet-speak substitution, (7) strip separators `[_.+-]+`, (8) collapse whitespace. Then `isBlocked()` does a dual-pass check: once with spaces (for multi-word terms like "school shooting") and once without spaces (catches space-insertion bypass like "h itler"). Duplicated in both `blocklist.ts` and `generate.ts`.
- **`.npmrc` has `ignore-scripts=true`**: Supply chain hardening. Netlify build command runs `npm rebuild esbuild` before build since esbuild needs its postinstall script.
- **Security headers**: Configured in `netlify.toml` `[[headers]]` block — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Build pipeline security**: `netlify.toml` build command runs `npm audit --audit-level=high` before build. Fails on high/critical advisories.
- **ESLint flat config**: `eslint.config.js` uses ESLint 9 flat config format. No `.eslintrc` file. `react-hooks/purity` is disabled (false positives on intentional `Math.random()` in `useMemo`). Underscore-prefixed vars are allowed as unused.
- **Vitest 4 blocked**: Upgrade from 3.x to 4.x breaks 16 tests in `generate-contract.test.ts` due to mock constructor behavior change (`new` keyword now constructs instead of calling `mock.apply`). Mock patterns in that file need updating before upgrade.
- **Import extensions**: This project uses `allowImportingTsExtensions` + `verbatimModuleSyntax`. Always include `.ts`/`.tsx` in imports.
- **No public/ directory**: Cork texture is CSS-only (`cork-bg` class). No image files exist.
- **Font loading**: All 12 fonts loaded in `index.html` `<link>`. Adding a font requires updating both the `<link>` tag and the `@theme` block.
- **Animation timing**: Constants in `src/lib/constants.ts` control reveal sequence. Card delay, string duration, entrance time — all interconnected.
- **Card dimensions**: Hardcoded in `Corkboard.tsx` (layout) AND `PolaroidCard.tsx` (explicit height). `200×280px` desktop, `150×210px` mobile (breakpoint: 768px). Changes must update BOTH files.
- **PolaroidCard rotation**: Uses Framer Motion `rotate` prop in `initial`/`animate`, NOT `style={{ transform: 'rotate(...)' }}`. Inline `style.transform` conflicts with Framer Motion's animation system. Don't revert to inline transform.
- **Resize debounce**: `Corkboard.tsx` resize handler is debounced (150ms). Do not remove — without it, resize fires at 60fps and re-renders all cards/strings every frame.
- **Seeded random**: Layout uses deterministic seeded random from case file number hash. Same inputs always produce same layout.
- **ErrorBoundary**: Wraps `<App />` in `main.tsx`. Catches render crashes and shows `ErrorScreen` with recovery. Class component (React requirement for error boundaries).

## Common Recipes

### Adding a Font Category
1. Add to `FONT_CATEGORIES` array in `src/types/conspiracy.ts`
2. Add mapping in `src/lib/fonts.ts` (both `FONT_MAP` and `FONT_CLASS_MAP`)
3. Add `--font-{name}` in `index.css` `@theme` block
4. Add Google Font to `<link>` in `index.html`
5. Update system prompt in `netlify/functions/generate.ts`

### Adding Example Chips
1. Add pair to `EXAMPLE_PAIRS` in `src/lib/constants.ts`
2. Keep to 4-6 total

### Modifying the System Prompt
1. Edit `SYSTEM_PROMPT` in `netlify/functions/generate.ts`
2. Test with diverse inputs for tone, structure, safety
3. Validate JSON output still matches `ConspiracyChain`

## App State Machine

```
landing ──(submit)──→ loading ──(success)──→ board
                         │                     │
                         ├──(timeout/error)──→ error
                         │                     │
                         └──(abort)──→ (silent) ←──(retry)──┘
                                                    │
board ──(new investigation)──→ landing ←────────────┘
```

- `App.tsx` owns all state transitions via `useCallback` handlers
- `AbortController` signal is wired through `generateConspiracy()` to `fetch()` for proper request cancellation
- Board data is held in `useState` — reset to `null` on "New Investigation"

## Known Bugs (Unfixed)

- **BUG-005: seededRandom returns [0, 1] inclusive**: `layout.ts:21` divides by `0xffffffff` instead of `0x100000000`. Impact is negligible (positions clamped, rotation off by 0.001 degrees max). Not fixed because changing the divisor alters all board layouts.

### Previously Fixed

- ~~**BUG-002: AbortController signal not wired**~~ — **FIXED** in security audit 2026-03-10. Signal now passed through `generateConspiracy()` to `fetch()`.
- ~~**BUG-003: Unicode blocklist bypass**~~ — **FIXED** in security audit 2026-03-10. `normalizeInput()` now applies NFKD normalization, strips zero-width characters, and removes combining marks in both `blocklist.ts` and `generate.ts`.
- ~~**BUG-004a: Framer Motion transform conflict**~~ — **FIXED** in bug hunt 2026-03-12. PolaroidCard used `style.transform` for rotation which was overridden by Framer Motion animations.
- ~~**BUG-004b: Card flip container had no height**~~ — **FIXED** in bug hunt 2026-03-12. Back face `overflow-y-auto` clipped at 0px. Added explicit card dimensions.
- ~~**BUG-004c: Blocklist space-insertion bypass**~~ — **FIXED** in bug hunt 2026-03-12. Single-word terms could be bypassed with spaces (e.g. "h itler"). Dual-pass check now catches this.

## What's Not Implemented (P2)

- **F-017**: Share/screenshot export (html2canvas)
- **F-018**: Sound effects (Howler.js)
- Netlify site needs linking + `ANTHROPIC_API_KEY` in dashboard

## Documentation Hierarchy

| Layer | Loaded | What goes here |
|-------|--------|---------------|
| **CLAUDE.md** (this file) | Every conversation | Rules preventing mistakes on ANY task |
| **MEMORY.md** | Every conversation | Cross-cutting patterns, project state |
| **Sub-memory** (`.claude/memory/`) | On demand | Feature-specific deep dives |
| **Inline comments** | When code is read | Non-obvious "why" explanations |

**Rule**: Prevents mistakes on unrelated tasks → CLAUDE.md. Spans features → MEMORY.md. One feature only → sub-memory. Single line → inline comment.

### Sub-Memory Files — Load When Working On

| File | When to load |
|------|-------------|
| `animation-system.md` | Reveal sequence, card flip, string drawing |
| `design-system.md` | Colors, fonts, spacing, visual standards |
| `testing.md` | Writing tests, mocking patterns, vitest config |
| `content-safety.md` | Blocklist, system prompt, safety layers |
| `api-and-data.md` | Generate endpoint, Claude API, response validation |
| `feature-inventory.md` | Component responsibilities, what's built vs planned |
| `docs/ERROR_MESSAGES.md` | Error message inventory, style guide, tone conventions |
