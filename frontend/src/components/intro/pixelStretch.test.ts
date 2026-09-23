import { expect, it, vi } from 'vitest'
import { createStretchRenderer, sampleStretch } from './pixelStretch'

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

it('opens from an off-centre seam and reaches both edges without moving B', () => {
  expect(sampleStretch(0.24, 1.6, 0.9, 1600, 0.24)).toEqual({ source: 'B', u: 0.24 })
  expect(sampleStretch(0.5, 1.6, 0.9, 1600, 0.24).source).toBe('A')
  for (const x of [0, 0.24, 0.5, 1]) expect(sampleStretch(x, 1.6, 0, 1600, 0.24)).toEqual({ source: 'B', u: x })
})

it('zooms A about the seam while translating halves and sampling adjacent columns', () => {
  expect(sampleStretch(0.24, 0, 1, 1600, 0.24, 1.2).u).toBeCloseTo(0.24)
  expect(sampleStretch(0.84, 0, 1, 1600, 0.24, 1.2).u).toBeCloseTo(0.74)
  expect(sampleStretch(0.1, 0.1, 1, 1600, 0.24, 1.2).u).toBeCloseTo(0.165)
  expect(sampleStretch(0.2, 1.6, 1, 1600, 0.24, 1.2).u).toBeCloseTo(0.24 - 0.5 / 1600 / 1.2)
})


it('renders the complete unscaled B in the 2D fallback at an off-centre reveal endpoint', () => {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 4
  const context = { clearRect: vi.fn(), drawImage: vi.fn(), imageSmoothingEnabled: true }
  const getContext = vi.spyOn(canvas, 'getContext').mockImplementation(((kind: string) => kind === '2d' ? context : null) as typeof canvas.getContext)
  const a = document.createElement('canvas'), b = document.createElement('canvas')
  a.width = b.width = 1600
  a.height = b.height = 8
  try {
    const renderer = createStretchRenderer(canvas)!
    renderer.setScenes(a, b)
    renderer.render({ gap: 1.6, reveal: 0, centre: 0.24, zoom: 1.2 })
    const destination = context.drawImage.mock.calls.filter(call => call[0] === b)
    expect(destination).toHaveLength(4)
    destination.forEach((call, y) => expect(call).toEqual([b, 0, y * 2, 1600, 2, 0, y, 800, 1]))
    const forward = [...context.drawImage.mock.calls]
    renderer.render({ gap: 0, reveal: 1, centre: 0.24, zoom: 1 })
    context.drawImage.mockClear()
    renderer.render({ gap: 1.6, reveal: 0, centre: 0.24, zoom: 1.2 })
    expect(context.drawImage.mock.calls).toEqual(forward)
    renderer.dispose()
  } finally { getContext.mockRestore() }
})
