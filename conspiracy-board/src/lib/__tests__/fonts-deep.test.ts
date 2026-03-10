import { describe, it, expect } from 'vitest'
import { getFontFamily, getFontClass, FONT_MAP, FONT_CLASS_MAP } from '../fonts.ts'
import { FONT_CATEGORIES } from '../../types/conspiracy.ts'
import type { FontCategory } from '../../types/conspiracy.ts'

describe('getFontFamily', () => {
  it.each(FONT_CATEGORIES.map((c) => [c]))('returns correct font for %s category', (category) => {
    const result = getFontFamily(category as FontCategory)
    expect(result).toBe(FONT_MAP[category as FontCategory])
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns fallback for unknown category', () => {
    // Force unknown category through type assertion
    const result = getFontFamily('nonexistent' as FontCategory)
    expect(result).toBe(FONT_MAP.chaotic)
  })

  it('all font families contain a fallback generic family', () => {
    for (const category of FONT_CATEGORIES) {
      const family = getFontFamily(category)
      const hasGeneric = ['serif', 'sans-serif', 'monospace', 'cursive', 'system-ui'].some(
        (generic) => family.includes(generic),
      )
      expect(hasGeneric).toBe(true)
    }
  })
})

describe('getFontClass', () => {
  it.each(FONT_CATEGORIES.map((c) => [c]))('returns correct class for %s category', (category) => {
    const result = getFontClass(category as FontCategory)
    expect(result).toBe(FONT_CLASS_MAP[category as FontCategory])
    expect(result).toMatch(/^font-/)
  })

  it('returns fallback for unknown category', () => {
    const result = getFontClass('nonexistent' as FontCategory)
    expect(result).toBe(FONT_CLASS_MAP.chaotic)
  })

  it('all classes follow font-* naming convention', () => {
    for (const category of FONT_CATEGORIES) {
      expect(getFontClass(category)).toMatch(/^font-[a-z]+$/)
    }
  })
})

describe('FONT_MAP and FONT_CLASS_MAP consistency', () => {
  it('both maps have the same keys', () => {
    const fontMapKeys = Object.keys(FONT_MAP).sort()
    const classMapKeys = Object.keys(FONT_CLASS_MAP).sort()
    expect(fontMapKeys).toEqual(classMapKeys)
  })

  it('all FONT_CATEGORIES are covered in both maps', () => {
    for (const category of FONT_CATEGORIES) {
      expect(FONT_MAP).toHaveProperty(category)
      expect(FONT_CLASS_MAP).toHaveProperty(category)
    }
  })

  it('no extra keys exist beyond FONT_CATEGORIES', () => {
    expect(Object.keys(FONT_MAP)).toHaveLength(FONT_CATEGORIES.length)
    expect(Object.keys(FONT_CLASS_MAP)).toHaveLength(FONT_CATEGORIES.length)
  })
})
