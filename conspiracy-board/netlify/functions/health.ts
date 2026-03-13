// Health check endpoint for observability.
// Separates liveness (process running) from readiness (can serve traffic).
// Does NOT call the Anthropic API — that would be expensive and slow.
// Instead, checks that the API key is configured (readiness) and the
// function runtime is responsive (liveness).

interface ComponentCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  latencyMs: number
  message?: string
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: 'unknown'
  checks: Record<string, ComponentCheck>
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function checkAnthropicKeyConfigured(): ComponentCheck {
  const start = Date.now()
  const hasKey = typeof process.env.ANTHROPIC_API_KEY === 'string' && process.env.ANTHROPIC_API_KEY.length > 0
  return {
    status: hasKey ? 'healthy' : 'unhealthy',
    latencyMs: Date.now() - start,
    message: hasKey ? 'API key configured' : 'ANTHROPIC_API_KEY is missing or empty',
  }
}

function checkMaintenanceMode(): ComponentCheck {
  const start = Date.now()
  const inMaintenance = process.env.MAINTENANCE_MODE === 'true'
  return {
    status: inMaintenance ? 'degraded' : 'healthy',
    latencyMs: Date.now() - start,
    message: inMaintenance ? 'Maintenance mode is ON — API calls disabled' : 'Normal operation',
  }
}

function checkRuntime(): ComponentCheck {
  const start = Date.now()
  // Verify basic runtime health: can we do work?
  try {
    JSON.parse('{"test": true}')
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    }
  } catch {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: 'Runtime JSON processing failed',
    }
  }
}

function checkEnvironment(): ComponentCheck {
  const start = Date.now()
  const timeout = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 25_000
  const isReasonable = timeout >= 5_000 && timeout <= 60_000
  return {
    status: isReasonable ? 'healthy' : 'degraded',
    latencyMs: Date.now() - start,
    message: `SDK timeout: ${timeout}ms${isReasonable ? '' : ' (outside recommended 5-60s range)'}`,
  }
}

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const path = url.pathname

  // Liveness: is the function process running and responsive?
  // Always returns 200 if the function can execute at all.
  if (path.endsWith('/live')) {
    return jsonResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: { runtime: checkRuntime() },
    })
  }

  // Readiness: can the function actually serve traffic?
  // Returns 503 if critical dependencies are missing.
  if (path.endsWith('/ready')) {
    const apiKey = checkAnthropicKeyConfigured()
    const maintenance = checkMaintenanceMode()
    const isReady = apiKey.status === 'healthy' && maintenance.status !== 'degraded'
    return jsonResponse({
      status: isReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: { anthropic_api_key: apiKey, maintenance_mode: maintenance },
    }, isReady ? 200 : 503)
  }

  // Full health check: all components
  const checks: Record<string, ComponentCheck> = {
    runtime: checkRuntime(),
    anthropic_api_key: checkAnthropicKeyConfigured(),
    maintenance_mode: checkMaintenanceMode(),
    environment: checkEnvironment(),
  }

  const overallStatus: HealthResponse['status'] = Object.values(checks).some((c) => c.status === 'unhealthy')
    ? 'unhealthy'
    : Object.values(checks).some((c) => c.status === 'degraded')
      ? 'degraded'
      : 'healthy'

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: 'unknown', // Serverless — no persistent process
    checks,
  }

  return jsonResponse(response, overallStatus === 'unhealthy' ? 503 : 200)
}
