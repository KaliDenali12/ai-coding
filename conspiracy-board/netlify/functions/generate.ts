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

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false // rate limited
  }
  recent.push(now)
  rateLimitMap.set(ip, recent)

  // Periodic cleanup: if map grows large, prune stale entries
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      const filtered = val.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      if (filtered.length === 0) rateLimitMap.delete(key)
      else rateLimitMap.set(key, filtered)
    }
  }

  return true // allowed
}

/** @internal Exported for testing only */
export function _resetRateLimiter(): void {
  rateLimitMap.clear()
}

// --- Response Helper ---
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed', message: 'Method not allowed' }, 405)
  }

  // Maintenance mode: set MAINTENANCE_MODE=true in Netlify env vars to disable
  // API calls without deploying code. Returns a themed response immediately.
  if (process.env.MAINTENANCE_MODE === 'true') {
    return jsonResponse({
      error: 'maintenance',
      message: 'Our intelligence network is undergoing scheduled maintenance. Please try again later.',
    }, 503)
  }

  const clientIp = getClientIp(request)
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({
      error: 'rate_limited',
      message: 'Too many investigations in progress. Please wait before starting another.',
    }, 429)
  }

  const requestStartMs = Date.now()
  try {
    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return jsonResponse({ error: 'validation', message: 'Could not read request body.' }, 400)
    }

    if (rawBody.length > 10_000) {
      return jsonResponse({ error: 'validation', message: 'Request too large.' }, 413)
    }

    let body: { conceptA?: string; conceptB?: string }
    try {
      body = JSON.parse(rawBody) as { conceptA?: string; conceptB?: string }
    } catch {
      return jsonResponse({ error: 'validation', message: 'Invalid JSON in request body.' }, 400)
    }
    const { conceptA, conceptB } = body

    if (!conceptA || !conceptB || typeof conceptA !== 'string' || typeof conceptB !== 'string') {
      return jsonResponse({ error: 'validation', message: 'Both concepts are required.' }, 400)
    }

    const a = conceptA.trim()
    const b = conceptB.trim()

    if (a.length > 50 || b.length > 50) {
      return jsonResponse({ error: 'validation', message: 'Each concept must be 50 characters or fewer.' }, 400)
    }

    if (a.toLowerCase() === b.toLowerCase()) {
      return jsonResponse({ error: 'validation', message: 'Concepts must be different.' }, 400)
    }

    if (isBlocked(a) || isBlocked(b)) {
      return jsonResponse({
        error: 'blocked',
        message: 'This subject is classified beyond our clearance level. Try something else.',
      }, 400)
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

    // Structured success log for observability (latency, token usage)
    const latencyMs = Date.now() - requestStartMs
    console.log(JSON.stringify({
      event: 'generate_success',
      latencyMs,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      cacheRead: message.usage?.cache_read_input_tokens ?? 0,
      model: message.model,
    }))

    return jsonResponse(validated)
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Differentiate Anthropic SDK errors for accurate status codes and logging.
    // Uses error.status (set by the SDK) instead of instanceof to remain
    // compatible with module mocking in tests.
    const sdkStatus = (error as { status?: number }).status
    if (errorName === 'APIConnectionTimeoutError' || (errorName === 'APIConnectionError' && errorMessage.includes('timed out'))) {
      console.error('Anthropic API timeout:', errorMessage)
      return jsonResponse({
        error: 'server_error',
        message: 'Our sources are currently unreachable. Please try again in a moment.',
      }, 504)
    }

    if (sdkStatus === 429) {
      console.error('Anthropic API rate limited:', errorMessage)
      return jsonResponse({
        error: 'server_error',
        message: 'Our intelligence network is overwhelmed. Please try again shortly.',
      }, 503)
    }

    if (sdkStatus === 401) {
      console.error('CRITICAL — Anthropic API authentication failed:', errorMessage)
    } else {
      console.error(`Generate function error: [${errorName}] ${errorMessage}`)
    }

    const isValidation = errorMessage.includes('node ') || errorMessage.includes('chain must') || errorMessage.includes('missing ')

    return jsonResponse({
      error: isValidation ? 'invalid_response' : 'server_error',
      message: 'Our sources indicate this investigation has been shut down. Please try again or investigate different subjects.',
    }, isValidation ? 502 : 500)
  }
}
