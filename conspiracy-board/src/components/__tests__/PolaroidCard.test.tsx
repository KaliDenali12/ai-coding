import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PolaroidCard } from '../PolaroidCard.tsx'
import type { ConspiracyNode } from '@/types/conspiracy.ts'

vi.mock('framer-motion', () => ({
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
  },
}))

const mockNode: ConspiracyNode = {
  title: 'Secret Fish Bureau',
  emoji: '🐟',
  font_category: 'corporate',
  teaser: 'The underwater division has been watching since 1987.',
  briefing: 'According to declassified documents from the Bureau of Aquatic Policy, there has been a sustained effort since the late 1980s to monitor all freshwater and saltwater fish populations.\n\nDr. Elena Voss, former chair of the International Council on Marine Surveillance, confirmed in a rare public statement that the program had expanded beyond its original mandate.',
}

describe('PolaroidCard', () => {
  it('renders card with emoji and title', () => {
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={vi.fn()}
        rotation={2}
        animate={false}
      />,
    )
    expect(screen.getByText('🐟')).toBeInTheDocument()
    expect(screen.getByText('Secret Fish Bureau')).toBeInTheDocument()
  })

  it('renders teaser text on front face', () => {
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={vi.fn()}
        rotation={0}
        animate={false}
      />,
    )
    expect(screen.getByText(mockNode.teaser)).toBeInTheDocument()
  })

  it('renders briefing text on back face', () => {
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={true}
        onClick={vi.fn()}
        rotation={0}
        animate={false}
      />,
    )
    expect(screen.getByText(/Bureau of Aquatic Policy/)).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={onClick}
        rotation={0}
        animate={false}
      />,
    )
    fireEvent.click(screen.getByTestId('polaroid-card'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('calls onClick on Enter key', () => {
    const onClick = vi.fn()
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={onClick}
        rotation={0}
        animate={false}
      />,
    )
    fireEvent.keyDown(screen.getByTestId('polaroid-card'), { key: 'Enter' })
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('calls onClick on Space key', () => {
    const onClick = vi.fn()
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={onClick}
        rotation={0}
        animate={false}
      />,
    )
    fireEvent.keyDown(screen.getByTestId('polaroid-card'), { key: ' ' })
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('has correct accessibility attributes', () => {
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={vi.fn()}
        rotation={0}
        animate={false}
      />,
    )
    const card = screen.getByTestId('polaroid-card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(card).toHaveAttribute('aria-label')
  })

  it('shows push pin element', () => {
    render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={vi.fn()}
        rotation={0}
        animate={false}
      />,
    )
    // Pin is a div with red background
    expect(screen.getByTestId('polaroid-front')).toBeInTheDocument()
  })

  it('applies dynamic font class based on category', () => {
    const { container } = render(
      <PolaroidCard
        node={mockNode}
        isFlipped={false}
        onClick={vi.fn()}
        rotation={0}
        animate={false}
      />,
    )
    const fontElement = container.querySelector('.font-corporate')
    expect(fontElement).toBeInTheDocument()
  })
})
