import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mock Anthropic SDK ---
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import handler, { _resetRateLimiter, _resetCircuitBreaker } from '../generate.ts'

function makeValidChain() {
  return {
    chain: Array.from({ length: 7 }, (_, i) => ({
      title: `Node ${i}`,
      emoji: '🔍',
      font_category: 'corporate',
      teaser: `Teaser for node ${i}`,
      briefing: `Briefing for node ${i}`,
    })),
    case_file_number: 'CASE FILE #1234-5',
    classification_level: 'TOP SECRET',
  }
}

function makeRequest(conceptA = 'Cats', conceptB = 'WiFi'): Request {
  return new Request('http://localhost/.netlify/functions/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nf-client-connection-ip': '192.168.1.1',
    },
    body: JSON.stringify({ conceptA, conceptB }),
  })
}

describe('generate handler — concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetRateLimiter()
    _resetCircuitBreaker()
  })

  it('rate limiter correctly counts concurrent requests from same IP', async () => {
    // Setup: mock slow API responses
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                content: [{ type: 'text', text: JSON.stringify(makeValidChain()) }],
              }),
            10,
          ),
        ),
    )

    // Fire 5 concurrent requests from the same IP
    const requests = Array.from({ length: 5 }, () => makeRequest())
    const responses = await Promise.all(requests.map((req) => handler(req)))

    // All 5 should succeed (under the 20-request limit)
    for (const res of responses) {
      expect(res.status).toBe(200)
    }
  })

  it('rate limiter enforces limit under concurrent burst', async () => {
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                content: [{ type: 'text', text: JSON.stringify(makeValidChain()) }],
              }),
            5,
          ),
        ),
    )

    // Fire 25 concurrent requests (limit is 20)
    const requests = Array.from({ length: 25 }, () => makeRequest())
    const responses = await Promise.all(requests.map((req) => handler(req)))

    const okCount = responses.filter((r) => r.status === 200).length
    const rateLimitedCount = responses.filter((r) => r.status === 429).length

    // Because checkRateLimit is synchronous, each call runs atomically
    // in the JS event loop before any await. So exactly 20 should pass.
    expect(okCount).toBe(20)
    expect(rateLimitedCount).toBe(5)
  })

  it('concurrent requests from different IPs do not interfere', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(makeValidChain()) }],
    })

    // 10 requests each from 3 different IPs
    const ips = ['10.0.0.1', '10.0.0.2', '10.0.0.3']
    const requests = ips.flatMap((ip) =>
      Array.from({ length: 10 }, () =>
        new Request('http://localhost/.netlify/functions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nf-client-connection-ip': ip,
          },
          body: JSON.stringify({ conceptA: 'A', conceptB: 'B' }),
        }),
      ),
    )

    const responses = await Promise.all(requests.map((req) => handler(req)))

    // All 30 should succeed (each IP only has 10, under the 20 limit)
    expect(responses.every((r) => r.status === 200)).toBe(true)
  })

  // RACE CONDITION: In serverless, each cold-start instance gets its own
  // rateLimitMap. Concurrent requests routed to different instances bypass
  // the rate limit entirely. This test documents the single-instance behavior.
  it('rate limiter is per-process (serverless limitation)', () => {
    // This is a documentation test — the rate limiter works correctly
    // within a single process but provides no cross-instance protection.
    // In production on Netlify, concurrent requests may hit different
    // Lambda instances, each with an empty rateLimitMap.
    //
    // Impact: Rate limiting is best-effort, not guaranteed.
    // A determined user could exceed the limit by triggering cold starts.
    //
    // Fix would require: External store (Redis, Netlify KV, etc.)
    // Not worth implementing for this app's scale/risk profile.
    expect(true).toBe(true)
  })
})
