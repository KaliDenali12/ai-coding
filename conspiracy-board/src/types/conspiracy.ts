export const FONT_CATEGORIES = [
  'horror',
  'corporate',
  'ancient',
  'chaotic',
  'scientific',
  'military',
  'mystical',
  'retro',
  'underground',
] as const

export type FontCategory = (typeof FONT_CATEGORIES)[number]

export interface ConspiracyNode {
  title: string
  emoji: string
  font_category: FontCategory
  teaser: string
  briefing: string
}

export interface ConspiracyChain {
  chain: ConspiracyNode[]
  case_file_number: string
  classification_level: string
}

export interface GenerateRequest {
  conceptA: string
  conceptB: string
}

export interface GenerateError {
  error: string
  message: string
}
