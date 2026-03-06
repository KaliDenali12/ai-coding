import { describe, it, expect } from 'vitest'
import { isBlocked, checkInputs } from '../blocklist.ts'

describe('isBlocked', () => {
  it('blocks known slurs', () => {
    expect(isBlocked('nigger')).toBe(true)
    expect(isBlocked('faggot')).toBe(true)
  })

  it('blocks case-insensitive', () => {
    expect(isBlocked('NIGGER')).toBe(true)
    expect(isBlocked('Faggot')).toBe(true)
  })

  it('blocks character substitution attempts', () => {
    expect(isBlocked('n1gg3r')).toBe(true)
    expect(isBlocked('f@gg0t')).toBe(true)
  })

  it('blocks political figures', () => {
    expect(isBlocked('trump')).toBe(true)
    expect(isBlocked('obama')).toBe(true)
    expect(isBlocked('hitler')).toBe(true)
  })

  it('blocks tragedy references', () => {
    expect(isBlocked('sandy hook')).toBe(true)
    expect(isBlocked('columbine')).toBe(true)
  })

  it('allows clean inputs', () => {
    expect(isBlocked('penguins')).toBe(false)
    expect(isBlocked('IKEA furniture')).toBe(false)
    expect(isBlocked('pizza')).toBe(false)
    expect(isBlocked('bermuda triangle')).toBe(false)
    expect(isBlocked('ancient egypt')).toBe(false)
  })
})

describe('checkInputs', () => {
  it('returns valid for clean, different inputs', () => {
    const result = checkInputs('Penguins', 'IKEA Furniture')
    expect(result).toEqual({ valid: true })
  })

  it('rejects empty inputs', () => {
    expect(checkInputs('', 'IKEA').valid).toBe(false)
    expect(checkInputs('Penguins', '').valid).toBe(false)
    expect(checkInputs('', '').valid).toBe(false)
  })

  it('rejects whitespace-only inputs', () => {
    expect(checkInputs('   ', 'IKEA').valid).toBe(false)
    expect(checkInputs('Penguins', '   ').valid).toBe(false)
  })

  it('rejects inputs over 50 characters', () => {
    const long = 'a'.repeat(51)
    expect(checkInputs(long, 'IKEA').valid).toBe(false)
    expect(checkInputs(long, 'IKEA').error).toContain('50 characters')
  })

  it('rejects same word (case-insensitive)', () => {
    const result = checkInputs('Pizza', 'pizza')
    expect(result.valid).toBe(false)
    expect(result.error).toContain("can't investigate yourself")
  })

  it('allows near-duplicates', () => {
    expect(checkInputs('Cat', 'Cats').valid).toBe(true)
  })

  it('rejects blocked terms', () => {
    const result = checkInputs('hitler', 'pizza')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('classified beyond our clearance')
  })

  it('rejects blocked terms in either field', () => {
    expect(checkInputs('pizza', 'hitler').valid).toBe(false)
  })
})
