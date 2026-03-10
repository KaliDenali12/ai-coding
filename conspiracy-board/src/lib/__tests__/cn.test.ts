import { describe, it, expect } from 'vitest'
import { cn } from '../cn.ts'

describe('cn utility', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes via clsx', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('p-4', 'p-8')
    expect(result).toBe('p-8')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })

  it('handles undefined and null inputs', () => {
    expect(cn(undefined, null, 'valid')).toBe('valid')
  })

  it('merges tailwind color conflicts correctly', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('preserves non-conflicting tailwind classes', () => {
    const result = cn('p-4', 'mt-2', 'text-white')
    expect(result).toBe('p-4 mt-2 text-white')
  })

  it('handles array inputs', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('handles object inputs', () => {
    const result = cn({ active: true, disabled: false })
    expect(result).toBe('active')
  })
})
