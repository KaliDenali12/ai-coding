import type { FontCategory } from '@/types/conspiracy.ts'

export const FONT_MAP: Record<FontCategory, string> = {
  horror: "'Creepster', cursive",
  corporate: "'Orbitron', sans-serif",
  ancient: "'Cinzel', serif",
  chaotic: "'Permanent Marker', cursive",
  scientific: "'Source Code Pro', monospace",
  military: "'Black Ops One', system-ui",
  mystical: "'MedievalSharp', cursive",
  retro: "'Righteous', sans-serif",
  underground: "'Rubik Glitch', system-ui",
}

export const FONT_CLASS_MAP: Record<FontCategory, string> = {
  horror: 'font-horror',
  corporate: 'font-corporate',
  ancient: 'font-ancient',
  chaotic: 'font-chaotic',
  scientific: 'font-scientific',
  military: 'font-military',
  mystical: 'font-mystical',
  retro: 'font-retro',
  underground: 'font-underground',
}

export function getFontFamily(category: FontCategory): string {
  return FONT_MAP[category] ?? FONT_MAP.chaotic
}

export function getFontClass(category: FontCategory): string {
  return FONT_CLASS_MAP[category] ?? FONT_CLASS_MAP.chaotic
}
