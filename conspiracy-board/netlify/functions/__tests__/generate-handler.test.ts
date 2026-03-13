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
    mod._resetRateLimiter()
  })

  it('returns 500 when API returns invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json {{{' }],
    })

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(500)
  })

  it('never leaks raw error messages to client', async () => {
    mockCreate.mockRejectedValue(new Error('Secret API internals'))

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    const body = await res.json()
    expect(body.message).not.toContain('Secret API internals')
    expect(body.message).toContain('investigation has been shut down')
  })

  it('server-side blocklist catches leet-speak (7rump variant)', async () => {
    const res = await handler(makeRequest({ conceptA: '7rump', conceptB: 'Pizza' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('blocked')
  })

  it('returns X-Request-Id header on every response', async () => {
    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    const requestId = res.headers.get('X-Request-Id')
    expect(requestId).toBeTruthy()
    // UUID v4 format
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('echoes client-provided X-Request-Id header', async () => {
    const clientId = 'client-trace-abc123'
    const req = new Request('http://localhost/.netlify/functions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': clientId },
      body: JSON.stringify({ conceptA: 'Cats', conceptB: 'Pizza' }),
    })
    const res = await handler(req)
    expect(res.headers.get('X-Request-Id')).toBe(clientId)
  })

  it('returns X-Request-Id even on validation errors', async () => {
    const res = await handler(makeRequest({}))
    expect(res.status).toBe(400)
    expect(res.headers.get('X-Request-Id')).toBeTruthy()
  })
})
