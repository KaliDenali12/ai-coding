import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RedString } from '../RedString.tsx'

// jsdom doesn't have SVGPathElement.getTotalLength — polyfill it
beforeAll(() => {
  if (typeof SVGElement !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SVGElement.prototype as any).getTotalLength = () => 500
  }
})

afterEach(() => {
  vi.useRealTimers()
})

const testPath = 'M 100 100 Q 300 200 500 100'

function renderInSvg(component: React.ReactElement) {
  return render(<svg>{component}</svg>)
}

describe('RedString', () => {
  it('renders an SVG path element', () => {
    renderInSvg(<RedString path={testPath} animate={false} />)
    expect(screen.getByTestId('red-string')).toBeInTheDocument()
  })

  it('uses the provided path', () => {
    renderInSvg(<RedString path={testPath} animate={false} />)
    expect(screen.getByTestId('red-string')).toHaveAttribute('d', testPath)
  })

  it('has red stroke styling', () => {
    renderInSvg(<RedString path={testPath} animate={false} />)
    const pathEl = screen.getByTestId('red-string')
    expect(pathEl).toHaveAttribute('stroke', 'var(--color-string-red)')
    expect(pathEl).toHaveAttribute('fill', 'none')
  })

  it('has rounded stroke caps', () => {
    renderInSvg(<RedString path={testPath} animate={false} />)
    expect(screen.getByTestId('red-string')).toHaveAttribute('stroke-linecap', 'round')
  })

  it('is visible immediately when animate=false', () => {
    renderInSvg(<RedString path={testPath} animate={false} />)
    expect(screen.getByTestId('red-string')).toHaveAttribute('opacity', '1')
  })

  it('starts hidden when animate=true', () => {
    vi.useFakeTimers()
    renderInSvg(<RedString path={testPath} animate={true} delay={1000} />)
    expect(screen.getByTestId('red-string')).toHaveAttribute('opacity', '0')
  })

  it('becomes visible after delay when animate=true', () => {
    vi.useFakeTimers()
    renderInSvg(<RedString path={testPath} animate={true} delay={500} />)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByTestId('red-string')).toHaveAttribute('opacity', '1')
  })
})
