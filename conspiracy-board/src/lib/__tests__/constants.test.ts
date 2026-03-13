import { describe, it, expect } from 'vitest'
import {
  EXAMPLE_PAIRS,
  LOADING_MESSAGES,
  SLOW_LOADING_MESSAGES,
  ERROR_MESSAGES,
  LOADING_MESSAGE_INTERVAL_MS,
  SLOW_THRESHOLD_MS,
  TIMEOUT_THRESHOLD_MS,
  FAIL_THRESHOLD_MS,
} from '../constants.ts'
import { checkInputs } from '../blocklist.ts'

describe('EXAMPLE_PAIRS', () => {
  it('has at least 4 pairs', () => {
    expect(EXAMPLE_PAIRS.length).toBeGreaterThanOrEqual(4)
  })

  it('all pairs have non-empty a and b', () => {
    for (const pair of EXAMPLE_PAIRS) {
      expect(pair.a.length).toBeGreaterThan(0)
      expect(pair.b.length).toBeGreaterThan(0)
    }
  })

  it('all pairs have different a and b', () => {
    for (const pair of EXAMPLE_PAIRS) {
      expect(pair.a.toLowerCase()).not.toBe(pair.b.toLowerCase())
    }
  })

  it('all pairs pass client-side validation (not blocked)', () => {
    for (const pair of EXAMPLE_PAIRS) {
      const result = checkInputs(pair.a, pair.b)
      expect(result.valid).toBe(true)
    }
  })
})

describe('LOADING_MESSAGES', () => {
  it('has multiple messages for cycling', () => {
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(4)
  })

  it('all messages are non-empty strings', () => {
    for (const msg of LOADING_MESSAGES) {
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    }
  })
})

describe('SLOW_LOADING_MESSAGES', () => {
  it('has at least 2 messages', () => {
    expect(SLOW_LOADING_MESSAGES.length).toBeGreaterThanOrEqual(2)
  })
})

describe('ERROR_MESSAGES', () => {
  it('has at least 2 variants', () => {
    expect(ERROR_MESSAGES.length).toBeGreaterThanOrEqual(2)
  })

  it('all variants have heading, message, and style', () => {
    for (const err of ERROR_MESSAGES) {
      expect(err.heading.length).toBeGreaterThan(0)
      expect(err.message.length).toBeGreaterThan(0)
      expect(['redacted', 'flickering', 'classified']).toContain(err.style)
    }
  })
})

describe('Timing thresholds', () => {
  it('message interval is positive', () => {
    expect(LOADING_MESSAGE_INTERVAL_MS).toBeGreaterThan(0)
  })

  it('thresholds are in ascending order', () => {
    expect(SLOW_THRESHOLD_MS).toBeLessThan(TIMEOUT_THRESHOLD_MS)
    expect(TIMEOUT_THRESHOLD_MS).toBeLessThan(FAIL_THRESHOLD_MS)
  })

  it('fail threshold is at most 30 seconds', () => {
    expect(FAIL_THRESHOLD_MS).toBeLessThanOrEqual(30000)
  })
})
