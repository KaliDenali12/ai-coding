import { describe, it, expect } from 'vitest'
import { getFontFamily, getFontClass, FONT_MAP, FONT_CLASS_MAP } from '../fonts.ts'
import { FONT_CATEGORIES } from '@/types/conspiracy.ts'

describe('FONT_MAP', () => {
  it('has an entry for every font category', () => {
    for (const category of FONT_CATEGORIES) {
      expect(FONT_MAP[category]).toBeDefined()
      expect(typeof FONT_MAP[category]).toBe('string')
      expect(FONT_MAP[category].length).toBeGreaterThan(0)
    }
  })
})

describe('FONT_CLASS_MAP', () => {
  it('has an entry for every font category', () => {
    for (const category of FONT_CATEGORIES) {
      expect(FONT_CLASS_MAP[category]).toBeDefined()
      expect(FONT_CLASS_MAP[category]).toMatch(/^font-/)
    }
  })
})

describe('getFontFamily', () => {
  it('returns correct font family for each category', () => {
    expect(getFontFamily('horror')).toContain('Creepster')
    expect(getFontFamily('corporate')).toContain('Orbitron')
    expect(getFontFamily('ancient')).toContain('Cinzel')
    expect(getFontFamily('military')).toContain('Black Ops One')
  })
})

describe('getFontClass', () => {
  it('returns correct CSS class for each category', () => {
    expect(getFontClass('horror')).toBe('font-horror')
    expect(getFontClass('corporate')).toBe('font-corporate')
    expect(getFontClass('mystical')).toBe('font-mystical')
  })
})
