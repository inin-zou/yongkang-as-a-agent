import { describe, expect, it } from 'vitest'
import { trackCredit, trackListCredit } from '../trackCredit'

describe('trackCredit', () => {
  it('credits the original artist of a cover', () => {
    expect(trackCredit('keshi')).toBe('Cover · original by keshi')
    expect(trackListCredit('keshi')).toBe('cover of keshi')
  })
  it('marks own songs, including the legacy "true" value', () => {
    for (const value of ['', 'true', undefined]) {
      expect(trackCredit(value)).toBe('Original song')
      expect(trackListCredit(value)).toBeNull()
    }
  })
  it('keeps legacy "false" as a cover without an artist', () => {
    expect(trackCredit('false')).toBe('Cover')
    expect(trackListCredit('false')).toBe('cover')
  })
})
