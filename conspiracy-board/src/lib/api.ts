import type { ConspiracyChain, GenerateRequest } from '@/types/conspiracy.ts'
import { FONT_CATEGORIES } from '@/types/conspiracy.ts'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'ApiError'
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
    if (typeof node.emoji !== 'string' || !node.emoji) {
      throw new Error(`Invalid node ${i}: missing emoji`)
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
    if (typeof node.briefing !== 'string' || !node.briefing) {
      throw new Error(`Invalid node ${i}: missing briefing`)
    }
  }

  return data as ConspiracyChain
}

export async function generateConspiracy(
  request: GenerateRequest,
): Promise<ConspiracyChain> {
  const response = await fetch('/.netlify/functions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(
      (errorData as { message?: string }).message ?? 'Request failed',
      response.status,
    )
  }

  const data: unknown = await response.json()
  return validateChainResponse(data)
}
