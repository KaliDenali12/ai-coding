import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingScreen } from '../LandingScreen.tsx'

// Framer Motion can cause issues in test — mock it
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, ...rest } = props
      return <div {...rest}>{children}</div>
    },
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, transition: _t, ...rest } = props
      return <h1 {...rest}>{children}</h1>
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, transition: _t, ...rest } = props
      return <p {...rest}>{children}</p>
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, transition: _t, whileHover: _wh, whileTap: _wt, ...rest } = props
      return <button {...rest}>{children}</button>
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

describe('LandingScreen', () => {
  it('renders headline and inputs', () => {
    render(<LandingScreen onSubmit={vi.fn()} />)
    expect(screen.getByText(/"It's All Connected."/)).toBeInTheDocument()
    expect(screen.getByTestId('input-a')).toBeInTheDocument()
    expect(screen.getByTestId('input-b')).toBeInTheDocument()
  })

  it('submit button is disabled when inputs are empty', () => {
    render(<LandingScreen onSubmit={vi.fn()} />)
    const button = screen.getByTestId('submit-button')
    expect(button).toBeDisabled()
  })

  it('submit button enables when both inputs are filled with different values', async () => {
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={vi.fn()} />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'Pizza')

    expect(screen.getByTestId('submit-button')).not.toBeDisabled()
  })

  it('submit button stays disabled when both inputs are the same', async () => {
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={vi.fn()} />)

    await user.type(screen.getByTestId('input-a'), 'Pizza')
    await user.type(screen.getByTestId('input-b'), 'pizza')

    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('calls onSubmit with trimmed values', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={onSubmit} />)

    await user.type(screen.getByTestId('input-a'), '  Penguins  ')
    await user.type(screen.getByTestId('input-b'), '  Pizza  ')
    await user.click(screen.getByTestId('submit-button'))

    expect(onSubmit).toHaveBeenCalledWith('Penguins', 'Pizza')
  })

  it('shows error for same-word inputs on submit', async () => {
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={vi.fn()} />)

    // Type same word — button stays disabled, but let's test via Enter key
    await user.type(screen.getByTestId('input-a'), 'Same')
    await user.type(screen.getByTestId('input-b'), 'same')

    // Try submitting via Enter — should show error since validation runs
    fireEvent.keyDown(screen.getByTestId('input-b'), { key: 'Enter' })

    expect(screen.getByTestId('error-message')).toHaveTextContent(
      "can't investigate yourself",
    )
  })

  it('shows error for blocked input', async () => {
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={vi.fn()} />)

    await user.type(screen.getByTestId('input-a'), 'hitler')
    await user.type(screen.getByTestId('input-b'), 'pizza')
    await user.click(screen.getByTestId('submit-button'))

    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'classified beyond our clearance',
    )
  })

  it('renders example chips', () => {
    render(<LandingScreen onSubmit={vi.fn()} />)
    const chips = screen.getAllByTestId('example-chip')
    expect(chips.length).toBeGreaterThanOrEqual(4)
  })

  it('clicking a chip auto-submits', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={onSubmit} />)

    const chips = screen.getAllByTestId('example-chip')
    await user.click(chips[0])

    expect(onSubmit).toHaveBeenCalledWith('Penguins', 'IKEA Furniture')
  })

  it('pre-fills inputs from props', () => {
    render(<LandingScreen onSubmit={vi.fn()} initialA="Cats" initialB="Dogs" />)
    expect(screen.getByTestId('input-a')).toHaveValue('Cats')
    expect(screen.getByTestId('input-b')).toHaveValue('Dogs')
  })

  it('submits on Enter key', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<LandingScreen onSubmit={onSubmit} />)

    await user.type(screen.getByTestId('input-a'), 'Penguins')
    await user.type(screen.getByTestId('input-b'), 'Pizza')
    fireEvent.keyDown(screen.getByTestId('input-b'), { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('Penguins', 'Pizza')
  })
})
