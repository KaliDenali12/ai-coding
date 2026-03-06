# Project Memory — Index

Conspiracy Board: comedic AI web app connecting two concepts via a 7-node conspiracy chain on an animated corkboard. See ./CLAUDE.md for full rules and conventions.

## Current State

- **Test count**: 120 (13 test files)
- **Deploy URL**: TBD (needs Netlify setup with ANTHROPIC_API_KEY)
- **Last major change**: Full MVP build complete — all P0 features implemented

## Key Technical Decisions

- Tailwind CSS v4 with `@theme` in CSS (not tailwind.config.js)
- `erasableSyntaxOnly: true` in tsconfig — no parameter property shorthand
- jsdom needs SVG polyfill: `(SVGElement.prototype as any).getTotalLength = () => 500`
- Framer Motion mocked in all component tests with filtered prop passthrough
- Seeded random in layout algorithm for deterministic card positions per board

## Topic Files

No topic files yet. Create them as patterns emerge during work:

| File | When to load |
|------|-------------|
| testing.md | Writing or fixing tests |
| data-model.md | Modifying API response types or system prompt structure |
| api-providers.md | Working with Claude API integration |
| pitfalls-frontend.md | Debugging frontend framework issues |
| animation.md | Working on reveal sequence, flip, or string animations |
| fonts.md | Adding/changing dynamic font mappings |
| content-safety.md | Modifying blocklist, system prompt safety, or input validation |
| feature-inventory.md | Checking what features/components exist |

## Memory File Rules

- One topic per file, 30-80 lines each
- Terse reference format: tables, bullets, code snippets — no prose
- Name files by topic (`testing.md`), not area (`backend-stuff.md`)
- Split any file that exceeds 80 lines
- Update this index when creating or removing files
