import { describe, it, expect } from 'vitest'

// Test the validation logic directly (extracted for testing)
// We re-test the same patterns since the server has its own copy of blocklist

const FONT_CATEGORIES = [
  'horror', 'corporate', 'ancient', 'chaotic', 'scientific',
  'military', 'mystical', 'retro', 'underground',
] as const

function validateResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.chain) || obj.chain.length !== 7) return false
  if (typeof obj.case_file_number !== 'string' || !obj.case_file_number) return false
  if (typeof obj.classification_level !== 'string' || !obj.classification_level) return false

  for (let i = 0; i < obj.chain.length; i++) {
    const node = obj.chain[i] as Record<string, unknown>
    if (typeof node.title !== 'string' || !node.title) return false
    if (typeof node.emoji !== 'string' || !node.emoji) return false
    if (typeof node.font_category !== 'string' || !(FONT_CATEGORIES as readonly string[]).includes(node.font_category)) return false
    if (typeof node.teaser !== 'string' || !node.teaser) return false
    if (typeof node.briefing !== 'string' || !node.briefing) return false
  }

  return true
}

const validNode = {
  title: 'Test Node',
  emoji: '🔍',
  font_category: 'horror',
  teaser: 'A test teaser.',
  briefing: 'A full briefing paragraph.',
}

const validResponse = {
  chain: Array.from({ length: 7 }, (_, i) => ({ ...validNode, title: `Node ${i}` })),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
}

describe('Server-side response validation', () => {
  it('accepts valid response', () => {
    expect(validateResponse(validResponse)).toBe(true)
  })

  it('rejects null', () => {
    expect(validateResponse(null)).toBe(false)
  })

  it('rejects wrong chain length', () => {
    expect(validateResponse({
      ...validResponse,
      chain: validResponse.chain.slice(0, 3),
    })).toBe(false)
  })

  it('rejects invalid font_category', () => {
    expect(validateResponse({
      ...validResponse,
      chain: validResponse.chain.map((n, i) =>
        i === 0 ? { ...n, font_category: 'comic_sans' } : n,
      ),
    })).toBe(false)
  })

  it('rejects missing required fields', () => {
    expect(validateResponse({
      ...validResponse,
      chain: validResponse.chain.map((n, i) =>
        i === 2 ? { ...n, briefing: '' } : n,
      ),
    })).toBe(false)
  })

  it('rejects missing case_file_number', () => {
    expect(validateResponse({ ...validResponse, case_file_number: '' })).toBe(false)
  })

  it('accepts all font categories', () => {
    for (const cat of FONT_CATEGORIES) {
      const response = {
        ...validResponse,
        chain: validResponse.chain.map((n) => ({ ...n, font_category: cat })),
      }
      expect(validateResponse(response)).toBe(true)
    }
  })
})

describe('System prompt contract', () => {
  it('requires exactly 7 chain items', () => {
    expect(validResponse.chain).toHaveLength(7)
  })

  it('chain items have all required fields', () => {
    for (const node of validResponse.chain) {
      expect(node).toHaveProperty('title')
      expect(node).toHaveProperty('emoji')
      expect(node).toHaveProperty('font_category')
      expect(node).toHaveProperty('teaser')
      expect(node).toHaveProperty('briefing')
    }
  })

  it('response has case file metadata', () => {
    expect(validResponse).toHaveProperty('case_file_number')
    expect(validResponse).toHaveProperty('classification_level')
  })
})
