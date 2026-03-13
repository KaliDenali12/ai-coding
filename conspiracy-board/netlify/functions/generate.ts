import Anthropic from '@anthropic-ai/sdk'

const FONT_CATEGORIES = [
  'horror', 'corporate', 'ancient', 'chaotic', 'scientific',
  'military', 'mystical', 'retro', 'underground',
] as const

// --- Blocklist (duplicated from client for server-side validation) ---
const BLOCKED_TERMS: string[] = [
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic', 'chink',
  'wetback', 'beaner', 'gook', 'coon', 'dyke', 'tranny',
  'school shooting', 'mass shooting', 'holocaust', 'genocide', 'ethnic cleansing',
  'suicide bomb', 'terrorist attack', 'rape', 'child abuse', 'child porn',
  'pedophil', 'molest',
  'sandy hook', 'columbine', '9/11', 'september 11', 'oklahoma city bombing',
  'boston marathon bombing', 'parkland', 'uvalde', 'christchurch',
  'trump', 'biden', 'obama', 'clinton', 'putin', 'hitler', 'stalin',
  'mussolini', 'bin laden', 'osama',
  'porn', 'hentai', 'sex slave', 'sexual assault',
]

const SUBSTITUTIONS: Record<string, string> = {
  '@': 'a', '0': 'o', '1': 'i', '3': 'e', '$': 's', '5': 's', '7': 't', '!': 'i', '+': 't',
}

// Cyrillic/Greek confusables that survive NFKD normalization
const CONFUSABLES: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u043E': 'o', '\u0440': 'p', '\u0441': 'c',
  '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0455': 's', '\u0458': 'j',
  '\u04BB': 'h', '\u0432': 'b', '\u043D': 'h', '\u043A': 'k', '\u0442': 't',
  '\u043C': 'm', '\u0410': 'a', '\u0412': 'b', '\u0415': 'e', '\u041A': 'k',
  '\u041C': 'm', '\u041D': 'h', '\u041E': 'o', '\u0420': 'p', '\u0421': 'c',
  '\u0422': 't', '\u0423': 'y', '\u0425': 'x',
  '\u03B1': 'a', '\u03B5': 'e', '\u03BF': 'o', '\u03C1': 'p', '\u03BA': 'k',
  '\u03C4': 't', '\u03C5': 'u', '\u03B9': 'i',
}

function normalizeInput(input: string): string {
  // Strip zero-width characters (joiners, non-joiners, zero-width spaces, etc.)
  let normalized = input.replace(/[\u200B-\u200F\u2028-\u202F\u2060\uFEFF]/g, '')
  // NFKD normalization: decomposes fullwidth chars (ｈ→h) and ligatures
  normalized = normalized.normalize('NFKD')
  // Strip combining marks (diacritics, underlines, overlines, etc.)
  normalized = normalized.replace(/[\u0300-\u036F]/g, '')
  normalized = normalized.toLowerCase().trim()
  for (const [char, replacement] of Object.entries(CONFUSABLES)) {
    normalized = normalized.replaceAll(char, replacement)
  }
  for (const [char, replacement] of Object.entries(SUBSTITUTIONS)) {
    normalized = normalized.replaceAll(char, replacement)
  }
  normalized = normalized.replace(/[_.+-]+/g, '')
  return normalized.replace(/\s+/g, ' ')
}

function isBlocked(input: string): boolean {
  const normalized = normalizeInput(input)
  const noSpaces = normalized.replace(/\s+/g, '')
  return BLOCKED_TERMS.some((term) => {
    const termNoSpaces = term.replace(/\s+/g, '')
    return normalized.includes(term) || noSpaces.includes(termNoSpaces)
  })
}

// --- System Prompt ---
const SYSTEM_PROMPT = `You are the world's most dedicated conspiracy theory analyst. You have spent decades connecting dots that others refuse to see. You write with the gravitas of an investigative journalist who has uncovered the story of the century.

Your task: Given two concepts, create a conspiracy chain that connects them through 5 intermediate steps. Each step should be a fictional but internally consistent connection, delivered with absolute sincerity and deadpan conviction.

CRITICAL RULES:
1. Play it COMPLETELY straight. Never wink, never acknowledge absurdity, never break character.
2. Cite fictional organizations with specific names (e.g., "The Helsinki Institute of Furniture Dynamics")
3. Reference invented studies with years and decimal-point statistics (e.g., "a 2017 study found 73.4% correlation")
4. Create fictional experts with impressive credentials (e.g., "Dr. Elena Voss, former chair of the International Council on Bread-Based Telecommunications")
5. Every connection must feel logical within the conspiracy framework, even though it's absurd
6. Keep the tone fun, silly, and lighthearted — this is comedy through sincerity

CONTENT SAFETY — ABSOLUTELY NON-NEGOTIABLE:
- NEVER reference real political figures (current or historical)
- NEVER include slurs, hate speech, or derogatory language of any kind
- NEVER reference real tragedies, terrorist attacks, mass shootings, or genocides
- NEVER mock any religion, religious figure, or religious practice
- NEVER include sexual content, violence against people, or genuinely disturbing content
- NEVER create content that could be mistaken for real misinformation
- Keep everything in "fun absurdist comedy" territory — safe to show anyone, anywhere
- Real brands/companies are OK only in clearly absurd, lighthearted contexts

RESPONSE FORMAT: Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation). The structure:

{
  "chain": [
    {
      "title": "2-5 word bold title",
      "emoji": "single expressive emoji",
      "font_category": "one of: horror, corporate, ancient, chaotic, scientific, military, mystical, retro, underground",
      "teaser": "One sentence summary of the connection",
      "briefing": "2-3 paragraphs of deadpan conspiracy text with fictional citations, invented organizations, and fabricated statistics. This is where the real entertainment lives."
    }
  ],
  "case_file_number": "CASE FILE #XXXX-X (random)",
  "classification_level": "TOP SECRET or EYES ONLY or RESTRICTED or CLASSIFIED"
}

The "chain" array must contain EXACTLY 7 items:
- Item 0: The first user concept (as an anchor node — still gets full treatment with emoji, font, teaser, briefing)
- Items 1-5: Five intermediate conspiracy steps connecting the two concepts
- Item 6: The second user concept (as an anchor node — full treatment)

Choose font_category to match the EMOTIONAL TONE of each step:
- horror: sinister, dark, ominous
- corporate: bureaucratic, institutional, cover-up
- ancient: historical, archaeological, mythological
- chaotic: unhinged, frantic, conspiratorial
- scientific: research, data-driven, pseudo-academic
- military: government, classified, defense
- mystical: occult, spiritual, otherworldly
- retro: nostalgic, mid-century, pop-culture
- underground: counter-culture, rebel, hidden society`

// --- Rate Limiting ---
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 20 // per IP per window

const rateLimitMap = new Map<string, number[]>()

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    // Calculate when the oldest request in the window expires
    const oldestInWindow = Math.min(...recent)
    const retryAfterSeconds = Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }
  recent.push(now)
  rateLimitMap.set(ip, recent)

  // Periodic cleanup: if map grows large, prune stale entries
  if (rateLimitMap.size > 1000) {
    const sizeBefore = rateLimitMap.size
    for (const [key, val] of rateLimitMap) {
      const filtered = val.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      if (filtered.length === 0) rateLimitMap.delete(key)
      else rateLimitMap.set(key, filtered)
    }
    console.log(JSON.stringify({ event: 'rate_limit_cleanup', sizeBefore, sizeAfter: rateLimitMap.size }))
  }

  return { allowed: true }
}

/** @internal Exported for testing only */
export function _resetRateLimiter(): void {
  rateLimitMap.clear()
}

// --- Circuit Breaker ---
// Prevents hammering the Anthropic API during outages. After consecutive
// failures, requests fail fast (~0ms) instead of waiting 25s for a timeout.
// State resets on cold start (acceptable for serverless).
const CIRCUIT_BREAKER_THRESHOLD = 3  // consecutive failures to open
const CIRCUIT_BREAKER_COOLDOWN_MS = 30_000 // 30s before allowing a probe

let circuitFailureCount = 0
let circuitOpenedAt = 0 // timestamp when circuit opened, 0 = closed

function isCircuitOpen(): boolean {
  if (circuitFailureCount < CIRCUIT_BREAKER_THRESHOLD) return false
  const elapsed = Date.now() - circuitOpenedAt
  // Allow a single probe request after cooldown (half-open state)
  if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) return false
  return true
}

function recordCircuitSuccess(): void {
  circuitFailureCount = 0
  circuitOpenedAt = 0
}

function recordCircuitFailure(): void {
  circuitFailureCount++
  if (circuitFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenedAt = Date.now()
  }
}

/** @internal Exported for testing only */
export function _resetCircuitBreaker(): void {
  circuitFailureCount = 0
  circuitOpenedAt = 0
}

// --- Correlation ID ---
function generateRequestId(): string {
  // Compact, URL-safe, collision-resistant ID for request tracing.
  // crypto.randomUUID() is available in Node 19+ and Netlify Functions runtime.
  return crypto.randomUUID()
}

// --- Response Helper ---
function jsonResponse(body: unknown, status = 200, requestId?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (requestId) headers['X-Request-Id'] = requestId
  return new Response(JSON.stringify(body), { status, headers })
}

// --- Validation ---
interface ChainNode {
  title: string
  emoji: string
  font_category: string
  teaser: string
  briefing: string
}

interface ChainResponse {
  chain: ChainNode[]
  case_file_number: string
  classification_level: string
}

function validateResponse(data: unknown): ChainResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not an object')
  }
  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.chain) || obj.chain.length !== 7) {
    throw new Error(`chain must have exactly 7 items, got ${Array.isArray(obj.chain) ? obj.chain.length : 'non-array'}`)
  }

  if (typeof obj.case_file_number !== 'string' || !obj.case_file_number) {
    throw new Error('missing case_file_number')
  }
  if (typeof obj.classification_level !== 'string' || !obj.classification_level) {
    throw new Error('missing classification_level')
  }

  for (let i = 0; i < obj.chain.length; i++) {
    const node = obj.chain[i] as Record<string, unknown>
    if (typeof node.title !== 'string' || !node.title) throw new Error(`node ${i}: missing title`)
    if ((node.title as string).length > 100) throw new Error(`node ${i}: title too long`)
    if (typeof node.emoji !== 'string' || !node.emoji) throw new Error(`node ${i}: missing emoji`)
    if ((node.emoji as string).length > 20) throw new Error(`node ${i}: emoji too long`)
    if (typeof node.font_category !== 'string' || !(FONT_CATEGORIES as readonly string[]).includes(node.font_category)) {
      throw new Error(`node ${i}: invalid font_category`)
    }
    if (typeof node.teaser !== 'string' || !node.teaser) throw new Error(`node ${i}: missing teaser`)
    if ((node.teaser as string).length > 500) throw new Error(`node ${i}: teaser too long`)
    if (typeof node.briefing !== 'string' || !node.briefing) throw new Error(`node ${i}: missing briefing`)
    if ((node.briefing as string).length > 5000) throw new Error(`node ${i}: briefing too long`)
  }

  return data as ChainResponse
}

// --- Handler ---
export default async (request: Request): Promise<Response> => {
  // Generate a correlation ID for every request. Propagated through all logs
  // and returned in X-Request-Id response header for client-side correlation.
  const requestId = request.headers.get('x-request-id') ?? generateRequestId()

  if (request.method !== 'POST') {
    console.log(JSON.stringify({ event: 'request_rejected', reason: 'method_not_allowed', method: request.method, requestId }))
    return jsonResponse({ error: 'method_not_allowed', message: 'Method not allowed' }, 405, requestId)
  }

  // Maintenance mode: set MAINTENANCE_MODE=true in Netlify env vars to disable
  // API calls without deploying code. Returns a themed response immediately.
  if (process.env.MAINTENANCE_MODE === 'true') {
    console.log(JSON.stringify({ event: 'request_rejected', reason: 'maintenance_mode', requestId }))
    return jsonResponse({
      error: 'maintenance',
      message: 'Our intelligence network is undergoing scheduled maintenance. Please try again later.',
    }, 503, requestId)
  }

  const clientIp = getClientIp(request)
  const rateLimitResult = checkRateLimit(clientIp)
  if (!rateLimitResult.allowed) {
    console.log(JSON.stringify({ event: 'request_rejected', reason: 'rate_limited', requestId }))
    const response = jsonResponse({
      error: 'rate_limited',
      message: 'Too many investigations in progress. Please wait before starting another.',
    }, 429, requestId)
    if (rateLimitResult.retryAfterSeconds) {
      response.headers.set('Retry-After', String(rateLimitResult.retryAfterSeconds))
    }
    return response
  }

  const requestStartMs = Date.now()
  try {
    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return jsonResponse({ error: 'validation', message: 'Could not read request body.' }, 400, requestId)
    }

    if (rawBody.length > 10_000) {
      return jsonResponse({ error: 'validation', message: 'Request too large.' }, 413, requestId)
    }

    let body: { conceptA?: string; conceptB?: string }
    try {
      body = JSON.parse(rawBody) as { conceptA?: string; conceptB?: string }
    } catch {
      return jsonResponse({ error: 'validation', message: 'Invalid JSON in request body.' }, 400, requestId)
    }
    const { conceptA, conceptB } = body

    if (!conceptA || !conceptB || typeof conceptA !== 'string' || typeof conceptB !== 'string') {
      return jsonResponse({ error: 'validation', message: 'Both concepts are required.' }, 400, requestId)
    }

    const a = conceptA.trim()
    const b = conceptB.trim()

    if (a.length > 50 || b.length > 50) {
      return jsonResponse({ error: 'validation', message: 'Each concept must be 50 characters or fewer.' }, 400, requestId)
    }

    if (a.toLowerCase() === b.toLowerCase()) {
      return jsonResponse({ error: 'validation', message: 'Concepts must be different.' }, 400, requestId)
    }

    if (isBlocked(a) || isBlocked(b)) {
      console.log(JSON.stringify({ event: 'request_rejected', reason: 'blocked_content', requestId }))
      return jsonResponse({
        error: 'blocked',
        message: 'This subject is classified beyond our clearance level. Try something else.',
      }, 400, requestId)
    }

    // Circuit breaker: fail fast if Anthropic API has been failing consecutively.
    // Saves users from waiting 25s for a timeout during outages.
    if (isCircuitOpen()) {
      console.log(JSON.stringify({ event: 'request_rejected', reason: 'circuit_open', requestId }))
      return jsonResponse({
        error: 'server_error',
        message: 'Our sources are temporarily unavailable. Please try again in a moment.',
      }, 503, requestId)
    }

    // Call Claude API
    // Explicit timeout: Anthropic SDK defaults to 10 minutes, which far exceeds
    // Netlify's function timeout (10-26s). Without this, the function hangs until
    // Netlify force-kills it, returning no error response to the client.
    const apiTimeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 25_000
    const client = new Anthropic({ timeout: apiTimeoutMs })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: [
        {
          type: 'text' as const,
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Connect these two concepts with a conspiracy chain: "${a}" and "${b}"`,
        },
      ],
    })

    // Extract text content
    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in API response')
    }

    // Parse and validate JSON
    let parsed: unknown
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      throw new Error('API response is not valid JSON')
    }

    const validated = validateResponse(parsed)
    recordCircuitSuccess()

    // Structured success log for observability (latency, token usage, sizes)
    const latencyMs = Date.now() - requestStartMs
    const responseBody = JSON.stringify(validated)
    console.log(JSON.stringify({
      event: 'generate_success',
      requestId,
      latencyMs,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      cacheRead: message.usage?.cache_read_input_tokens ?? 0,
      cacheWrite: message.usage?.cache_creation_input_tokens ?? 0,
      model: message.model,
      requestSizeBytes: rawBody.length,
      responseSizeBytes: responseBody.length,
    }))

    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Differentiate Anthropic SDK errors for accurate status codes and logging.
    // Uses error.status (set by the SDK) instead of instanceof to remain
    // compatible with module mocking in tests.
    const sdkStatus = (error as { status?: number }).status
    const latencyMs = Date.now() - requestStartMs

    // Record API-level failures for circuit breaker (timeouts, rate limits, auth).
    // Validation failures (bad AI output) don't count — the API itself is working.
    const isValidation = errorMessage.includes('node ') || errorMessage.includes('chain must') || errorMessage.includes('missing ')
    if (!isValidation) {
      recordCircuitFailure()
    }

    if (errorName === 'APIConnectionTimeoutError' || (errorName === 'APIConnectionError' && errorMessage.includes('timed out'))) {
      console.error(JSON.stringify({ event: 'generate_error', errorType: 'timeout', errorName, requestId, latencyMs }))
      return jsonResponse({
        error: 'server_error',
        message: 'Our sources are currently unreachable. Please try again in a moment.',
      }, 504, requestId)
    }

    if (sdkStatus === 429) {
      console.error(JSON.stringify({ event: 'generate_error', errorType: 'api_rate_limited', errorName, requestId, latencyMs }))
      return jsonResponse({
        error: 'server_error',
        message: 'Our intelligence network is overwhelmed. Please try again shortly.',
      }, 503, requestId)
    }

    if (sdkStatus === 401) {
      console.error(JSON.stringify({ event: 'generate_error', errorType: 'auth_failure', severity: 'CRITICAL', errorName, requestId, latencyMs }))
    } else {
      console.error(JSON.stringify({ event: 'generate_error', errorType: 'unknown', errorName, errorMessage, requestId, latencyMs }))
    }

    return jsonResponse({
      error: isValidation ? 'invalid_response' : 'server_error',
      message: 'Our sources indicate this investigation has been shut down. Please try again or investigate different subjects.',
    }, isValidation ? 502 : 500, requestId)
  }
}
