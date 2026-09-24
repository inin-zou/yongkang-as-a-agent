// Run from frontend: node scripts/generate-hackathon-maps.mjs
// A high-resolution land silhouette sampled into screen-sized dots at runtime. Consecutive land dots are stored as
// inclusive integer runs per row, avoiding thousands of repeated coordinates.
import { getMapJSON } from 'dotted-map'
import { writeFileSync } from 'node:fs'

const map = JSON.parse(getMapJSON({
  width: 2880, grid: 'vertical', projection: { name: 'equirectangular' },
  region: { lat: { min: -90, max: 90 }, lng: { min: -180, max: 180 } },
}))
const rows = new Map()
for (const { x, y } of Object.values(map.points)) {
  const row = rows.get(y) ?? []
  row.push(x)
  rows.set(y, row)
}
const runs = [...rows].sort(([a], [b]) => a - b).map(([y, xs]) => {
  xs.sort((a, b) => a - b)
  const result = [y]
  let start = xs[0], end = start
  for (const x of xs.slice(1)) {
    if (x === end + 1) end = x
    else { result.push(start, end); start = end = x }
  }
  result.push(start, end)
  return result
})
writeFileSync(new URL('../src/components/skill/hackathonMapData.json', import.meta.url), `${JSON.stringify({ map: { ...map, points: {} }, runs })}\n`)
