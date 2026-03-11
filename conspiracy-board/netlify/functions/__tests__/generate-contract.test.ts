import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK before importing the handler
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

const VALID_NODE = {
  title: 'Test Node',
  emoji: '🔍',
  font_category: 'horror',
  teaser: 'A test teaser',
  briefing: 'A full briefing paragraph.',
}

const VALID_CHAIN_RESPONSE = {
  chain: Array.from({ length: 7 }, (_, i) => ({
    ...VALID_NODE,
    title: `Node ${i}`,
    font_category: (['horror', 'corporate', 'ancient', 'chaotic', 'scientific', 'military', 'mystical'] as const)[i],
  })),
  case_file_number: 'CASE FILE #4471-B',
  classification_level: 'TOP SECRET',
}

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost/.netlify/functions/generate', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  })
}

describe('generate handler — API contract', () => {
  let handler: (request: Request) => Promise<Response>
  let mockCreate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    mockCreate = vi.fn()
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    }) as unknown as InstanceType<typeof Anthropic>)

    const mod = await import('../generate.ts')
    handler = mod.default
    mod._resetRateLimiter()
  })

  // ── HTTP Method Contract ──────────────────────────────────────

  describe('HTTP method enforcement', () => {
    it('rejects GET with 405', async () => {
      const req = new Request('http://localhost/.netlify/functions/generate', { method: 'GET' })
      const res = await handler(req)
      expect(res.status).toBe(405)
    })

    it('rejects PUT with 405', async () => {
      const req = new Request('http://localhost/.netlify/functions/generate', {
        method: 'PUT',
        body: JSON.stringify({ conceptA: 'A', conceptB: 'B' }),
      })
      const res = await handler(req)
      expect(res.status).toBe(405)
    })

    it('rejects DELETE with 405', async () => {
      const req = new Request('http://localhost/.netlify/functions/generate', {
        method: 'DELETE',
        body: JSON.stringify({ conceptA: 'A', conceptB: 'B' }),
      })
      const res = await handler(req)
      expect(res.status).toBe(405)
    })

    it('rejects PATCH with 405', async () => {
      const req = new Request('http://localhost/.netlify/functions/generate', {
        method: 'PATCH',
        body: JSON.stringify({ conceptA: 'A', conceptB: 'B' }),
      })
      const res = await handler(req)
      expect(res.status).toBe(405)
    })

    it('405 response has correct error body structure', async () => {
      const req = new Request('http://localhost/.netlify/functions/generate', { method: 'GET' })
      const res = await handler(req)
      const body = await res.json()
      expect(body).toEqual({ error: 'method_not_allowed', message: 'Method not allowed' })
    })

    it('405 response has Content-Type application/json', async () => {
      const req = new Request('http://localhost/.netlify/functions/generate', { method: 'GET' })
      const res = await handler(req)
      expect(res.headers.get('Content-Type')).toBe('application/json')
    })
  })

  // ── Success Response Contract ─────────────────────────────────

  describe('200 success response structure', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(VALID_CHAIN_RESPONSE) }],
      })
    })

    it('returns 200 for valid request', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(200)
    })

    it('response has Content-Type application/json', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.headers.get('Content-Type')).toBe('application/json')
    })

    it('response body contains chain array with exactly 7 items', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(Array.isArray(body.chain)).toBe(true)
      expect(body.chain).toHaveLength(7)
    })

    it('each chain node has required string fields', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      for (const node of body.chain) {
        expect(typeof node.title).toBe('string')
        expect(typeof node.emoji).toBe('string')
        expect(typeof node.font_category).toBe('string')
        expect(typeof node.teaser).toBe('string')
        expect(typeof node.briefing).toBe('string')
        expect(node.title.length).toBeGreaterThan(0)
        expect(node.emoji.length).toBeGreaterThan(0)
        expect(node.teaser.length).toBeGreaterThan(0)
        expect(node.briefing.length).toBeGreaterThan(0)
      }
    })

    it('each chain node has a valid font_category', async () => {
      const validCategories = [
        'horror', 'corporate', 'ancient', 'chaotic', 'scientific',
        'military', 'mystical', 'retro', 'underground',
      ]
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      for (const node of body.chain) {
        expect(validCategories).toContain(node.font_category)
      }
    })

    it('response body contains non-empty case_file_number string', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(typeof body.case_file_number).toBe('string')
      expect(body.case_file_number.length).toBeGreaterThan(0)
    })

    it('response body contains non-empty classification_level string', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(typeof body.classification_level).toBe('string')
      expect(body.classification_level.length).toBeGreaterThan(0)
    })

    it('response body does not contain error field on success', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(body.error).toBeUndefined()
    })
  })

  // ── 400 Validation Error Contract ─────────────────────────────

  describe('400 validation error response structure', () => {
    it('missing conceptA returns error + message fields', async () => {
      const res = await handler(makeRequest({ conceptB: 'Pizza' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('message')
      expect(typeof body.error).toBe('string')
      expect(typeof body.message).toBe('string')
    })

    it('missing conceptB returns error + message fields', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('message')
    })

    it('empty body returns 400 with error + message', async () => {
      const res = await handler(makeRequest({}))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('validation')
      expect(body.message).toContain('required')
    })

    it('null concepts return 400', async () => {
      const res = await handler(makeRequest({ conceptA: null, conceptB: null }))
      expect(res.status).toBe(400)
    })

    it('numeric concepts return 400', async () => {
      const res = await handler(makeRequest({ conceptA: 123, conceptB: 456 }))
      expect(res.status).toBe(400)
    })

    it('boolean concepts return 400', async () => {
      const res = await handler(makeRequest({ conceptA: true, conceptB: false }))
      expect(res.status).toBe(400)
    })

    it('array concepts return 400', async () => {
      const res = await handler(makeRequest({ conceptA: ['a'], conceptB: ['b'] }))
      expect(res.status).toBe(400)
    })

    it('over-50-char concept returns 400 with length message', async () => {
      const long = 'x'.repeat(51)
      const res = await handler(makeRequest({ conceptA: long, conceptB: 'Pizza' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('validation')
      expect(body.message).toContain('50 characters')
    })

    it('exactly-50-char concept is accepted', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(VALID_CHAIN_RESPONSE) }],
      })
      const fifty = 'a'.repeat(50)
      const res = await handler(makeRequest({ conceptA: fifty, conceptB: 'Pizza' }))
      expect(res.status).toBe(200)
    })

    it('identical concepts (case-insensitive) return 400', async () => {
      const res = await handler(makeRequest({ conceptA: 'Pizza', conceptB: 'PIZZA' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('validation')
      expect(body.message).toContain('different')
    })

    it('all 400 responses have Content-Type application/json', async () => {
      const cases = [
        {},
        { conceptA: 'x'.repeat(51), conceptB: 'y' },
        { conceptA: 'same', conceptB: 'same' },
      ]
      for (const body of cases) {
        const res = await handler(makeRequest(body))
        expect(res.status).toBe(400)
        expect(res.headers.get('Content-Type')).toBe('application/json')
      }
    })
  })

  // ── Blocked Content Contract ──────────────────────────────────

  describe('400 blocked content response structure', () => {
    it('blocked first concept returns error=blocked', async () => {
      const res = await handler(makeRequest({ conceptA: 'hitler', conceptB: 'Pizza' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('blocked')
      expect(body.message).toContain('classified beyond')
    })

    it('blocked second concept returns error=blocked', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'holocaust' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('blocked')
    })

    it('leet-speak bypass returns blocked', async () => {
      const res = await handler(makeRequest({ conceptA: 'h1tl3r', conceptB: 'Pizza' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('blocked')
    })

    it('separator bypass returns blocked', async () => {
      const res = await handler(makeRequest({ conceptA: 'h.i.t.l.e.r', conceptB: 'Pizza' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('blocked')
    })

    it('blocked response has themed message, not raw term', async () => {
      const res = await handler(makeRequest({ conceptA: 'hitler', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(body.message).not.toContain('hitler')
      expect(body.message).toContain('classified')
    })
  })

  // ── 502 Invalid AI Response Contract ──────────────────────────

  describe('502 invalid AI response structure', () => {
    it('wrong chain length returns 502 with error=invalid_response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          ...VALID_CHAIN_RESPONSE,
          chain: VALID_CHAIN_RESPONSE.chain.slice(0, 3),
        }) }],
      })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(502)
      const body = await res.json()
      expect(body.error).toBe('invalid_response')
    })

    it('missing node fields return 502', async () => {
      const badChain = {
        ...VALID_CHAIN_RESPONSE,
        chain: VALID_CHAIN_RESPONSE.chain.map((n, i) =>
          i === 0 ? { ...n, title: '' } : n,
        ),
      }
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(badChain) }],
      })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(502)
    })

    it('invalid font_category returns 502', async () => {
      const badChain = {
        ...VALID_CHAIN_RESPONSE,
        chain: VALID_CHAIN_RESPONSE.chain.map((n, i) =>
          i === 0 ? { ...n, font_category: 'comic_sans' } : n,
        ),
      }
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(badChain) }],
      })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(502)
    })

    it('502 response has themed message, not raw validation error', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          ...VALID_CHAIN_RESPONSE,
          chain: [],
        }) }],
      })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(body.message).toContain('investigation has been shut down')
      expect(body.message).not.toContain('chain must have')
    })

    it('502 response has Content-Type application/json', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          ...VALID_CHAIN_RESPONSE,
          chain: [],
        }) }],
      })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.headers.get('Content-Type')).toBe('application/json')
    })
  })

  // ── 500 Server Error Contract ─────────────────────────────────

  describe('500 server error response structure', () => {
    it('SDK throw returns 500 with error=server_error', async () => {
      mockCreate.mockRejectedValue(new Error('API key invalid'))
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('server_error')
    })

    it('empty API content returns 500', async () => {
      mockCreate.mockResolvedValue({ content: [] })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(500)
    })

    it('non-JSON API text returns 500', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'I cannot help with that' }],
      })
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(500)
    })

    it('never leaks internal error details to client', async () => {
      mockCreate.mockRejectedValue(new Error('sk-ant-api03-LEAKED_KEY'))
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(JSON.stringify(body)).not.toContain('sk-ant-api03')
      expect(JSON.stringify(body)).not.toContain('LEAKED_KEY')
    })

    it('500 response has themed message', async () => {
      mockCreate.mockRejectedValue(new Error('timeout'))
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(body.message).toContain('investigation has been shut down')
    })

    it('500 response has Content-Type application/json', async () => {
      mockCreate.mockRejectedValue(new Error('fail'))
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.headers.get('Content-Type')).toBe('application/json')
    })
  })

  // ── Input Handling Contract ───────────────────────────────────

  describe('input handling behavior', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(VALID_CHAIN_RESPONSE) }],
      })
    })

    it('trims whitespace from concepts before processing', async () => {
      const res = await handler(makeRequest({ conceptA: '  Cats  ', conceptB: '  Pizza  ' }))
      expect(res.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringContaining('"Cats"'),
            }),
          ],
        }),
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringContaining('"Pizza"'),
            }),
          ],
        }),
      )
    })

    it('uses claude-sonnet-4-20250514 model', async () => {
      await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        }),
      )
    })

    it('sets max_tokens to 4000', async () => {
      await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4000,
        }),
      )
    })

    it('includes system prompt in API call with prompt caching', async () => {
      await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.stringContaining('conspiracy theory analyst'),
              cache_control: { type: 'ephemeral' },
            }),
          ]),
        }),
      )
    })

    it('includes both concepts in user message', async () => {
      await handler(makeRequest({ conceptA: 'Penguins', conceptB: 'IKEA' }))
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringMatching(/Penguins.*IKEA/),
            }),
          ],
        }),
      )
    })
  })

  // ── Rate Limiting ──────────────────────────────────────────────

  describe('rate limiting', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(VALID_CHAIN_RESPONSE) }],
      })
    })

    it('allows requests within rate limit', async () => {
      const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
      expect(res.status).toBe(200)
    })

    it('returns 429 after exceeding rate limit', async () => {
      // Send 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        await handler(makeRequest({ conceptA: `Concept${i}`, conceptB: 'Pizza' }))
      }
      // 21st request should be rate limited
      const res = await handler(makeRequest({ conceptA: 'OneMore', conceptB: 'Pizza' }))
      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBe('rate_limited')
    })

    it('429 response has Content-Type application/json', async () => {
      for (let i = 0; i < 20; i++) {
        await handler(makeRequest({ conceptA: `Concept${i}`, conceptB: 'Pizza' }))
      }
      const res = await handler(makeRequest({ conceptA: 'Extra', conceptB: 'Pizza' }))
      expect(res.status).toBe(429)
      expect(res.headers.get('Content-Type')).toBe('application/json')
    })

    it('429 response has themed message', async () => {
      for (let i = 0; i < 20; i++) {
        await handler(makeRequest({ conceptA: `Concept${i}`, conceptB: 'Pizza' }))
      }
      const res = await handler(makeRequest({ conceptA: 'Extra', conceptB: 'Pizza' }))
      const body = await res.json()
      expect(body.message).toContain('Too many investigations')
    })

    it('rate limits by IP from x-nf-client-connection-ip header', async () => {
      // Exhaust limit for IP 1.2.3.4
      for (let i = 0; i < 20; i++) {
        const req = new Request('http://localhost/.netlify/functions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nf-client-connection-ip': '1.2.3.4',
          },
          body: JSON.stringify({ conceptA: `A${i}`, conceptB: 'B' }),
        })
        await handler(req)
      }

      // IP 1.2.3.4 should be rate limited
      const limitedReq = new Request('http://localhost/.netlify/functions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '1.2.3.4',
        },
        body: JSON.stringify({ conceptA: 'Extra', conceptB: 'B' }),
      })
      const limitedRes = await handler(limitedReq)
      expect(limitedRes.status).toBe(429)

      // Different IP should still work
      const otherReq = new Request('http://localhost/.netlify/functions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '5.6.7.8',
        },
        body: JSON.stringify({ conceptA: 'Cats', conceptB: 'Pizza' }),
      })
      const otherRes = await handler(otherReq)
      expect(otherRes.status).toBe(200)
    })
  })

  // ── Error Response Consistency ────────────────────────────────

  describe('error response format consistency', () => {
    it('all error responses are valid JSON with error and message fields', async () => {
      const errorCases: Array<{ req: Request; expectedStatus: number }> = [
        {
          req: new Request('http://localhost/.netlify/functions/generate', { method: 'GET' }),
          expectedStatus: 405,
        },
        {
          req: makeRequest({}),
          expectedStatus: 400,
        },
        {
          req: makeRequest({ conceptA: 'x'.repeat(51), conceptB: 'y' }),
          expectedStatus: 400,
        },
        {
          req: makeRequest({ conceptA: 'same', conceptB: 'same' }),
          expectedStatus: 400,
        },
        {
          req: makeRequest({ conceptA: 'hitler', conceptB: 'Pizza' }),
          expectedStatus: 400,
        },
      ]

      for (const { req, expectedStatus } of errorCases) {
        const res = await handler(req)
        expect(res.status).toBe(expectedStatus)
        const body = await res.json()
        expect(typeof body.error).toBe('string')
        expect(res.headers.get('Content-Type')).toBe('application/json')
      }
    })

    it('validation errors use error=validation', async () => {
      const validationCases = [
        makeRequest({}),
        makeRequest({ conceptA: 'x'.repeat(51), conceptB: 'y' }),
        makeRequest({ conceptA: 'same', conceptB: 'same' }),
      ]
      for (const req of validationCases) {
        const res = await handler(req)
        const body = await res.json()
        expect(body.error).toBe('validation')
      }
    })

    it('blocked content uses error=blocked', async () => {
      const blockedCases = [
        makeRequest({ conceptA: 'hitler', conceptB: 'Pizza' }),
        makeRequest({ conceptA: 'Cats', conceptB: 'porn' }),
        makeRequest({ conceptA: 'sandy hook', conceptB: 'Pizza' }),
      ]
      for (const req of blockedCases) {
        const res = await handler(req)
        const body = await res.json()
        expect(body.error).toBe('blocked')
      }
    })
  })
})
