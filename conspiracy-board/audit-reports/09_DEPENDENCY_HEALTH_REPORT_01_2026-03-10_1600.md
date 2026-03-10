# Dependency Health Report

**Project**: conspiracy-board
**Date**: 2026-03-10
**Branch**: `dependency-health-2026-03-10`
**Node.js**: v24.13.1
**Package Manager**: npm with `package-lock.json` (committed, consistent, no drift)

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| **Total dependencies (direct)** | 18 (6 runtime, 12 dev) |
| **Total transitive dependencies** | ~290 packages |
| **Known vulnerabilities** | 0 |
| **Dependencies 1+ major versions behind** | 7 |
| **Potentially abandoned dependencies** | 0 |
| **License risks found** | 0 (MPL-2.0 noted, acceptable) |
| **Upgrades applied** | 4 (patch/minor within semver range) |
| **Dependencies unused in production** | 2 (clsx, tailwind-merge) |
| **Dead dev tooling** | 6 packages (eslint ecosystem — no config exists) |

---

## 2. Vulnerability Report

```
npm audit: found 0 vulnerabilities
```

| Package | CVE | Severity | Used? | Fix Available? | Fix Applied? |
|---------|-----|----------|-------|----------------|-------------|
| — | — | — | — | — | — |

**No known vulnerabilities.** Clean audit across all 290 packages.

---

## 3. License Compliance

### License Distribution

| License | Count |
|---------|-------|
| MIT | 239 |
| Apache-2.0 | 18 |
| ISC | 15 |
| BSD-2-Clause | 8 |
| BSD-3-Clause | 3 |
| MPL-2.0 | 2 |
| MIT-0 | 1 |
| Python-2.0 | 1 |
| CC-BY-4.0 | 1 |
| BlueOak-1.0.0 | 1 |
| 0BSD | 1 |
| UNLICENSED | 1 (project itself) |

### Flagged Licenses

| Package | License | Risk Level | Notes |
|---------|---------|------------|-------|
| `lightningcss@1.31.1` | MPL-2.0 | Low | File-level copyleft. Transitive dep of Tailwind CSS. Used as a build tool only, not distributed. No action needed. |
| `lightningcss-win32-x64-msvc@1.31.1` | MPL-2.0 | Low | Platform binary for above. Same assessment. |
| `conspiracy-board@1.0.0` | UNLICENSED | N/A | The project itself. Private project, intentional. |

**No GPL, AGPL, SSPL, or BSL licenses found.** No copyleft risk. All dependencies are permissively licensed.

---

## 4. Staleness Report

### Currently Installed vs Latest (Sorted by Risk)

| Package | Current | Latest | Versions Behind | Type | Health |
|---------|---------|--------|-----------------|------|--------|
| `vitest` | 3.2.4 | 4.0.18 | 1 major | dev | Active (VoidZero) |
| `eslint` | 9.39.4 | 10.0.3 | 1 major | dev | Active (OpenJS Foundation) |
| `@eslint/js` | 9.39.4 | 10.0.1 | 1 major | dev | Active (OpenJS Foundation) |
| `jsdom` | 26.1.0 | 28.1.0 | 2 major | dev | Active (jsdom team) |
| `globals` | 16.5.0 | 17.4.0 | 1 major | dev | Active (sindresorhus) |
| `eslint-plugin-react-refresh` | 0.4.26 | 0.5.2 | 1 minor (pre-1.0) | dev | Active |
| `@types/node` | 24.12.0 | 25.4.0 | 1 major | dev | Active (DefinitelyTyped) |
| `@anthropic-ai/sdk` | 0.78.0 | 0.78.0 | 0 | runtime | Active (Anthropic) |
| `clsx` | 2.1.1 | 2.1.1 | 0 | runtime | Stable |
| `framer-motion` | 12.35.2 | 12.35.2 | 0 | runtime | Active (Matt Perry) |
| `react` | 19.2.4 | 19.2.4 | 0 | runtime | Active (Meta) |
| `react-dom` | 19.2.4 | 19.2.4 | 0 | runtime | Active (Meta) |
| `tailwind-merge` | 3.0.2 | 3.0.2 | 0 | runtime | Active |
| `tailwindcss` | 4.2.1 | 4.2.1 | 0 | dev | Active (Tailwind Labs) |
| `@tailwindcss/vite` | 4.2.1 | 4.2.1 | 0 | dev | Active (Tailwind Labs) |
| `typescript` | 5.9.3 | 5.9.3 | 0 | dev | Active (Microsoft) |
| `vite` | 7.3.1 | 7.3.1 | 0 | dev | Active (VoidZero) |

**All runtime dependencies are fully up to date.** Only dev dependencies have major version gaps, and all are actively maintained.

---

## 5. Upgrades Applied

| Package | From | To | Type | Tests Pass? |
|---------|------|----|------|-------------|
| `@eslint/js` | 9.39.3 | 9.39.4 | patch | Yes (272/272) |
| `eslint` | 9.39.3 | 9.39.4 | patch | Yes (272/272) |
| `framer-motion` | 12.35.0 | 12.35.2 | patch | Yes (272/272) |
| `typescript-eslint` | 8.56.1 | 8.57.0 | minor | Yes (272/272) |

Build also verified passing after all upgrades.

---

## 6. Major Upgrades Needed (Not Applied)

### Vitest 3.x → 4.x

| Aspect | Detail |
|--------|--------|
| **Current** | 3.2.4 |
| **Target** | 4.0.18 |
| **Requires** | Vite >= 6.0 (have 7.3.1 ✓), Node >= 20 (have 24.13.1 ✓) |
| **Breaking changes** | Mock behavior changes (new keyword constructs instances), `vi.restoreAllMocks()` scope change, reporter API removal, snapshot changes for custom elements |
| **Impact on project** | Moderate. Mock behavior change may affect tests using `vi.fn()` with classes. Reporter API not used. Snapshot changes unlikely to affect (no custom elements). |
| **Effort** | Moderate — need to audit all mock usage and run tests |
| **Priority** | Medium — no security motivation, but staying current is good practice |

### ESLint 9.x → 10.x

| Aspect | Detail |
|--------|--------|
| **Current** | 9.39.4 |
| **Target** | 10.0.3 |
| **Requires** | Node >= 20.19.0 (have 24.13.1 ✓), flat config (eslint.config.js) |
| **Breaking changes** | Config lookup starts from linted file dir, JSX scope tracking, Program AST range change |
| **Impact on project** | **Blocked** — no eslint config exists at all. `npm run lint` fails. Must create an `eslint.config.js` first. |
| **Effort** | Moderate — need to create flat config from scratch |
| **Priority** | Medium — linting is currently non-functional regardless of version |
| **Depends on** | `@eslint/js` 10.x, `globals` 17.x, possibly `typescript-eslint` update |

### ESLint Ecosystem (blocked by ESLint upgrade)

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `@eslint/js` | 9.39.4 | 10.0.1 | Must upgrade with ESLint |
| `globals` | 16.5.0 | 17.4.0 | Breaking: audioWorklet split from browser. Trivial for this project. |
| `eslint-plugin-react-refresh` | 0.4.26 | 0.5.2 | Pre-1.0 minor = potentially breaking |
| `typescript-eslint` | 8.57.0 | 8.57.0 | Already at latest |

### jsdom 26.x → 28.x

| Aspect | Detail |
|--------|--------|
| **Current** | 26.1.0 |
| **Target** | 28.1.0 |
| **Breaking changes** | v27: Node >= 20 (✓), user agent stylesheet from HTML Standard (may change `getComputedStyle()`), tough-cookie considers localhost as secure context. v28: unknown (needs changelog review) |
| **Impact on project** | Low — tests don't rely on computed styles or cookies |
| **Effort** | Low — likely just a version bump |
| **Priority** | Low — no security issues, no functionality gap |

### @types/node 24.x → 25.x

| Aspect | Detail |
|--------|--------|
| **Current** | 24.12.0 |
| **Target** | 25.4.0 |
| **Breaking changes** | Type definition updates for Node 25. May introduce new type errors. |
| **Impact on project** | Low — project uses minimal Node APIs (only in Netlify function) |
| **Effort** | Trivial — version bump + type check |
| **Priority** | Low — type definitions only |

---

## 7. Dependency Weight & Reduction

### Heavy Dependencies

| Package | Size (disk) | Usage | Alternative | Effort |
|---------|-------------|-------|-------------|--------|
| `typescript` | 23 MB | Dev — type checking + build | Required, no alternative | N/A |
| `@esbuild` | 11 MB | Transitive (Vite) | N/A (Vite internal) | N/A |
| `@babel` | 11 MB | Transitive (React plugin + eslint-plugin-react-hooks) | N/A | N/A |
| `lightningcss` | 9.1 MB | Transitive (Tailwind CSS) | N/A | N/A |
| `framer-motion` | 5.3 MB | Runtime — animation orchestration, used extensively | Required | N/A |
| `zod` | 5.7 MB | Transitive (@anthropic-ai/sdk) | N/A | N/A |

### Unused Runtime Dependencies

| Package | Size | Usage | Recommendation |
|---------|------|-------|----------------|
| `clsx` | 8 KB | Only in `cn.ts` which is never imported by any component | Document for team — may be intentionally reserved for future use |
| `tailwind-merge` | ~50 KB | Only in `cn.ts` which is never imported by any component | Same as above |

**Note**: `clsx` and `tailwind-merge` are combined in `src/lib/cn.ts` to create a `cn()` utility, but no component in `src/components/` or `src/App.tsx` imports it. The utility is only exercised in its own unit test and a smoke test. These are technically dead runtime dependencies.

### Dead Dev Tooling (ESLint Ecosystem)

The following 6 packages are installed but **non-functional** because no `eslint.config.js` exists:

| Package | Current | Purpose |
|---------|---------|---------|
| `eslint` | 9.39.4 | Linter — `npm run lint` fails with "couldn't find config" |
| `@eslint/js` | 9.39.4 | ESLint core rules |
| `eslint-plugin-react-hooks` | 7.0.1 | React hooks linting |
| `eslint-plugin-react-refresh` | 0.4.26 | React Fast Refresh linting |
| `globals` | 16.5.0 | Global variable definitions for ESLint |
| `typescript-eslint` | 8.57.0 | TypeScript ESLint support |

**Recommendation**: Either create an `eslint.config.js` to make linting functional, or remove all 6 packages if linting is not desired. Current state is worst of both worlds — dependencies installed but providing zero value.

### Duplicate Functionality

No duplicate packages found serving the same purpose.

### Micro-packages / Replaceable

No concerning micro-packages. All dependencies serve meaningful purposes.

---

## 8. Abandoned/At-Risk Dependencies

| Package | Last Release | Maintainer | Risk | Recommendation |
|---------|-------------|------------|------|----------------|
| — | — | — | — | — |

**No abandoned dependencies detected.** All packages are actively maintained by organizations or established maintainers:
- **React/React-DOM**: Meta (massive team)
- **Vite/Vitest**: VoidZero (well-funded company, Evan You)
- **Tailwind CSS**: Tailwind Labs (funded company)
- **Framer Motion**: Matt Perry (single maintainer, but well-funded via Framer)
- **TypeScript**: Microsoft
- **ESLint**: OpenJS Foundation
- **Anthropic SDK**: Anthropic (company)
- **clsx**: Luke Edwards (single maintainer, but extremely stable/mature — 8 KB, no deps)
- **tailwind-merge**: dcastil (single maintainer, community project — but mature and stable)

### Bus Factor Concerns

| Package | Maintainer Type | Risk Level | Notes |
|---------|----------------|------------|-------|
| `clsx` | Single maintainer | Low | Extremely stable, no deps, 8 KB. Essentially "done" software. |
| `tailwind-merge` | Single maintainer | Low | Mature, well-tested. Would be straightforward to fork if abandoned. |
| `framer-motion` | Single maintainer (Matt Perry) | Medium | Complex, hard to replace. However, backed by Framer company. |

---

## 9. Lock File Health

| Check | Status |
|-------|--------|
| Lock file exists | ✓ `package-lock.json` |
| Lock file committed | ✓ tracked in git |
| Lock file consistent | ✓ `npm install --dry-run` reports "up to date" |
| Duplicate versions | ✓ None — all deduped packages resolve to single versions |
| `.npmrc` hardening | ✓ `ignore-scripts=true` (supply chain protection) |

---

## 10. Supply Chain Hardening

| Measure | Status |
|---------|--------|
| `ignore-scripts=true` in `.npmrc` | ✓ Prevents install-time script execution |
| `npm audit` in CI (Netlify build) | ✓ Added in security audit |
| Lock file committed | ✓ Prevents phantom dependency changes |
| No `postinstall` scripts | ✓ |

---

## 11. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---|---|---|---|---|
| 1 | Fix or remove ESLint ecosystem (6 packages) | Removes dead weight OR enables code quality tooling | Medium — dead deps confuse contributors, `npm run lint` silently broken | Yes | Create `eslint.config.js` with React/TS rules, or remove all 6 packages + the `lint` script from package.json. Current state provides zero value. |
| 2 | Evaluate `clsx` + `tailwind-merge` usage | Clarifies runtime dependency footprint | Low — tiny packages, no security risk | Probably | `cn()` utility exists but no component imports it. Either start using it in components or remove both packages + `cn.ts`. |
| 3 | Upgrade Vitest 3 → 4 | Access to stable browser mode, improved coverage, active support | Medium — Vitest 3 will receive fewer patches over time | Probably | Review mock usage patterns first. Main risk is `vi.fn()` behavior change with `new` keyword. Run tests after bump to see if anything breaks. |
| 4 | Upgrade jsdom 26 → 28 | Spec compliance, security patches | Low — no known vulnerabilities in v26 | Only if time allows | Likely a clean version bump. Test after upgrading. |
| 5 | Upgrade @types/node 24 → 25 | Type accuracy for Node 25 APIs | Low — affects type checking only | Only if time allows | Bump version, run `tsc --noEmit`, fix any new type errors. |
| 6 | Add Dependabot/Renovate | Automated dependency update PRs | Medium — manual dependency tracking doesn't scale | Yes | Configure for security patches (auto-merge) and minor/major (manual review). Prevents staleness. |
| 7 | Add license monitoring to CI | Prevents accidental copyleft introduction | Low — current deps are all permissive | Only if time allows | Use `license-checker` in CI with `--onlyAllow` flag for approved licenses. |
