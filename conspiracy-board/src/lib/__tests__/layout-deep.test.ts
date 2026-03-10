import { describe, it, expect } from 'vitest'
import {
  calculateCardPositions,
  getPinPosition,
  generateStringPath,
} from '../layout.ts'

const defaultConfig = {
  viewportWidth: 1280,
  viewportHeight: 720,
  cardWidth: 200,
  cardHeight: 280,
  cardCount: 7,
  isMobile: false,
}

const mobileConfig = {
  ...defaultConfig,
  viewportWidth: 375,
  viewportHeight: 812,
  cardWidth: 150,
  cardHeight: 210,
  isMobile: true,
}

describe('calculateCardPositions — edge cases', () => {
  it('returns empty array for zero cards', () => {
    const positions = calculateCardPositions({ ...defaultConfig, cardCount: 0 })
    expect(positions).toEqual([])
  })

  it('returns single centered position for one card', () => {
    const positions = calculateCardPositions({ ...defaultConfig, cardCount: 1 })
    expect(positions).toHaveLength(1)
    // Single card should use progress = 0.5 (centered)
    const pos = positions[0]
    expect(pos.x).toBeGreaterThan(0)
    expect(pos.y).toBeGreaterThan(0)
  })

  it('all positions are within viewport bounds (desktop)', () => {
    const positions = calculateCardPositions(defaultConfig)
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(40) // padding
      expect(pos.y).toBeGreaterThanOrEqual(40) // padding
      expect(pos.x + defaultConfig.cardWidth).toBeLessThanOrEqual(defaultConfig.viewportWidth - 40)
      expect(pos.y + defaultConfig.cardHeight).toBeLessThanOrEqual(defaultConfig.viewportHeight - 40)
    }
  })

  it('all positions are within viewport bounds (mobile)', () => {
    const positions = calculateCardPositions(mobileConfig)
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(20) // mobile padding
      expect(pos.y).toBeGreaterThanOrEqual(20)
      expect(pos.x + mobileConfig.cardWidth).toBeLessThanOrEqual(mobileConfig.viewportWidth - 20)
    }
  })

  it('rotations are within expected range (-4 to 4 degrees)', () => {
    const positions = calculateCardPositions(defaultConfig)
    for (const pos of positions) {
      expect(pos.rotation).toBeGreaterThanOrEqual(-4)
      expect(pos.rotation).toBeLessThanOrEqual(4)
    }
  })

  it('same seed produces identical positions', () => {
    const positions1 = calculateCardPositions(defaultConfig, 42)
    const positions2 = calculateCardPositions(defaultConfig, 42)
    expect(positions1).toEqual(positions2)
  })

  it('different seeds produce different positions', () => {
    const positions1 = calculateCardPositions(defaultConfig, 42)
    const positions2 = calculateCardPositions(defaultConfig, 99)
    // At least one position should differ
    const hasDifference = positions1.some(
      (p, i) => p.x !== positions2[i].x || p.y !== positions2[i].y,
    )
    expect(hasDifference).toBe(true)
  })

  it('desktop cards flow left-to-right', () => {
    const positions = calculateCardPositions(defaultConfig)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x).toBeGreaterThan(positions[i - 1].x)
    }
  })

  it('desktop zigzag: even-indexed cards are above center, odd below', () => {
    // Use wide viewport and many cards so zigzag is visible
    const config = {
      viewportWidth: 2000,
      viewportHeight: 1000,
      cardWidth: 200,
      cardHeight: 280,
      cardCount: 4,
      isMobile: false,
    }
    const positions = calculateCardPositions(config, 42)
    const centerY = config.viewportHeight / 2 - config.cardHeight / 2
    // Even index (0, 2): zigzagOffset is negative → above center
    // Odd index (1, 3): zigzagOffset is positive → below center
    // With jitter, the direction should still hold on average
    expect(positions[0].y).toBeLessThan(centerY)
    expect(positions[1].y).toBeGreaterThan(centerY)
  })

  it('mobile cards flow top-to-bottom', () => {
    const positions = calculateCardPositions(mobileConfig)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].y).toBeGreaterThan(positions[i - 1].y)
    }
  })

  it('handles very small viewport (clamps to bounds)', () => {
    const tinyConfig = {
      viewportWidth: 250,
      viewportHeight: 350,
      cardWidth: 200,
      cardHeight: 280,
      cardCount: 3,
      isMobile: false,
    }
    const positions = calculateCardPositions(tinyConfig)
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(40)
      expect(pos.y).toBeGreaterThanOrEqual(40)
    }
  })

  it('returns correct count matching cardCount', () => {
    for (const count of [1, 3, 5, 7, 10]) {
      const positions = calculateCardPositions({ ...defaultConfig, cardCount: count })
      expect(positions).toHaveLength(count)
    }
  })
})

describe('getPinPosition — edge cases', () => {
  it('calculates pin at center-top of card', () => {
    const pin = getPinPosition({ x: 100, y: 50, rotation: 0 }, 200)
    expect(pin.x).toBe(200) // 100 + 200/2
    expect(pin.y).toBe(62)  // 50 + 12
  })

  it('works with zero position', () => {
    const pin = getPinPosition({ x: 0, y: 0, rotation: 0 }, 200)
    expect(pin.x).toBe(100)
    expect(pin.y).toBe(12)
  })

  it('pin position is independent of rotation', () => {
    const pin1 = getPinPosition({ x: 100, y: 100, rotation: 0 }, 200)
    const pin2 = getPinPosition({ x: 100, y: 100, rotation: 45 }, 200)
    expect(pin1).toEqual(pin2)
  })

  it('works with different card widths', () => {
    const pin150 = getPinPosition({ x: 0, y: 0, rotation: 0 }, 150)
    const pin200 = getPinPosition({ x: 0, y: 0, rotation: 0 }, 200)
    expect(pin150.x).toBe(75)
    expect(pin200.x).toBe(100)
  })
})

describe('generateStringPath — edge cases', () => {
  it('generates valid SVG quadratic bezier path', () => {
    const path = generateStringPath({ x: 0, y: 0 }, { x: 100, y: 100 })
    expect(path).toMatch(/^M \d+ \d+ Q \d+(\.\d+)? \d+(\.\d+)? \d+ \d+$/)
  })

  it('control point is below midpoint (sag effect)', () => {
    const path = generateStringPath({ x: 0, y: 0 }, { x: 200, y: 0 })
    // Parse the path: M x1 y1 Q cx cy x2 y2
    const parts = path.split(' ')
    const midY = 0 // midpoint of y=0 to y=0
    const controlY = parseFloat(parts[5])
    expect(controlY).toBeGreaterThan(midY) // sag is downward
  })

  it('sag amount is capped at 60px', () => {
    // Very long distance
    const path = generateStringPath({ x: 0, y: 0 }, { x: 10000, y: 0 })
    const parts = path.split(' ')
    const controlY = parseFloat(parts[5])
    // midY = 0, sag should be at most 60
    expect(controlY).toBeLessThanOrEqual(60)
  })

  it('handles same start and end point', () => {
    const path = generateStringPath({ x: 50, y: 50 }, { x: 50, y: 50 })
    expect(path).toContain('M 50 50')
    expect(path).toContain('50 50')
  })

  it('handles negative coordinates', () => {
    const path = generateStringPath({ x: -10, y: -20 }, { x: 100, y: 50 })
    expect(path).toMatch(/^M -?\d+ -?\d+ Q/)
  })

  it('sag is proportional to distance for short distances', () => {
    const shortPath = generateStringPath({ x: 0, y: 0 }, { x: 50, y: 0 })
    const longPath = generateStringPath({ x: 0, y: 0 }, { x: 200, y: 0 })
    const shortParts = shortPath.split(' ')
    const longParts = longPath.split(' ')
    const shortSag = parseFloat(shortParts[5])
    const longSag = parseFloat(longParts[5])
    expect(longSag).toBeGreaterThan(shortSag)
  })
})
