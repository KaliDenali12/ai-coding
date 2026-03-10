import { describe, it, expect } from 'vitest'
import { validateChainResponse } from '../api.ts'

const validNode = {
  title: 'Test Node',
  emoji: '🔍',
  font_category: 'horror',
  teaser: 'A test teaser.',
  briefing: 'A full briefing paragraph for testing.',
}

const validChain = {
  chain: Array.from({ length: 7 }, (_, i) => ({
    ...validNode,
    title: `Node ${i}`,
  })),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
}

describe('validateChainResponse — deep edge cases', () => {
  it('rejects undefined', () => {
    expect(() => validateChainResponse(undefined)).toThrow('not an object')
  })

  it('rejects number', () => {
    expect(() => validateChainResponse(42)).toThrow('not an object')
  })

  it('rejects boolean', () => {
    expect(() => validateChainResponse(true)).toThrow('not an object')
  })

  it('rejects empty object', () => {
    expect(() => validateChainResponse({})).toThrow('chain must have exactly 7 items')
  })

  it('rejects chain that is not an array', () => {
    expect(() =>
      validateChainResponse({
        chain: 'not-array',
        case_file_number: 'X',
        classification_level: 'Y',
      }),
    ).toThrow('chain must have exactly 7 items')
  })

  it('rejects empty chain array', () => {
    expect(() =>
      validateChainResponse({
        chain: [],
        case_file_number: 'X',
        classification_level: 'Y',
      }),
    ).toThrow('chain must have exactly 7 items')
  })

  it('rejects chain with 6 items', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        chain: validChain.chain.slice(0, 6),
      }),
    ).toThrow('exactly 7 items')
  })

  it('rejects chain with 8 items', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        chain: [...validChain.chain, { ...validNode, title: 'Extra' }],
      }),
    ).toThrow('exactly 7 items')
  })

  it('rejects numeric case_file_number', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        case_file_number: 1234,
      }),
    ).toThrow('missing case_file_number')
  })

  it('rejects null case_file_number', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        case_file_number: null,
      }),
    ).toThrow('missing case_file_number')
  })

  it('rejects numeric classification_level', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        classification_level: 42,
      }),
    ).toThrow('missing classification_level')
  })

  it('error message includes node index for missing title', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 5 ? { ...n, title: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 5: missing title')
  })

  it('rejects node with null emoji', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 0 ? { ...n, emoji: null } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 0: missing emoji')
  })

  it('rejects node with numeric title', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 4 ? { ...n, title: 123 } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 4: missing title')
  })

  it('rejects node with null font_category', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 0 ? { ...n, font_category: null } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('invalid font_category')
  })

  it('error message includes the bad font_category value', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 2 ? { ...n, font_category: 'papyrus' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('"papyrus"')
  })

  it('validates all 7 nodes, not just the first', () => {
    // Only the last node is bad
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 6 ? { ...n, teaser: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 6: missing teaser')
  })

  it('returns the exact data passed in when valid', () => {
    const result = validateChainResponse(validChain)
    expect(result).toBe(validChain)
  })
})
