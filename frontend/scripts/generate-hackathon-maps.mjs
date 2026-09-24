// Run from frontend: node scripts/generate-hackathon-maps.mjs
// Precompute dotted-map's land masks; ship only dots and projection metadata.
import { getMapJSON } from 'dotted-map'
import { writeFileSync } from 'node:fs'

const regions = {
  europe: { lat: { min: 37, max: 68 }, lng: { min: -16, max: 38 } },
  world: { lat: { min: -55, max: 75 }, lng: { min: -180, max: 180 } },
}
const maps = Object.fromEntries(Object.entries(regions).map(([name, region]) => {
  const map = JSON.parse(getMapJSON({ region, width: name === 'europe' ? 110 : 160, grid: 'diagonal' }))
  const dots = Object.values(map.points).map(({ x, y }) => [x, Number(y.toFixed(4))])
  return [name, { map: { ...map, points: {} }, dots }]
}))
writeFileSync(new URL('../src/components/skill/hackathonMapData.json', import.meta.url), `${JSON.stringify(maps)}\n`)
