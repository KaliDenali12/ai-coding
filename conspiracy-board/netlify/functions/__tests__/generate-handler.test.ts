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
    mod._resetCircuitBreaker()
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

  it('circuit breaker opens after 3 consecutive API failures', async () => {
    mockCreate.mockRejectedValue(new Error('API down'))

    // 3 failures to trip the breaker
    for (let i = 0; i < 3; i++) {
      await handler(makeRequest({ conceptA: `Test${i}`, conceptB: 'Pizza' }))
    }

    // 4th request should be rejected by circuit breaker (503, no API call)
    const callCountBefore = mockCreate.mock.calls.length
    const res = await handler(makeRequest({ conceptA: 'Another', conceptB: 'Test' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('server_error')
    expect(body.message).toContain('temporarily unavailable')
    // Verify API was NOT called
    expect(mockCreate.mock.calls.length).toBe(callCountBefore)
  })

  it('circuit breaker resets after a successful request', async () => {
    const validResponse = {
      content: [{ type: 'text', text: JSON.stringify({
        chain: Array.from({ length: 7 }, (_, i) => ({
          title: `Node ${i}`, emoji: '🔍', font_category: 'horror',
          teaser: 'Test teaser', briefing: 'Test briefing',
        })),
        case_file_number: 'CASE FILE #1234-A',
        classification_level: 'TOP SECRET',
      }) }],
      usage: { input_tokens: 100, output_tokens: 200 },
      model: 'test-model',
    }

    // 2 failures (below threshold)
    mockCreate.mockRejectedValueOnce(new Error('fail'))
    mockCreate.mockRejectedValueOnce(new Error('fail'))
    await handler(makeRequest({ conceptA: 'A1', conceptB: 'B1' }))
    await handler(makeRequest({ conceptA: 'A2', conceptB: 'B2' }))

    // 1 success resets the counter
    mockCreate.mockResolvedValueOnce(validResponse)
    const successRes = await handler(makeRequest({ conceptA: 'A3', conceptB: 'B3' }))
    expect(successRes.status).toBe(200)

    // 2 more failures (still below threshold since counter was reset)
    mockCreate.mockRejectedValueOnce(new Error('fail'))
    mockCreate.mockRejectedValueOnce(new Error('fail'))
    const res1 = await handler(makeRequest({ conceptA: 'A4', conceptB: 'B4' }))
    const res2 = await handler(makeRequest({ conceptA: 'A5', conceptB: 'B5' }))
    // These should still hit the API (not circuit-broken)
    expect(res1.status).toBe(500)
    expect(res2.status).toBe(500)
  })
})
