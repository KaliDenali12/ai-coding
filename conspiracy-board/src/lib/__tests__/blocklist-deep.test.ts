import { describe, it, expect } from 'vitest'
import { isBlocked, checkInputs } from '../blocklist.ts'

describe('isBlocked — leet-speak and normalization', () => {
  it('catches basic leet-speak substitutions', () => {
    // @ → a, 0 → o, 1 → i, 3 → e, $ → s, 5 → s, 7 → t
    expect(isBlocked('h1tl3r')).toBe(true) // h!tler → hitler
    expect(isBlocked('tr@mp')).toBe(false) // tr@mp → tramp, not trump
    expect(isBlocked('7rump')).toBe(true)  // 7rump → trump
  })

  it('catches terms with separator bypasses', () => {
    expect(isBlocked('h.i.t.l.e.r')).toBe(true)
    expect(isBlocked('h-i-t-l-e-r')).toBe(true)
    expect(isBlocked('h_i_t_l_e_r')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isBlocked('HITLER')).toBe(true)
    expect(isBlocked('Hitler')).toBe(true)
    expect(isBlocked('hItLeR')).toBe(true)
  })

  it('detects multi-word blocked terms', () => {
    expect(isBlocked('sandy hook')).toBe(true)
    expect(isBlocked('SANDY HOOK')).toBe(true)
    expect(isBlocked('school shooting')).toBe(true)
  })

  it('allows clean inputs', () => {
    expect(isBlocked('penguins')).toBe(false)
    expect(isBlocked('pizza')).toBe(false)
    expect(isBlocked('quantum physics')).toBe(false)
    expect(isBlocked('IKEA furniture')).toBe(false)
  })

  it('handles empty string', () => {
    expect(isBlocked('')).toBe(false)
  })

  it('handles strings with only whitespace', () => {
    expect(isBlocked('   ')).toBe(false)
  })

  it('catches partial matches within longer strings', () => {
    expect(isBlocked('I love cats and porn sites')).toBe(true)
    expect(isBlocked('the word faggot is bad')).toBe(true)
  })

  it('handles special characters in input', () => {
    expect(isBlocked('hello!world')).toBe(false)
    expect(isBlocked('$talin')).toBe(true)  // $talin → stalin
  })

  it('catches space-insertion bypass attempts on single-word terms', () => {
    expect(isBlocked('h itler')).toBe(true)
    expect(isBlocked('nig ger')).toBe(true)
    expect(isBlocked('fa gg ot')).toBe(true)
    expect(isBlocked('hol ocaust')).toBe(true)
  })

  it('still catches multi-word terms normally with spaces', () => {
    expect(isBlocked('school shooting')).toBe(true)
    expect(isBlocked('sandy hook')).toBe(true)
    expect(isBlocked('bin laden')).toBe(true)
  })

  it('handles + substitution for t', () => {
    expect(isBlocked('+rump')).toBe(true)  // +rump → trump
  })

  it('handles ! substitution for i', () => {
    expect(isBlocked('b!den')).toBe(true) // b!den → biden
  })
})

describe('checkInputs — validation edge cases', () => {
  it('rejects empty strings', () => {
    expect(checkInputs('', '')).toEqual({
      valid: false,
      error: 'Both fields are required.',
    })
  })

  it('rejects whitespace-only inputs', () => {
    expect(checkInputs('  ', '  ')).toEqual({
      valid: false,
      error: 'Both fields are required.',
    })
  })

  it('rejects when only first concept is empty', () => {
    const result = checkInputs('', 'Pizza')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Both fields are required.')
  })

  it('rejects when only second concept is empty', () => {
    const result = checkInputs('Cats', '')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Both fields are required.')
  })

  it('rejects concepts longer than 50 characters', () => {
    const longString = 'a'.repeat(51)
    const result = checkInputs(longString, 'Pizza')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50 characters')
  })

  it('accepts concepts at exactly 50 characters', () => {
    const fiftyChars = 'a'.repeat(50)
    const result = checkInputs(fiftyChars, 'Pizza')
    expect(result.valid).toBe(true)
  })

  it('rejects when both concepts exceed 50 characters', () => {
    const longA = 'a'.repeat(51)
    const longB = 'b'.repeat(51)
    const result = checkInputs(longA, longB)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50 characters')
  })

  it('rejects same concepts case-insensitively', () => {
    const result = checkInputs('Pizza', 'PIZZA')
    expect(result.valid).toBe(false)
    expect(result.error).toContain("can't investigate yourself")
  })

  it('rejects same concepts with whitespace difference', () => {
    const result = checkInputs('  Pizza  ', '  pizza  ')
    expect(result.valid).toBe(false)
  })

  it('accepts valid different concepts', () => {
    const result = checkInputs('Cats', 'Pizza')
    expect(result).toEqual({ valid: true })
  })

  it('rejects blocked first concept', () => {
    const result = checkInputs('hitler', 'Pizza')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('classified beyond our clearance')
  })

  it('rejects blocked second concept', () => {
    const result = checkInputs('Pizza', 'holocaust')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('classified beyond our clearance')
  })

  it('checks length before duplicate check', () => {
    // Both are same but over 50 chars — length error should come first
    const long = 'a'.repeat(51)
    const result = checkInputs(long, long)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50 characters')
  })

  it('handles unicode characters in valid input', () => {
    const result = checkInputs('日本語', 'Pizza')
    expect(result.valid).toBe(true)
  })

  it('handles emoji in valid input', () => {
    const result = checkInputs('🐱 Cats', '🍕 Pizza')
    expect(result.valid).toBe(true)
  })
})
