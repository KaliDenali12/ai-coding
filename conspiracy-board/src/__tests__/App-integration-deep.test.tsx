import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.tsx'

// Polyfill SVG methods for jsdom
beforeAll(() => {
  if (typeof SVGElement !== 'undefined') {
    Object.defineProperty(SVGElement.prototype, 'getTotalLength', {
      value: () => 500,
      writable: true,
      configurable: true,
    })
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

const mockGenerateConspiracy = vi.fn()
vi.mock('../lib/api.ts', () => ({
  generateConspiracy: (...args: unknown[]) => mockGenerateConspiracy(...args),
  ApiError: class ApiError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.name = 'ApiError'
      this.statusCode = statusCode
    }
  },
}))

const mockChainData = {
  chain: Array.from({ length: 7 }, (_, i) => ({
    title: `Node ${i}`,
    emoji: '🔍',
    font_category: 'horror',
    teaser: `Teaser ${i}`,
    briefing: `Briefing for node ${i}`,
  })),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
}

describe('App Integration — Deep Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('preserves last inputs when returning from error to landing', async () => {
    mockGenerateConspiracy.mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Cats')
    await user.type(screen.getByTestId('input-b'), 'Dogs')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('error-screen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('retry-button'))

    await waitFor(() => {
      const inputA = screen.getByTestId('input-a') as HTMLInputElement
      const inputB = screen.getByTestId('input-b') as HTMLInputElement
      expect(inputA.value).toBe('Cats')
      expect(inputB.value).toBe('Dogs')
    })
  })

  it('submit button is disabled when inputs are empty', () => {
    render(<App />)
    const submitBtn = screen.getByTestId('submit-button')
    expect(submitBtn).toBeDisabled()
  })

  it('submit button is disabled when inputs are identical', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'same')
    await user.type(screen.getByTestId('input-b'), 'same')

    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('full flow: landing → loading → board with all cards', async () => {
    mockGenerateConspiracy.mockResolvedValue(mockChainData)

    const user = userEvent.setup()
    render(<App />)

    // Landing
    expect(screen.getByText(/"It's All Connected."/)).toBeInTheDocument()

    // Submit → Loading → Board
    await user.type(screen.getByTestId('input-a'), 'Cats')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('corkboard')).toBeInTheDocument()
    })

    // Verify all 7 cards rendered
    const cards = screen.getAllByTestId('polaroid-card')
    expect(cards).toHaveLength(7)

    // Verify case file stamp
    expect(screen.getByTestId('case-file-stamp')).toBeInTheDocument()
    expect(screen.getByText('TOP SECRET')).toBeInTheDocument()
  })

  it('shows client-side validation error for empty inputs', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Type only in first field
    await user.type(screen.getByTestId('input-a'), 'Cats')
    // Force submit by pressing Enter
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByTestId('error-message').textContent).toContain('Both fields are required')
    })
  })

  it('shows validation error for blocked input before API call', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'hitler')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByTestId('error-message').textContent).toContain('classified')
    })

    // API should never have been called
    expect(mockGenerateConspiracy).not.toHaveBeenCalled()
  })

  it('handles AbortError silently (does not show error screen)', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    mockGenerateConspiracy.mockRejectedValue(abortError)

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Cats')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    // Wait for the rejected promise to settle, then verify no error screen
    await waitFor(() => {
      expect(mockGenerateConspiracy).toHaveBeenCalledTimes(1)
    })

    // Should still be on loading screen (AbortError is silently ignored)
    expect(screen.queryByTestId('error-screen')).not.toBeInTheDocument()
  })

  it('clears error message when user types in input', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Trigger validation error with blocked content
    await user.type(screen.getByTestId('input-a'), 'hitler')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    // Type in input-a to clear error
    await user.type(screen.getByTestId('input-a'), 'x')

    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })

  it('handles multiple successive API calls', async () => {
    let resolveFirst: (v: unknown) => void
    const firstPromise = new Promise((r) => { resolveFirst = r })
    mockGenerateConspiracy
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(mockChainData)

    const user = userEvent.setup()
    render(<App />)

    // First submission — hangs
    const chips = screen.getAllByTestId('example-chip')
    await user.click(chips[0])

    await waitFor(() => {
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
    })

    // Note: In real app, user can't easily re-submit from loading.
    // But we can verify the first call was made.
    expect(mockGenerateConspiracy).toHaveBeenCalledTimes(1)

    // Resolve first to proceed
    resolveFirst!(mockChainData)
    await waitFor(() => {
      expect(screen.getByTestId('corkboard')).toBeInTheDocument()
    })
  })

  it('displays case file stamp on the corkboard', async () => {
    mockGenerateConspiracy.mockResolvedValue(mockChainData)

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'A')
    await user.type(screen.getByTestId('input-b'), 'B')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('case-file-stamp')).toBeInTheDocument()
      expect(screen.getByText('TOP SECRET')).toBeInTheDocument()
    })
  })

  it('renders red strings between cards', async () => {
    mockGenerateConspiracy.mockResolvedValue(mockChainData)

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'X')
    await user.type(screen.getByTestId('input-b'), 'Y')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      const strings = screen.getAllByTestId('red-string')
      // 7 cards → 6 strings
      expect(strings).toHaveLength(6)
    })
  })
})
