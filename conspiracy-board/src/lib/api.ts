import type { ConspiracyChain, GenerateRequest } from '@/types/conspiracy.ts'
import { FONT_CATEGORIES } from '@/types/conspiracy.ts'

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export function validateChainResponse(data: unknown): ConspiracyChain {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: not an object')
  }

  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.chain) || obj.chain.length !== 7) {
    throw new Error('Invalid response: chain must have exactly 7 items')
  }

  if (typeof obj.case_file_number !== 'string' || !obj.case_file_number) {
    throw new Error('Invalid response: missing case_file_number')
  }

  if (typeof obj.classification_level !== 'string' || !obj.classification_level) {
    throw new Error('Invalid response: missing classification_level')
  }

  for (let i = 0; i < obj.chain.length; i++) {
    const node = obj.chain[i] as Record<string, unknown>
    if (typeof node.title !== 'string' || !node.title) {
      throw new Error(`Invalid node ${i}: missing title`)
    }
    if ((node.title as string).length > 100) {
      throw new Error(`Invalid node ${i}: title too long`)
    }
    if (typeof node.emoji !== 'string' || !node.emoji) {
      throw new Error(`Invalid node ${i}: missing emoji`)
    }
    if ((node.emoji as string).length > 20) {
      throw new Error(`Invalid node ${i}: emoji too long`)
    }
    if (
      typeof node.font_category !== 'string' ||
      !FONT_CATEGORIES.includes(node.font_category as (typeof FONT_CATEGORIES)[number])
    ) {
      throw new Error(`Invalid node ${i}: invalid font_category "${String(node.font_category)}"`)
    }
    if (typeof node.teaser !== 'string' || !node.teaser) {
      throw new Error(`Invalid node ${i}: missing teaser`)
    }
    if ((node.teaser as string).length > 500) {
      throw new Error(`Invalid node ${i}: teaser too long`)
    }
    if (typeof node.briefing !== 'string' || !node.briefing) {
      throw new Error(`Invalid node ${i}: missing briefing`)
    }
    if ((node.briefing as string).length > 5000) {
      throw new Error(`Invalid node ${i}: briefing too long`)
    }
  }

  return data as ConspiracyChain
}

export async function generateConspiracy(
  request: GenerateRequest,
  signal?: AbortSignal,
): Promise<ConspiracyChain> {
  // Defense-in-depth: 30s hard timeout if no signal provided by caller.
  // Normal path gets a signal from App.tsx (15s via LoadingScreen), so this
  // only fires if generateConspiracy is called without one.
  const effectiveSignal = signal ?? AbortSignal.timeout(30_000)

  const response = await fetch('/.netlify/functions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: effectiveSignal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'The investigation could not be completed. Please try again.' }))
    throw new ApiError(
      (errorData as { message?: string }).message ?? 'The investigation could not be completed. Please try again.',
      response.status,
    )
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiError('Our server returned an unreadable response. Please try again.', 502)
  }
  return validateChainResponse(data)
}
