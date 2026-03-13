import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LoadingScreen } from '../LoadingScreen.tsx'
import { FAIL_THRESHOLD_MS } from '@/lib/constants.ts'

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(key)) {
          filteredProps[key] = value
        }
      }
      return <div {...filteredProps}>{children}</div>
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition'].includes(key)) {
          filteredProps[key] = value
        }
      }
      return <p {...filteredProps}>{children}</p>
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition'].includes(key)) {
          filteredProps[key] = value
        }
      }
      return <span {...filteredProps}>{children}</span>
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the loading screen', () => {
    render(<LoadingScreen onTimeout={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
  })

  it('shows CLASSIFIED stamp after delay', () => {
    render(<LoadingScreen onTimeout={vi.fn()} onCancel={vi.fn()} />)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('classified-stamp')).toBeInTheDocument()
  })

  it('shows a loading message', () => {
    render(<LoadingScreen onTimeout={vi.fn()} onCancel={vi.fn()} />)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('loading-message')).toBeInTheDocument()
  })

  it('cycles messages over time', () => {
    render(<LoadingScreen onTimeout={vi.fn()} onCancel={vi.fn()} />)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    const firstMessage = screen.getByTestId('loading-message').textContent

    act(() => {
      vi.advanceTimersByTime(1600)
    })
    const secondMessage = screen.getByTestId('loading-message').textContent

    expect(firstMessage).not.toBe(secondMessage)
  })

  it('shows redacted lines', () => {
    render(<LoadingScreen onTimeout={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByTestId('redacted-lines')).toBeInTheDocument()
  })

  it('calls onTimeout after fail threshold', () => {
    const onTimeout = vi.fn()
    render(<LoadingScreen onTimeout={onTimeout} onCancel={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(FAIL_THRESHOLD_MS + 1000)
    })

    expect(onTimeout).toHaveBeenCalled()
  })
})
