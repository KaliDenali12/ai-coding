import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('health endpoint', () => {
  let handler: (request: Request) => Promise<Response>
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = 'sk-test-key-12345'
    delete process.env.MAINTENANCE_MODE
    delete process.env.ANTHROPIC_TIMEOUT_MS

    const mod = await import('../health.ts')
    handler = mod.default
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  function makeRequest(path: string): Request {
    return new Request(`http://localhost/.netlify/functions/health${path}`, {
      method: 'GET',
    })
  }

  describe('full health check (default path)', () => {
    it('returns 200 with healthy status when all checks pass', async () => {
      const res = await handler(makeRequest(''))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('healthy')
      expect(body.timestamp).toBeDefined()
      expect(body.checks.runtime.status).toBe('healthy')
      expect(body.checks.anthropic_api_key.status).toBe('healthy')
      expect(body.checks.maintenance_mode.status).toBe('healthy')
      expect(body.checks.environment.status).toBe('healthy')
    })

    it('returns 503 when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const mod = await import('../health.ts')
      const res = await mod.default(makeRequest(''))
      expect(res.status).toBe(503)

      const body = await res.json()
      expect(body.status).toBe('unhealthy')
      expect(body.checks.anthropic_api_key.status).toBe('unhealthy')
    })

    it('returns degraded when maintenance mode is on', async () => {
      process.env.MAINTENANCE_MODE = 'true'

      const mod = await import('../health.ts')
      const res = await mod.default(makeRequest(''))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('degraded')
      expect(body.checks.maintenance_mode.status).toBe('degraded')
    })

    it('returns degraded when timeout is unreasonable', async () => {
      process.env.ANTHROPIC_TIMEOUT_MS = '1000'

      const mod = await import('../health.ts')
      const res = await mod.default(makeRequest(''))

      const body = await res.json()
      expect(body.checks.environment.status).toBe('degraded')
    })

    it('does not expose credentials or internal IPs', async () => {
      const res = await handler(makeRequest(''))
      const text = await res.text()
      expect(text).not.toContain('sk-test-key')
      expect(text).not.toContain('12345')
    })

    it('includes latencyMs for every check', async () => {
      const res = await handler(makeRequest(''))
      const body = await res.json()
      for (const check of Object.values(body.checks) as Array<{ latencyMs: number }>) {
        expect(typeof check.latencyMs).toBe('number')
        expect(check.latencyMs).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('/live endpoint', () => {
    it('returns 200 with runtime check', async () => {
      const res = await handler(makeRequest('/live'))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('healthy')
      expect(body.checks.runtime.status).toBe('healthy')
    })

    it('returns 200 even when API key is missing (liveness only)', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const mod = await import('../health.ts')
      const res = await mod.default(makeRequest('/live'))
      expect(res.status).toBe(200)
    })
  })

  describe('/ready endpoint', () => {
    it('returns 200 when ready to serve', async () => {
      const res = await handler(makeRequest('/ready'))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('healthy')
    })

    it('returns 503 when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const mod = await import('../health.ts')
      const res = await mod.default(makeRequest('/ready'))
      expect(res.status).toBe(503)

      const body = await res.json()
      expect(body.status).toBe('unhealthy')
    })

    it('returns 503 when in maintenance mode', async () => {
      process.env.MAINTENANCE_MODE = 'true'

      const mod = await import('../health.ts')
      const res = await mod.default(makeRequest('/ready'))
      expect(res.status).toBe(503)
    })
  })
})
