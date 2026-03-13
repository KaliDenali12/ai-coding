import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost/.netlify/functions/generate', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  })
}

/** Wrap a chain JSON in the Anthropic REST API response format */
function makeApiResponse(text: string, status = 200): Response {
  if (status !== 200) {
    return new Response(JSON.stringify({ error: { type: 'api_error', message: text } }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-4-5-20251001',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const VALID_CHAIN_JSON = JSON.stringify({
  chain: Array.from({ length: 7 }, (_, i) => ({
    title: `Node ${i}`, emoji: '🔍', font_category: 'horror',
    teaser: 'Test teaser', briefing: 'Test briefing',
  })),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
})

describe('generate handler', () => {
  let handler: (request: Request) => Promise<Response>
  let fetchSpy: ReturnType<typeof vi.fn>
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

    fetchSpy = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchSpy)

    const mod = await import('../generate.ts')
    handler = mod.default
    mod._resetRateLimiter()
    mod._resetCircuitBreaker()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  it('returns 500 when API returns invalid JSON', async () => {
    fetchSpy.mockResolvedValue(makeApiResponse('not json {{{'))

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    expect(res.status).toBe(500)
  })

  it('never leaks raw error messages to client', async () => {
    const error = new Error('Secret API internals')
    fetchSpy.mockRejectedValue(error)

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
    fetchSpy.mockResolvedValue(makeApiResponse(VALID_CHAIN_JSON))

    const res = await handler(makeRequest({ conceptA: 'Cats', conceptB: 'Pizza' }))
    const requestId = res.headers.get('X-Request-Id')
    expect(requestId).toBeTruthy()
    // UUID v4 format
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('echoes client-provided X-Request-Id header', async () => {
    fetchSpy.mockResolvedValue(makeApiResponse(VALID_CHAIN_JSON))

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
    fetchSpy.mockRejectedValue(new Error('API down'))

    // 3 failures to trip the breaker
    for (let i = 0; i < 3; i++) {
      await handler(makeRequest({ conceptA: `Test${i}`, conceptB: 'Pizza' }))
    }

    // 4th request should be rejected by circuit breaker (503, no API call)
    const callCountBefore = fetchSpy.mock.calls.length
    const res = await handler(makeRequest({ conceptA: 'Another', conceptB: 'Test' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('server_error')
    expect(body.message).toContain('temporarily unavailable')
    // Verify fetch was NOT called again
    expect(fetchSpy.mock.calls.length).toBe(callCountBefore)
  })

  it('circuit breaker resets after a successful request', async () => {
    // 2 failures (below threshold)
    fetchSpy.mockRejectedValueOnce(new Error('fail'))
    fetchSpy.mockRejectedValueOnce(new Error('fail'))
    await handler(makeRequest({ conceptA: 'A1', conceptB: 'B1' }))
    await handler(makeRequest({ conceptA: 'A2', conceptB: 'B2' }))

    // 1 success resets the counter
    fetchSpy.mockResolvedValueOnce(makeApiResponse(VALID_CHAIN_JSON))
    const successRes = await handler(makeRequest({ conceptA: 'A3', conceptB: 'B3' }))
    expect(successRes.status).toBe(200)

    // 2 more failures (still below threshold since counter was reset)
    fetchSpy.mockRejectedValueOnce(new Error('fail'))
    fetchSpy.mockRejectedValueOnce(new Error('fail'))
    const res1 = await handler(makeRequest({ conceptA: 'A4', conceptB: 'B4' }))
    const res2 = await handler(makeRequest({ conceptA: 'A5', conceptB: 'B5' }))
    // These should still hit the API (not circuit-broken)
    expect(res1.status).toBe(500)
    expect(res2.status).toBe(500)
  })
})
