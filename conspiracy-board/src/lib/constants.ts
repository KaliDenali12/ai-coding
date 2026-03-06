export const EXAMPLE_PAIRS: Array<{ a: string; b: string }> = [
  { a: 'Penguins', b: 'IKEA Furniture' },
  { a: 'Pizza', b: 'Ancient Egypt' },
  { a: 'Cats', b: 'The Federal Reserve' },
  { a: 'Oat Milk', b: 'The Moon Landing' },
  { a: 'Student Loans', b: 'The Bermuda Triangle' },
]

export const LOADING_MESSAGES: string[] = [
  'Cross-referencing sources...',
  'Accessing restricted files...',
  'Intercepting communications...',
  'Decrypting classified channels...',
  'Analyzing covert surveillance data...',
  'Consulting deep cover operatives...',
  'Triangulating signal origins...',
  'Reviewing intercepted transmissions...',
]

export const SLOW_LOADING_MESSAGES: string[] = [
  'Deep cover sources are being difficult tonight...',
  'Encrypted channel is slow. Stand by.',
  'Our informant is taking precautions...',
  'Routing through secure proxy networks...',
]

export const TIMEOUT_MESSAGE =
  'This is taking longer than expected. Hang tight...'

export const ERROR_MESSAGES: Array<{
  heading: string
  message: string
  style: 'redacted' | 'flickering' | 'classified'
}> = [
  {
    heading: 'REDACTED',
    message: 'The government has intercepted our files. Please try again.',
    style: 'redacted',
  },
  {
    heading: 'CONNECTION LOST',
    message: "Connection to classified server lost. They know we're looking.",
    style: 'flickering',
  },
  {
    heading: 'INVESTIGATION BLOCKED',
    message: 'This investigation has been [REDACTED] by [REDACTED]. Retry?',
    style: 'classified',
  },
]

export const LOADING_MESSAGE_INTERVAL_MS = 1500
export const SLOW_THRESHOLD_MS = 8000
export const TIMEOUT_THRESHOLD_MS = 12000
export const FAIL_THRESHOLD_MS = 15000

export const REVEAL_CARD_DELAY_MS = 800
export const REVEAL_STRING_DURATION_MS = 800
export const REVEAL_CARD_ENTRANCE_MS = 500
