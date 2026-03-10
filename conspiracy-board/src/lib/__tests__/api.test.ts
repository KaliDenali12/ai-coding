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
  it('rejects null', () => {
    expect(() => validateChainResponse(null)).toThrow('not an object')
  })

  it('rejects non-object (string)', () => {
    expect(() => validateChainResponse('string')).toThrow('not an object')
  })

  it('rejects missing case_file_number (empty string)', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        case_file_number: '',
      }),
    ).toThrow('missing case_file_number')
  })

  it('rejects missing classification_level (empty string)', () => {
    expect(() =>
      validateChainResponse({
        ...validChain,
        classification_level: '',
      }),
    ).toThrow('missing classification_level')
  })

  it('rejects node with missing emoji (empty string)', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 0 ? { ...n, emoji: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 0: missing emoji')
  })

  it('rejects node with missing teaser (empty string)', () => {
    const badChain = {
      ...validChain,
      chain: validChain.chain.map((n, i) =>
        i === 1 ? { ...n, teaser: '' } : n,
      ),
    }
    expect(() => validateChainResponse(badChain)).toThrow('node 1: missing teaser')
  })

  it('rejects node with missing briefing (empty string)', () => {
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
