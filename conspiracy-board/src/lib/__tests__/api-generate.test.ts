import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateConspiracy, ApiError } from '../api.ts'

const validChainData = {
  chain: Array.from({ length: 7 }, (_, i) => ({
    title: `Node ${i}`,
    emoji: '🔍',
    font_category: 'horror',
    teaser: `Teaser ${i}`,
    briefing: `Briefing for node ${i}`,
  })),
  case_file_number: 'CASE FILE #1234-A',
  classification_level: 'TOP SECRET',
}

describe('generateConspiracy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends POST request with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validChainData),
    })
    vi.stubGlobal('fetch', mockFetch)

    await generateConspiracy({ conceptA: 'Cats', conceptB: 'Pizza' })

    expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptA: 'Cats', conceptB: 'Pizza' }),
    })
  })

  it('returns validated chain data on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validChainData),
    }))

    const result = await generateConspiracy({ conceptA: 'A', conceptB: 'B' })
    expect(result.chain).toHaveLength(7)
    expect(result.case_file_number).toBe('CASE FILE #1234-A')
  })

  it('throws ApiError on non-ok response with JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Both concepts are required.' }),
    }))

    await expect(
      generateConspiracy({ conceptA: 'A', conceptB: 'B' }),
    ).rejects.toThrow(ApiError)

    try {
      await generateConspiracy({ conceptA: 'A', conceptB: 'B' })
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).statusCode).toBe(400)
      expect((e as ApiError).message).toBe('Both concepts are required.')
    }
  })

  it('throws ApiError with fallback message when error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    }))

    try {
      await generateConspiracy({ conceptA: 'A', conceptB: 'B' })
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).message).toBe('Request failed')
      expect((e as ApiError).statusCode).toBe(500)
    }
  })

  it('throws validation error when response has invalid chain structure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ chain: [], case_file_number: 'X', classification_level: 'Y' }),
    }))

    await expect(
      generateConspiracy({ conceptA: 'A', conceptB: 'B' }),
    ).rejects.toThrow('exactly 7 items')
  })

  it('propagates fetch network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(
      generateConspiracy({ conceptA: 'A', conceptB: 'B' }),
    ).rejects.toThrow('Failed to fetch')
  })
})

describe('ApiError', () => {
  it('has correct name property', () => {
    const error = new ApiError('test', 404)
    expect(error.name).toBe('ApiError')
  })

  it('is an instance of Error', () => {
    const error = new ApiError('test', 500)
    expect(error).toBeInstanceOf(Error)
  })

  it('stores statusCode', () => {
    const error = new ApiError('msg', 422)
    expect(error.statusCode).toBe(422)
    expect(error.message).toBe('msg')
  })
})
