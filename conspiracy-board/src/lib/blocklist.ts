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

function normalizeInput(input: string): string {
  let normalized = input.toLowerCase().trim()
  for (const [char, replacement] of Object.entries(SUBSTITUTIONS)) {
    normalized = normalized.replaceAll(char, replacement)
  }
  // Remove common separators used to bypass word matching
  normalized = normalized.replace(/[\s\-_.]+/g, ' ')
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
