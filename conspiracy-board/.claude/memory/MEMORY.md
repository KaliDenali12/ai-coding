# Project Memory — Index

Conspiracy Board: comedic AI web app connecting two concepts via a 7-node conspiracy chain on an animated corkboard. See CLAUDE.md for rules.

## Current State

- **Test count**: 295 tests across 25 files (0 skipped). Post-consolidation: ~43 duplicates removed, ~27 decorative remain.
- **Audit reports**: `audit-reports/TEST_ARCHITECTURE_REPORT_001_2026-03-10.md`, `TEST_CONSOLIDATION_REPORT_001_2026-03-10.md`, `TEST_QUALITY_REPORT_001_2026-03-10.md` — see `testing.md` for antipatterns.
- **Known bugs**: BUG-002 (FIXED), BUG-003 (FIXED), BUG-004a/b/c (FIXED), BUG-STATE-02 (FIXED). Only unfixed: BUG-005 (seededRandom inclusive range, negligible impact).
- **State audit**: `audit-reports/25_STATE_MANAGEMENT_REPORT_01_2026-03-12_2055.md` — 2 fixes (ErrorBoundary recovery loop, stale boardData on retry). State architecture rated SOLID.
- **Security audit**: `audit-reports/08_SECURITY_AUDIT_REPORT_001_2026-03-10_1545.md` — 7 fixes applied, 1 unfixed (rate limiting needs external infra). Security headers in `netlify.toml`, `.npmrc` with `ignore-scripts=true`, `npm audit` in build pipeline.
- **Resilience audit**: `audit-reports/20_ERROR_RECOVERY_REPORT_01_2026-03-11_2045.md` — Added SDK timeout (25s, was 10min default), error classification (504/503/500), client fetch fallback timeout, Netlify function timeout (26s).
- **Perceived performance audit**: `audit-reports/26_PERCEIVED_PERFORMANCE_REPORT_01_2026-03-13_0950.md` — Tightened all animation timing (reveal 10.4s→6.35s, transitions 400-600ms→200-300ms, card flip 500→350ms). No business logic changes.
- **DevOps audit**: `audit-reports/27_DEVOPS_AUDIT_REPORT_01_2026-03-13_1020.md` — Added GitHub Actions CI, tests in Netlify build, MAINTENANCE_MODE kill switch, success-path structured logging.
- **Observability audit**: `audit-reports/29_OBSERVABILITY_REPORT_001_2026-03-13_2310.md` — Added health endpoints (`/api/health`, `/live`, `/ready`), structured JSON logging on all paths, request correlation IDs (`X-Request-Id`), circuit breaker (3 failures → 30s cooldown), client-side requestId tracing, 10 operational runbooks (`docs/RUNBOOKS.md`). Maturity: Basic → Moderate. Remaining gaps: no uptime monitoring service, no alerting pipeline, no client-side error reporting (Sentry).
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
