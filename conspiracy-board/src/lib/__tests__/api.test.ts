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

describe('validateChainResponse', () => {
  it('accepts a valid chain response', () => {
    const result = validateChainResponse(validChain)
    expect(result.chain).toHaveLength(7)
    expect(result.case_file_number).toBe('CASE FILE #1234-A')
    expect(result.classification_level).toBe('TOP SECRET')
  })

  it('rejects null', () => {
    expect(() => validateChainResponse(null)).toThrow('not an object')
  })

  it('rejects non-object', () => {
    expect(() => validateChainResponse('string')).toThrow('not an object')
  })

  it('rejects chain with wrong length', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        chain: validChain.chain.slice(0, 5),
      }),
    ).toThrow('exactly 7 items')
  })

  it('rejects missing case_file_number', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        case_file_number: '',
      }),
    ).toThrow('missing case_file_number')
  })

  it('rejects missing classification_level', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        classification_level: '',
      }),
    ).toThrow('missing classification_level')
  })

  it('rejects node with missing title', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 3 ? { ...n, title: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 3: missing title')
  })

  it('rejects node with missing emoji', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 0 ? { ...n, emoji: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 0: missing emoji')
  })

  it('rejects node with invalid font_category', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 2 ? { ...n, font_category: 'comic_sans' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('invalid font_category')
  })

  it('rejects node with missing teaser', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 1 ? { ...n, teaser: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 1: missing teaser')
  })

  it('rejects node with missing briefing', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 6 ? { ...n, briefing: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 6: missing briefing')
  })

  it('accepts all valid font categories', () => {
    const categories = [
      'horror', 'corporate', 'ancient', 'chaotic', 'scientific',
      'military', 'mystical', 'retro', 'underground',
    ]
    for (const cat of categories) {
      const chain = {
        ...validChain,
        chain: validChain.chain.map((n) => ({ ...n, font_category: cat })),
      }
      expect(() => validateChainResponse(chain)).not.toThrow()
    }
  })
})
