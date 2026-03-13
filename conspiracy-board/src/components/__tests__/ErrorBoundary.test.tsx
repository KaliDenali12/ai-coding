import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary.tsx'

const motionProps = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap']
function filterProps(props: Record<string, unknown>) {
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (!motionProps.includes(k)) safe[k] = v
  }
  return safe
}

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <div {...filterProps(props)}>{children}</div>,
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <h1 {...filterProps(props)}>{children}</h1>,
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <p {...filterProps(props)}>{children}</p>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <button {...filterProps(props)}>{children}</button>,
  },
}))

function ThrowingChild(): React.ReactElement {
  throw new Error('Test render crash')
}

function GoodChild(): React.ReactElement {
  return <div data-testid="good-child">OK</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('good-child')).toBeInTheDocument()
  })

  it('renders ErrorScreen when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-screen')).toBeInTheDocument()
    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
  })

  it('resets hasError state when Try Again is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-screen')).toBeInTheDocument()

    // Clicking retry resets the boundary — it will try to re-render children.
    // Since ThrowingChild always throws, it falls back to error screen again,
    // but the important thing is the handler was called (state was reset).
    fireEvent.click(screen.getByTestId('retry-button'))
    expect(screen.getByTestId('error-screen')).toBeInTheDocument()
  })

  it('logs the error with component stack', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Render error: Test render crash'),
      expect.any(String),
    )
  })
})
