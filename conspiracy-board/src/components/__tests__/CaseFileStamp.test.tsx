import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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
  },
}))

describe('CaseFileStamp', () => {
  it('renders case file number and classification level', async () => {
    const { CaseFileStamp } = await import('../CaseFileStamp.tsx')
    render(
      <CaseFileStamp
        caseFileNumber="CASE FILE #1234-A"
        classificationLevel="TOP SECRET"
      />,
    )

    expect(screen.getByText('TOP SECRET')).toBeInTheDocument()
    expect(screen.getByText('CASE FILE #1234-A')).toBeInTheDocument()
  })

  it('has the correct test id', async () => {
    const { CaseFileStamp } = await import('../CaseFileStamp.tsx')
    render(
      <CaseFileStamp
        caseFileNumber="CASE FILE #9999-Z"
        classificationLevel="EYES ONLY"
      />,
    )

    expect(screen.getByTestId('case-file-stamp')).toBeInTheDocument()
  })

  it('is non-interactive (pointer-events-none and select-none)', async () => {
    const { CaseFileStamp } = await import('../CaseFileStamp.tsx')
    render(
      <CaseFileStamp
        caseFileNumber="CASE FILE #0001-X"
        classificationLevel="CLASSIFIED"
      />,
    )

    const stamp = screen.getByTestId('case-file-stamp')
    expect(stamp.className).toContain('pointer-events-none')
    expect(stamp.className).toContain('select-none')
  })

  it('renders different classification levels correctly', async () => {
    const { CaseFileStamp } = await import('../CaseFileStamp.tsx')
    const levels = ['TOP SECRET', 'EYES ONLY', 'RESTRICTED', 'CLASSIFIED']

    for (const level of levels) {
      const { unmount } = render(
        <CaseFileStamp caseFileNumber="CASE FILE #0000-A" classificationLevel={level} />,
      )
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    }
  })

  it('defaults delay to 0 when not provided', async () => {
    const { CaseFileStamp } = await import('../CaseFileStamp.tsx')
    // Should not throw when delay is omitted
    const { container } = render(
      <CaseFileStamp
        caseFileNumber="CASE FILE #0001-A"
        classificationLevel="TOP SECRET"
      />,
    )
    expect(container).toBeTruthy()
  })
})
