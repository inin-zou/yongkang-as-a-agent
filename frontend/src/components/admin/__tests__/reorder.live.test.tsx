/**
 * Integration test: verifies that the skill reorder data shape
 * matches what the API expects, and that sort_order values are unique.
 */
import { describe, it, expect } from 'vitest'

const API_BASE = 'https://yongkang.dev/api'

describe('Skills sort_order integrity', () => {
  it('all skills should have unique sequential sort_order values', async () => {
    const res = await fetch(`${API_BASE}/skills?_t=${Date.now()}`, { cache: 'no-store' })
    expect(res.ok).toBe(true)
    const skills = await res.json()

    // Every skill must have a numeric sortOrder
    for (const skill of skills) {
      expect(typeof skill.sortOrder).toBe('number')
      expect(skill.id).toBeTruthy()
    }

    // sort_order values should be unique
    const orders = skills.map((s: { sortOrder: number }) => s.sortOrder)
    const unique = new Set(orders)
    expect(unique.size).toBe(orders.length)
  })

  it('all skills should have required fields for updateSkill', async () => {
    const res = await fetch(`${API_BASE}/skills?_t=${Date.now()}`, { cache: 'no-store' })
    const skills = await res.json()

    for (const skill of skills) {
      // These are required by the updateSkill API
      expect(skill.title).toBeTruthy()
      expect(typeof skill.title).toBe('string')
      expect(skill.id).toBeTruthy()
      // slug can be empty string but must exist
      expect(skill).toHaveProperty('slug')
      // skills and battleTested should be arrays
      expect(Array.isArray(skill.skills) || skill.skills === null || skill.skills === undefined).toBe(true)
      expect(Array.isArray(skill.battleTested) || skill.battleTested === null || skill.battleTested === undefined).toBe(true)
    }
  })
})

describe('Experience sort_order integrity', () => {
  it('all experience entries should have unique sort_order values', async () => {
    const res = await fetch(`${API_BASE}/experience?_t=${Date.now()}`, { cache: 'no-store' })
    expect(res.ok).toBe(true)
    const entries = await res.json()

    for (const entry of entries) {
      expect(typeof entry.sortOrder).toBe('number')
      expect(entry.id).toBeTruthy()
    }

    const orders = entries.map((e: { sortOrder: number }) => e.sortOrder)
    const unique = new Set(orders)
    expect(unique.size).toBe(orders.length)
  })
})
