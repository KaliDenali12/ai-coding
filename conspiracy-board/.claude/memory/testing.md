# Testing

## Setup
- **Framework**: Vitest 3.x with jsdom environment
- **Config**: `vitest.config.ts` — separate from vite config, includes `@/` alias
- **Setup file**: `src/test/setup.ts` → imports `@testing-library/jest-dom/vitest`
- **Globals**: `true` (no need to import `describe`, `it`, `expect`)
- **CSS**: `css: true` (CSS modules processed)

## Commands
```bash
npm test              # vitest run (315+ tests)
npm run test:watch    # vitest watch mode
npm run test:coverage # vitest with coverage
```

## Test Structure
- Smoke tests: `src/__tests__/smoke.test.tsx`
- Component tests: `src/components/__tests__/*.test.tsx` (incl. CaseFileStamp)
- Lib tests: `src/lib/__tests__/*.test.ts` (incl. cn, deep api/blocklist/layout/fonts tests)
- App integration: `src/__tests__/App.test.tsx`, `src/__tests__/App-integration-deep.test.tsx`
- Server function: `netlify/functions/__tests__/generate.test.ts`, `generate-handler.test.ts`
- API contract: `netlify/functions/__tests__/generate-contract.test.ts` (49 tests)
- Audit reports: `audit-reports/TEST_COVERAGE_REPORT_001_2026-03-10.md`, `TEST_HARDENING_REPORT_01_2026-03-10.md`

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
