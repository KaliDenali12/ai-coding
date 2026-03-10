# Testing

## Setup
- **Framework**: Vitest 3.x with jsdom environment
- **Config**: `vitest.config.ts` — separate from vite config, includes `@/` alias
- **Setup file**: `src/test/setup.ts` → imports `@testing-library/jest-dom/vitest`
- **Globals**: `true` (no need to import `describe`, `it`, `expect`)
- **CSS**: `css: true` (CSS modules processed)

## Commands
```bash
npm test              # vitest run (272+ tests)
npm run test:watch    # vitest watch mode
npm run test:coverage # vitest with coverage
```

## Test Structure
- Smoke tests: `src/__tests__/smoke.test.tsx`
- Component tests: `src/components/__tests__/*.test.tsx` (incl. CaseFileStamp)
- Lib tests: `src/lib/__tests__/*.test.ts` (incl. cn, deep api/blocklist/layout/fonts tests)
- App integration: `src/__tests__/App.test.tsx`, `src/__tests__/App-integration-deep.test.tsx`
- Server function: `netlify/functions/__tests__/generate.test.ts`, `generate-handler.test.ts` (3 unique edge cases only)
- API contract: `netlify/functions/__tests__/generate-contract.test.ts` (49 tests)
- Audit reports: `audit-reports/TEST_COVERAGE_REPORT_001_2026-03-10.md`, `TEST_HARDENING_REPORT_01_2026-03-10.md`, `TEST_ARCHITECTURE_REPORT_001_2026-03-10.md`, `TEST_CONSOLIDATION_REPORT_001_2026-03-10.md`, `TEST_QUALITY_REPORT_001_2026-03-10.md`

## Known Antipatterns (from Architecture Audit)

### Critical — Fix Before Writing New Tests
- **`generate.test.ts` tests a LOCAL copy of `validateResponse`**, not the production function. 7 tests validate a re-implemented copy. If production code changes, these tests still pass. Import and test the real function.
- **`api-generate.test.ts` has `expect()` in catch blocks without `expect.assertions(N)`** — 2 tests can silently pass with zero assertions if the function stops throwing. Always use `expect.assertions()` when assertions are in conditional paths.
- **`Corkboard.test.tsx > 'does not flip cards during reveal'` has ZERO assertions** — always passes.

### High — Avoid Repeating
- **Consolidation completed (2026-03-10)**: 43 duplicate tests removed. `generate-handler.test.ts` trimmed to 3 unique tests; `fonts.test.ts` deleted; shallow files (`blocklist.test.ts`, `layout.test.ts`, `api.test.ts`) trimmed to unique-only tests. **Rule**: Don't add tests to shallow files if the `-deep` or `-contract` file already covers that behavior. Check the deep file first.
- **Framer-motion mock is copy-pasted across 10 test files** (~50 lines each). Should be extracted to shared setup but hasn't been yet. If you change the mock pattern, you must update all 10 files.
- **`ApiError` class is re-implemented in 3 test files** (App.test, smoke.test, App-integration-deep.test) instead of imported. Could diverge from production class.

### Low — Awareness
- ~27 tests are decorative: `cn.test.ts` tests third-party libs, `constants.test.ts` tests static data, font map tests duplicate TypeScript type checking, 5 "renders the X" tests only check `data-testid` exists.
- SVG path string parsing in `layout-deep.test.ts` is fragile (splits by index).
- RedString tests assert exact CSS attribute values (`opacity`, `stroke`).
- Post-consolidation: ~245 unique behavioral tests out of 272 reported (~27 decorative remain).

## Mocking Patterns

### Framer Motion (all component tests)
Every component test mocks `framer-motion` to strip animation props:
```typescript
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => React.forwardRef((props, ref) => {
      // Filter animation-specific props, render as plain HTML
      const filtered = Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          !['initial','animate','exit','transition','whileHover','whileTap','variants'].includes(key)
        )
      )
      return React.createElement(tag as string, { ...filtered, ref })
    })
  }),
  AnimatePresence: ({ children }) => children,
}))
```

### SVG getTotalLength
jsdom doesn't implement SVG methods. Polyfill before RedString/Corkboard tests:
```typescript
SVGElement.prototype.getTotalLength = () => 500
```

### API Module (App.test.tsx)
```typescript
vi.mock('@/lib/api.ts', () => ({
  generateConspiracy: vi.fn(),
  ApiError: class extends Error { statusCode: number },
}))
```

### Timers
```typescript
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
// Advance: vi.advanceTimersByTime(ms) wrapped in act()
```

## Test Data
Standard mock objects used across tests:
```typescript
const mockNode: ConspiracyNode = {
  title: 'Test Node',
  emoji: '🔍',
  font_category: 'chaotic',
  teaser: 'Test teaser',
  briefing: 'Test briefing text...',
}
const mockData: ConspiracyChain = {
  chain: Array(7).fill(mockNode),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
}
```

## Assertion Style
- `screen.getByTestId()` for element queries (every interactive element has `data-testid`)
- `userEvent.setup()` for user interactions (not `fireEvent`)
- `vi.fn()` for callbacks, verified with `toHaveBeenCalledOnce()`
- `waitFor()` for async assertions
- `act()` wrapper around timer advances

## Common Test IDs
| testid | Component | Purpose |
|--------|-----------|---------|
| `app-root` | App | Root container |
| `input-a`, `input-b` | LandingScreen | Concept inputs |
| `submit-button` | LandingScreen | Submit button |
| `example-chip` | LandingScreen | Example pair buttons |
| `error-message` | LandingScreen/ErrorScreen | Error text |
| `loading-screen` | LoadingScreen | Loading container |
| `classified-stamp` | LoadingScreen | CLASSIFIED stamp |
| `loading-message` | LoadingScreen | Cycling status text |
| `corkboard` | Corkboard | Board container |
| `polaroid-card` | PolaroidCard | Clickable card |
| `polaroid-front/back` | PolaroidCard | Front/back faces |
| `red-string` | RedString | SVG path |
| `string-layer` | Corkboard | SVG container |
| `case-file-stamp` | CaseFileStamp | Classification stamp |
| `new-investigation-btn` | Corkboard | Restart button |
| `error-screen` | ErrorScreen | Error container |
| `retry-button` | ErrorScreen | Retry button |
