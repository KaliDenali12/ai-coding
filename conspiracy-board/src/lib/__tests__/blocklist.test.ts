import { describe, it, expect } from 'vitest'
import { isBlocked, checkInputs } from '../blocklist.ts'

describe('isBlocked', () => {
  it('blocks known slurs', () => {
    expect(isBlocked('nigger')).toBe(true)
    expect(isBlocked('faggot')).toBe(true)
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

  it('blocks tragedy references including columbine', () => {
    expect(isBlocked('columbine')).toBe(true)
  })
})

describe('checkInputs', () => {
  it('allows near-duplicates', () => {
    expect(checkInputs('Cat', 'Cats').valid).toBe(true)
  })
})
