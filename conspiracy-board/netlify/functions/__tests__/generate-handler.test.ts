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

const validChainJSON = {
  chain: Array.from({ length: 7 }, (_, i) => ({
    title: `Node ${i}`,
    emoji: '🔍',
    font_category: 'horror',
    teaser: `Teaser ${i}`,
    briefing: `Briefing ${i}`,
  })),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
}

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost/.netlify/functions/generate', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  })
}

describe('generate handler', () => {
  let handler: (request: Request) => Promise<Response>
  let mockCreate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import fresh handler
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    mockCreate = vi.fn()
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    }) as unknown as InstanceType<typeof Anthropic>)

    const mod = await import('../generate.ts')
    handler = mod.default
  })

  it('rejects non-POST requests with 405', async () => {
    const req = new Request('http://localhost/.netlify/functions/generate', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
    const body = await res.json()
    expect(body.error).toBe('Method not allowed')
  })

  it('rejects missing concepts with 400', async () => {
    const res = await handler(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('required')
  })

  it('rejects non-string concepts with 400', async () => {
    const res = await handler(makeRequest({ conceptA: 123, conceptB: 'Pizza' }))
    expect(res.status).toBe(400)
  })

  it('rejects concepts over 50 characters', async () => {
    const long = 'a'.repeat(51)
    const res = await handler(makeRequest({ conceptA: long, conceptB: 'Pizza' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('50 characters')
  })

  it('rejects identical concepts (case-insensitive)', async () => {
    const res = await handler(makeRequest({ conceptA: 'Pizza', conceptB: 'PIZZA' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('different')
  })

  it('rejects blocked content', async () => {
    const res = await handler(makeRequest({ conceptA: 'hitler', conceptB: 'Pizza' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('blocked')
    expect(body.message).toContain('classified beyond')
  })

  it('returns valid chain on successful API call', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validChainJSON) }],
    })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.chain).toHaveLength(7)
    expect(body.case_file_number).toBe('CASE FILE #1234-A')
  })

  it('returns 500 when API returns no text block', async () => {
    mockCreate.mockResolvedValue({ content: [] })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when API returns invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json {{{' }],
    })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(500)
  })

  it('returns 502 when API returns wrong chain length', async () => {
    const badChain = { ...validChainJSON, chain: validChainJSON.chain.slice(0, 3) }
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(badChain) }],
    })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('invalid_response')
  })

  it('returns 502 when chain node has invalid font_category', async () => {
    const badChain = {
      ...validChainJSON,
      chain: validChainJSON.chain.map((n, i) =>
        i === 0 ? { ...n, font_category: 'comic_sans' } : n,
      ),
    }
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(badChain) }],
    })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(502)
  })

  it('returns 500 when Anthropic SDK throws', async () => {
    mockCreate.mockRejectedValue(new Error('API key invalid'))

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('server_error')
  })

  it('never leaks raw error messages to client', async () => {
    mockCreate.mockRejectedValue(new Error('Secret API internals'))

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    const body = await res.json()
    expect(body.message).not.toContain('Secret API internals')
    expect(body.message).toContain('investigation has been shut down')
  })

  it('trims whitespace from concepts', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validChainJSON) }],
    })

    const res = await handler(makeRequest({ conceptA: '  Cats  ', conceptB: '  Pizza  ' }))
    expect(res.status).toBe(200)

    // Verify trimmed values are passed to API
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining('"Cats"'),
          }),
        ],
      }),
    )
  })

  it('server-side blocklist catches leet-speak', async () => {
    const res = await handler(makeRequest({ conceptA: '7rump', conceptB: 'Pizza' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('blocked')
  })

  it('response has Content-Type application/json header', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validChainJSON) }],
    })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })
})
