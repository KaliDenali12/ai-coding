# Project Memory — Index

Conspiracy Board: comedic AI web app connecting two concepts via a 7-node conspiracy chain on an animated corkboard. See CLAUDE.md for rules.

## Current State

- **Test count**: 120 tests across 13 files
- **Deploy URL**: TBD (needs Netlify setup + `ANTHROPIC_API_KEY`)
- **Status**: All P0/P1 features complete. P2 remaining: share/export, sound effects.
- **Branch**: `master`

## Key Technical Decisions

- Tailwind CSS v4 with `@theme` in CSS (no tailwind.config.ts)
- `erasableSyntaxOnly: true` in tsconfig — no parameter property shorthand
- `verbatimModuleSyntax: true` — must include `.ts`/`.tsx` in import paths
- jsdom needs SVG polyfill: `SVGElement.prototype.getTotalLength = () => 500`
- Framer Motion mocked in all component tests with filtered prop passthrough
- Seeded random in layout for deterministic card positions per board
- Blocklist duplicated between client and server (must sync both)
- No Shadcn/UI — all custom HTML + Tailwind despite original plans

## Topic Files

| File | When to load |
|------|-------------|
| `animation-system.md` | Reveal sequence, card flip, string drawing, timing |
| `design-system.md` | Colors, fonts, spacing, CSS classes, responsive rules |
| `testing.md` | Writing tests, mocking patterns, vitest config, test IDs |
| `content-safety.md` | Blocklist changes, system prompt safety, input validation |
| `api-and-data.md` | Generate endpoint, Claude API, response validation, types |
| `feature-inventory.md` | Component responsibilities, what's built vs planned |

## Memory Rules

- One topic per file, 40-80 lines each
- Terse reference: tables, bullets, code snippets — no prose
- Name by topic (`testing.md`), not area (`backend-stuff.md`)
- Update this index when creating or removing files
