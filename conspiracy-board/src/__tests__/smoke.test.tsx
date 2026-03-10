import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'

// Polyfill SVG methods for jsdom
beforeAll(() => {
  if (typeof SVGElement !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SVGElement.prototype as any).getTotalLength = () => 500
  }
})

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(k)) safe[k] = v
      }
      return <div {...safe}>{children}</div>
    },
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition'].includes(k)) safe[k] = v
      }
      return <h1 {...safe}>{children}</h1>
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition'].includes(k)) safe[k] = v
      }
      return <p {...safe}>{children}</p>
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(k)) safe[k] = v
      }
      return <button {...safe}>{children}</button>
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition'].includes(k)) safe[k] = v
      }
      return <span {...safe}>{children}</span>
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock the API module to prevent real network calls
vi.mock('../lib/api.ts', () => ({
  generateConspiracy: vi.fn(() => new Promise(() => {})),
  ApiError: class ApiError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.name = 'ApiError'
      this.statusCode = statusCode
    }
  },
}))

describe('Smoke Tests', () => {
  it('app renders without crashing', async () => {
    const { default: App } = await import('../App.tsx')
    const { container } = render(<App />)
    expect(container).toBeTruthy()
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })

  it('landing screen renders with core UI elements', async () => {
    const { default: App } = await import('../App.tsx')
    render(<App />)
    expect(screen.getByTestId('input-a')).toBeInTheDocument()
    expect(screen.getByTestId('input-b')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    expect(screen.getByText(/"It's All Connected."/)).toBeInTheDocument()
  })

  it('example chips are present and clickable', async () => {
    const { default: App } = await import('../App.tsx')
    render(<App />)
    const chips = screen.getAllByTestId('example-chip')
    expect(chips.length).toBeGreaterThanOrEqual(4)
  })

  it('core library modules load without errors', async () => {
    const blocklist = await import('../lib/blocklist.ts')
    expect(blocklist.isBlocked).toBeTypeOf('function')
    expect(blocklist.checkInputs).toBeTypeOf('function')

    const layout = await import('../lib/layout.ts')
    expect(layout.calculateCardPositions).toBeTypeOf('function')
    expect(layout.getPinPosition).toBeTypeOf('function')
    expect(layout.generateStringPath).toBeTypeOf('function')

    const fonts = await import('../lib/fonts.ts')
    expect(fonts.getFontFamily).toBeTypeOf('function')
    expect(fonts.getFontClass).toBeTypeOf('function')

    const constants = await import('../lib/constants.ts')
    expect(constants.EXAMPLE_PAIRS).toBeDefined()
    expect(constants.LOADING_MESSAGES).toBeDefined()

    const cn = await import('../lib/cn.ts')
    expect(cn.cn).toBeTypeOf('function')
  })

  it('type definitions are consistent', async () => {
    const types = await import('../types/conspiracy.ts')
    expect(types.FONT_CATEGORIES).toHaveLength(9)
    expect(types.FONT_CATEGORIES).toContain('horror')
    expect(types.FONT_CATEGORIES).toContain('underground')
  })
})
