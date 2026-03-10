// Input blocklist for content safety (Layer 1)
// Case-insensitive matching with common character substitution handling

const BLOCKED_TERMS: string[] = [
  // Slurs and hate speech (abbreviated patterns to catch variants)
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic', 'chink',
  'wetback', 'beaner', 'gook', 'coon', 'dyke', 'tranny',

  // Violence and harmful content
  'school shooting', 'mass shooting', 'holocaust', 'genocide', 'ethnic cleansing',
  'suicide bomb', 'terrorist attack', 'rape', 'child abuse', 'child porn',
  'pedophil', 'molest',

  // Real tragedies
  'sandy hook', 'columbine', '9/11', 'september 11', 'oklahoma city bombing',
  'boston marathon bombing', 'parkland', 'uvalde', 'christchurch',

  // Political figures (to avoid real conspiracy theories)
  'trump', 'biden', 'obama', 'clinton', 'putin', 'hitler', 'stalin',
  'mussolini', 'bin laden', 'osama',

  // Explicit sexual content
  'porn', 'hentai', 'sex slave', 'sexual assault',
]

// Common character substitutions used to bypass filters
const SUBSTITUTIONS: Record<string, string> = {
  '@': 'a',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '$': 's',
  '5': 's',
  '7': 't',
  '!': 'i',
  '+': 't',
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
  // Strip non-space separators to catch bypass attempts like h.i.t.l.e.r
  normalized = normalized.replace(/[\-_.]+/g, '')
  // Collapse whitespace for multi-word term matching (e.g. "sandy hook")
  normalized = normalized.replace(/\s+/g, ' ')
  return normalized
}

export function isBlocked(input: string): boolean {
  const normalized = normalizeInput(input)
  return BLOCKED_TERMS.some((term) => normalized.includes(term))
}

export function checkInputs(
  conceptA: string,
  conceptB: string,
): { valid: boolean; error?: string } {
  const a = conceptA.trim()
  const b = conceptB.trim()

  if (!a || !b) {
    return { valid: false, error: 'Both fields are required.' }
  }

  if (a.length > 50 || b.length > 50) {
    return { valid: false, error: 'Each concept must be 50 characters or fewer.' }
  }

  if (a.toLowerCase() === b.toLowerCase()) {
    return {
      valid: false,
      error: "You can't investigate yourself... or can you? (Enter two different subjects.)",
    }
  }

  if (isBlocked(a) || isBlocked(b)) {
    return {
      valid: false,
      error: 'This subject is classified beyond our clearance level. Try something else.',
    }
  }

  return { valid: true }
}
