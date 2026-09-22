import { expect, it } from 'vitest'
import { sampleStretch } from './pixelStretch'

it.each([0, 0.2, 0.5, 0.8, 1])('keeps A unchanged at zero gap, x=%s', x => {
  expect(sampleStretch(x, 0, 1)).toEqual({ source: 'A', u: x })
})

it('translates both original halves equally away from the cut', () => {
  expect(sampleStretch(0.1, 0.4, 1)).toEqual({ source: 'A', u: 0.30000000000000004 })
  expect(sampleStretch(0.9, 0.4, 1)).toEqual({ source: 'A', u: 0.7 })
})

it('extends separate adjacent cut columns across the gap', () => {
  expect(sampleStretch(0.4, 0.6, 1, 1600)).toEqual({ source: 'A', u: 0.4996875 })
  expect(sampleStretch(0.6, 0.6, 1, 1600)).toEqual({ source: 'A', u: 0.5003125 })
  expect(sampleStretch(0, 1.2, 1).u).toBeLessThan(0.5)
  expect(sampleStretch(1, 1.2, 1).u).toBeGreaterThan(0.5)
})

it('reveals B from the centre and leaves bands on both sides', () => {
  expect(sampleStretch(0.5, 1.2, 0.8)).toEqual({ source: 'B', u: 0.5 })
  expect(sampleStretch(0.1, 1.2, 0.8).source).toBe('A')
  expect(sampleStretch(0.9, 1.2, 0.8).source).toBe('A')
  for (const x of [0, 0.5, 1]) expect(sampleStretch(x, 1.2, 0)).toEqual({ source: 'B', u: x })
})
