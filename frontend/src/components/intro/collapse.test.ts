import { expect, it, vi } from 'vitest'
import { createStretchRenderer, sampleCollapseBand, NOW_RULE_ROWS, COLLAPSE_ROWS, collapseRowCount, sampleCollapseSource, splitEdges } from './pixelStretch'

it('thins and fades bands monotonically without moving their y coordinates', () => {
  expect(COLLAPSE_ROWS).toBe(450)
  for (let row = 0; row < COLLAPSE_ROWS; row++) {
    let previous = sampleCollapseBand(row, 0)
    for (let step = 1; step <= 100; step++) {
      const band = sampleCollapseBand(row, step / 100)
      expect(band.y).toBe(previous.y)
      expect(band.thickness).toBeLessThanOrEqual(previous.thickness)
      expect(band.opacity).toBeLessThanOrEqual(previous.opacity)
      previous = band
    }
    expect(previous.thickness).toBe(NOW_RULE_ROWS.includes(row) ? 1 / 900 : 0)
    expect(previous.opacity).toBe(NOW_RULE_ROWS.includes(row) ? 1 : 0)
  }
})


it('draws the Canvas fallback as straight fixed-y bands, leaving only four divider rules', () => {
  const ctx = {
    clearRect: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
    beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), globalAlpha: 1, fillStyle: '',
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 900
  const context = vi.spyOn(canvas, 'getContext').mockImplementation(((kind: string) => kind === '2d' ? ctx : null) as typeof canvas.getContext)
  const renderer = createStretchRenderer(canvas)!
  renderer.setScenes(canvas, canvas)
  const snapshots = [0, 0.5, 1].map(collapse => {
    ctx.drawImage.mockClear()
    ctx.fillRect.mockClear()
    renderer.render({ gap: 1, reveal: 1, collapse })
    return { images: [...ctx.drawImage.mock.calls], fills: [...ctx.fillRect.mock.calls] }
  })
  expect(snapshots[0].images).toHaveLength(900)
  expect(snapshots[1].images).toHaveLength(900)
  expect(snapshots[2].images).toHaveLength(8)
  for (let i = 0; i < 900; i++) {
    const before = snapshots[0].images[i] as unknown as number[]
    const during = snapshots[1].images[i] as unknown as number[]
    expect(during[6] + during[8] / 2).toBeCloseTo(before[6] + before[8] / 2)
    expect(during[8]).toBeLessThan(before[8])
  }
  for (let row = 0; row < COLLAPSE_ROWS; row++) {
    for (let side = 0; side < 2; side++) {
      const call = snapshots[0].images[row * 2 + side]
      expect(call[1]).toBe(Math.floor(sampleCollapseSource(row, side === 0 ? 'left' : 'right') * 1600))
      expect(call.slice(3, 5)).toEqual([1, 1]) // one source pixel, stretched horizontally
    }
  }
  expect(ctx.fillStyle).toBe('#DEDDD6')
  expect(snapshots[2].fills).toHaveLength(5) // paper + four section rules
  canvas.width = 1891 // odd backing width, representative of fractional DPR
  renderer.render({ gap: 0.833333, reveal: 1, collapse: 0 })
  const edges = splitEdges(canvas.width, 0.833333)
  expect(ctx.rect).toHaveBeenLastCalledWith(edges.left, 0, edges.right - edges.left, 900)
  const lastBands = ctx.drawImage.mock.calls.slice(-COLLAPSE_ROWS * 2)
  expect(lastBands[0][5]).toBe(edges.left)
  expect(lastBands[1][5] + lastBands[1][7]).toBe(edges.right)
  renderer.dispose()
  context.mockRestore()
})


it('samples stable, varied columns on each side within the narrow cut window', () => {
  for (const side of ['left', 'right'] as const) {
    const samples = Array.from({ length: 450 }, (_, row) => sampleCollapseSource(row, side))
    expect(new Set(samples).size).toBeGreaterThan(300)
    samples.forEach((u, row) => {
      expect(u).toBeGreaterThanOrEqual(side === 'left' ? 0.46 : 0.5)
      expect(u).toBeLessThanOrEqual(side === 'left' ? 0.5 : 0.54)
      expect(u).toBe(sampleCollapseSource(row, side))
      if (row) expect(u).not.toBe(samples[row - 1])
    })
  }
})

it('uses fine rows while preserving the four original fixed rule positions', () => {
  for (const height of [720, 900, 1140, 1440]) {
    const rows = collapseRowCount(height)
    expect(height / rows).toBeGreaterThanOrEqual(2)
    expect(height / rows).toBeLessThanOrEqual(3)
    const rules = Array.from({ length: rows }, (_, row) => sampleCollapseBand(row, 1, rows)).filter(b => b.rule)
    expect(rules.map(b => b.y)).toEqual([17, 62, 73, 82].map(row => (row + 0.5) / 90))
  }
})

it('abuts translated half edges and the integer canvas gap at fractional DPRs', () => {
  for (const dpr of [1, 1.25, 1.5, 2, 3]) {
    const width = Math.round(1513 * dpr)
    for (const gap of [0, 0.001, 0.333, 0.833333, 1]) {
      const edges = splitEdges(width, gap)
      expect(width / 2 + edges.leftShift).toBe(edges.left)
      expect(width / 2 + edges.rightShift).toBe(edges.right)
      expect(edges.right).toBeGreaterThanOrEqual(edges.left)
      if (gap > 0) {
        expect(Number.isInteger(edges.left)).toBe(true)
        expect(Number.isInteger(edges.right)).toBe(true)
      } else {
        expect(edges.leftShift).toBe(0)
        expect(edges.rightShift).toBe(0)
      }
    }
  }
})
