import { describe, it, expect } from 'vitest'
import {
  calculateCardPositions,
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

describe('calculateCardPositions', () => {
  it('all positions have x, y, rotation properties', () => {
    const positions = calculateCardPositions(desktopConfig)
    for (const pos of positions) {
      expect(typeof pos.x).toBe('number')
      expect(typeof pos.y).toBe('number')
      expect(typeof pos.rotation).toBe('number')
    }
  })
})

describe('generateStringPath', () => {
  it('starts at from point', () => {
    const path = generateStringPath({ x: 100, y: 200 }, { x: 500, y: 300 })
    expect(path).toMatch(/^M 100 200/)
  })

  it('ends at to point', () => {
    const path = generateStringPath({ x: 100, y: 200 }, { x: 500, y: 300 })
    expect(path).toMatch(/500 300$/)
  })
})
