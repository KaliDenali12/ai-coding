import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorScreen } from '../ErrorScreen.tsx'

const motionProps = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap']
function filterProps(props: Record<string, unknown>) {
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (!motionProps.includes(k)) safe[k] = v
  }
  return safe
}

vi.mock('framer-motion', () => ({
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

describe('ErrorScreen', () => {
  it('renders the error screen', () => {
    render(<ErrorScreen onRetry={vi.fn()} />)
    expect(screen.getByTestId('error-screen')).toBeInTheDocument()
  })

  it('displays an error message', () => {
    render(<ErrorScreen onRetry={vi.fn()} />)
    expect(screen.getByTestId('error-message')).toBeInTheDocument()
    expect(screen.getByTestId('error-message').textContent?.length).toBeGreaterThan(0)
  })

  it('has a Try Again button', () => {
    render(<ErrorScreen onRetry={vi.fn()} />)
    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    expect(screen.getByTestId('retry-button')).toHaveTextContent('Try Again')
  })

  it('calls onRetry when button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorScreen onRetry={onRetry} />)
    fireEvent.click(screen.getByTestId('retry-button'))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
