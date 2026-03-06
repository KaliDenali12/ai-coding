import { describe, it, expect } from 'vitest'
import {
  calculateCardPositions,
  getPinPosition,
  generateStringPath,
  type LayoutConfig,
} from '../layout.ts'

const desktopConfig: LayoutConfig = {
  viewportWidth: 1920,
  viewportHeight: 1080,
  cardWidth: 200,
  cardHeight: 280,
  cardCount: 7,
  isMobile: false,
}

const mobileConfig: LayoutConfig = {
  viewportWidth: 375,
  viewportHeight: 812,
  cardWidth: 140,
  cardHeight: 200,
  cardCount: 7,
  isMobile: true,
}

describe('calculateCardPositions', () => {
  it('returns correct number of positions', () => {
    const positions = calculateCardPositions(desktopConfig)
    expect(positions).toHaveLength(7)
  })

  it('all positions have x, y, rotation', () => {
    const positions = calculateCardPositions(desktopConfig)
    for (const pos of positions) {
      expect(typeof pos.x).toBe('number')
      expect(typeof pos.y).toBe('number')
      expect(typeof pos.rotation).toBe('number')
    }
  })

  it('rotations are between -4 and 4 degrees', () => {
    const positions = calculateCardPositions(desktopConfig)
    for (const pos of positions) {
      expect(pos.rotation).toBeGreaterThanOrEqual(-4)
      expect(pos.rotation).toBeLessThanOrEqual(4)
    }
  })

  it('cards stay within viewport bounds (desktop)', () => {
    const positions = calculateCardPositions(desktopConfig)
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(0)
      expect(pos.y).toBeGreaterThanOrEqual(0)
      expect(pos.x + desktopConfig.cardWidth).toBeLessThanOrEqual(desktopConfig.viewportWidth)
      expect(pos.y + desktopConfig.cardHeight).toBeLessThanOrEqual(desktopConfig.viewportHeight)
    }
  })

  it('cards stay within viewport bounds (mobile)', () => {
    const positions = calculateCardPositions(mobileConfig)
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(0)
      expect(pos.y).toBeGreaterThanOrEqual(0)
      expect(pos.x + mobileConfig.cardWidth).toBeLessThanOrEqual(mobileConfig.viewportWidth)
      expect(pos.y + mobileConfig.cardHeight).toBeLessThanOrEqual(mobileConfig.viewportHeight)
    }
  })

  it('desktop: cards flow left-to-right', () => {
    const positions = calculateCardPositions(desktopConfig)
    // First card should be left, last card should be right
    expect(positions[0].x).toBeLessThan(positions[6].x)
  })

  it('mobile: cards flow top-to-bottom', () => {
    const positions = calculateCardPositions(mobileConfig)
    expect(positions[0].y).toBeLessThan(positions[6].y)
  })

  it('desktop: zigzag pattern alternates vertical position', () => {
    const positions = calculateCardPositions(desktopConfig)
    const centerY = desktopConfig.viewportHeight / 2
    // Even indices should tend above center, odd below (or vice versa)
    // Just check there's vertical variation
    const ys = positions.map((p) => p.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    expect(maxY - minY).toBeGreaterThan(centerY * 0.1) // At least some spread
  })

  it('produces deterministic results with same seed', () => {
    const pos1 = calculateCardPositions(desktopConfig, 123)
    const pos2 = calculateCardPositions(desktopConfig, 123)
    expect(pos1).toEqual(pos2)
  })

  it('produces different results with different seeds', () => {
    const pos1 = calculateCardPositions(desktopConfig, 123)
    const pos2 = calculateCardPositions(desktopConfig, 456)
    expect(pos1).not.toEqual(pos2)
  })
})

describe('getPinPosition', () => {
  it('returns center-top of card', () => {
    const pin = getPinPosition({ x: 100, y: 200, rotation: 0 }, 200)
    expect(pin.x).toBe(200) // 100 + 200/2
    expect(pin.y).toBe(212) // 200 + 12 (pin offset)
  })
})

describe('generateStringPath', () => {
  it('returns valid SVG path string', () => {
    const path = generateStringPath({ x: 100, y: 100 }, { x: 500, y: 300 })
    expect(path).toMatch(/^M \d/)
    expect(path).toContain('Q')
  })

  it('starts at from point', () => {
    const path = generateStringPath({ x: 100, y: 200 }, { x: 500, y: 300 })
    expect(path).toMatch(/^M 100 200/)
  })

  it('ends at to point', () => {
    const path = generateStringPath({ x: 100, y: 200 }, { x: 500, y: 300 })
    expect(path).toMatch(/500 300$/)
  })

  it('control point creates downward sag', () => {
    const path = generateStringPath({ x: 0, y: 0 }, { x: 400, y: 0 })
    // Parse control point Y — should be positive (below the line)
    const match = path.match(/Q (\d+) ([\d.]+)/)
    expect(match).toBeTruthy()
    const controlY = parseFloat(match![2])
    expect(controlY).toBeGreaterThan(0)
  })
})
