import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.tsx'

// Mock framer-motion for all components
vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
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

// Mock the API module
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

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('starts on the landing screen', () => {
    render(<App />)
    expect(screen.getByText(/"It's All Connected."/)).toBeInTheDocument()
    expect(screen.getByTestId('input-a')).toBeInTheDocument()
  })

  it('shows loading screen after submitting inputs', async () => {
    // Make the API call hang
    mockGenerateConspiracy.mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
    })
  })

  it('shows corkboard with all 7 cards after successful API response', async () => {
    mockGenerateConspiracy.mockResolvedValue(mockChainData)

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('corkboard')).toBeInTheDocument()
      const cards = screen.getAllByTestId('polaroid-card')
      expect(cards).toHaveLength(7)
    })
  })

  it('shows error screen after API failure', async () => {
    mockGenerateConspiracy.mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('error-screen')).toBeInTheDocument()
    })
  })

  it('returns to landing from error screen via Try Again', async () => {
    mockGenerateConspiracy.mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    await user.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('error-screen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('retry-button'))

    await waitFor(() => {
      expect(screen.getByTestId('input-a')).toBeInTheDocument()
    })
  })

  it('calls API with correct parameters', async () => {
    mockGenerateConspiracy.mockResolvedValue(mockChainData)

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'IKEA')
    await user.click(screen.getByTestId('submit-button'))

    expect(mockGenerateConspiracy).toHaveBeenCalledWith(
      { conceptA: 'Penguins', conceptB: 'IKEA' },
      expect.any(AbortSignal),
    )
  })

  it('chip click triggers immediate API call', async () => {
    mockGenerateConspiracy.mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    render(<App />)

    const chips = screen.getAllByTestId('example-chip')
    await user.click(chips[0])

    expect(mockGenerateConspiracy).toHaveBeenCalledWith(
      { conceptA: 'Penguins', conceptB: 'IKEA Furniture' },
      expect.any(AbortSignal),
    )
  })
})
