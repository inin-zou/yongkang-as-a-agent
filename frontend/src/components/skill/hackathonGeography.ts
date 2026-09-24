import DottedMap, { type MapData } from 'dotted-map/without-countries'
import mapData from './hackathonMapData.json'
import type { HackathonPlace } from './hackathonPlaces'

export interface Point { x: number; y: number }
export interface Camera extends Point { width: number; height: number }
export interface Region { id: string; name: string; places: HackathonPlace[]; center: Point }
export const MAP_RATIO = 1.4
export const worldCamera: Camera = { x: 0, y: 20, width: 720, height: 280 }
const projection = new DottedMap({ map: mapData.map as MapData })
// Dense scanline silhouette, not visible strokes. A screen-space SVG dot pattern
// is clipped by this mask, keeping dot diameter and spacing stable during zoom.
const maskScale = mapData.map.width / 720
export const maskStrokeWidth = 1 / maskScale
export const landPath = mapData.runs.map(([y, ...runs]) => {
  let path = ''
  for (let i = 0; i < runs.length; i += 2) path += `M${(runs[i] - .5) / maskScale},${y / maskScale}h${(runs[i + 1] - runs[i] + 1) / maskScale}`
  return path
}).join('')

function validCoordinates(coordinates: [number, number]): boolean {
  return coordinates.every(Number.isFinite) && Math.abs(coordinates[0]) <= 90 && Math.abs(coordinates[1]) <= 180
}

export function placeCoordinates(place: HackathonPlace): [number, number] | undefined {
  if (place.isRemote) return undefined
  for (const event of place.events) {
    const candidates = [event.coordinates, event.lat !== undefined && event.lng !== undefined ? [event.lat, event.lng] as [number, number] : undefined]
    for (const coordinates of candidates) if (coordinates && validCoordinates(coordinates)) return coordinates
  }
}

export function geographicPosition(coordinates: [number, number]): Point | undefined {
  if (!validCoordinates(coordinates)) return undefined
  const point = projection.getPin({ lat: coordinates[0], lng: coordinates[1] })
  return point ? { x: point.x / maskScale, y: point.y / maskScale } : undefined
}

function distance(a: [number, number], b: [number, number]) {
  const radians = Math.PI / 180
  const h = Math.sin((b[0] - a[0]) * radians / 2) ** 2 + Math.cos(a[0] * radians) * Math.cos(b[0] * radians) * Math.sin((b[1] - a[1]) * radians / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)))
}

// Keep dateline clusters together when computing bounds; the SVG repeats the mask.
export function unwrapPoint(point: Point, anchor: number): Point {
  return { ...point, x: point.x + Math.round((anchor - point.x) / 720) * 720 }
}

/** Connected components of places within 1,400 km. Names never determine membership. */
export function buildRegions(places: HackathonPlace[]): Region[] {
  const remaining = places.filter(place => placeCoordinates(place)).sort((a, b) => a.id.localeCompare(b.id))
  const groups: HackathonPlace[][] = []
  while (remaining.length) {
    const group = [remaining.shift()!]
    for (let i = 0; i < group.length; i++) {
      for (let j = remaining.length - 1; j >= 0; j--) {
        if (distance(placeCoordinates(group[i])!, placeCoordinates(remaining[j])!) <= 1400) group.push(...remaining.splice(j, 1))
      }
    }
    groups.push(group.sort((a, b) => a.id.localeCompare(b.id)))
  }
  return groups.map(group => {
    const countries = [...new Set(group.map(place => place.country).filter(Boolean))]
    // This bounds check supplies a familiar display name only, after clustering.
    const inEurope = group.every(place => { const [lat, lng] = placeCoordinates(place)!; return lat >= 35 && lat <= 72 && lng >= -25 && lng <= 45 })
    const name = group.length === 1 ? group[0].city : countries.length === 1 ? countries[0] : inEurope ? 'Europe' : `${group[0].city} area`
    const anchor = geographicPosition(placeCoordinates(group[0])!)!.x
    const points = group.map(place => unwrapPoint(geographicPosition(placeCoordinates(place)!)!, anchor))
    const center = { x: points.reduce((n, p) => n + p.x, 0) / points.length, y: points.reduce((n, p) => n + p.y, 0) / points.length }
    return { id: group.map(place => place.id).join('|'), name, places: group, center }
  }).sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name))
}

export function regionCamera(region: Region): Camera {
  const points = region.places.map(place => unwrapPoint(geographicPosition(placeCoordinates(place)!)!, region.center.x))
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x))
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y))
  const width = Math.max(44, (maxX - minX) * 2.2, (maxY - minY) * 2.2 * MAP_RATIO)
  return { x: (minX + maxX - width) / 2, y: (minY + maxY - width / MAP_RATIO) / 2, width, height: width / MAP_RATIO }
}

interface LabelPin extends Point { id: string; name: string; count: number; radius: number }
interface Label extends Point { id: string; width: number; leader: boolean }

/** Prefer labels immediately beside pins. Only move them when their 44px target
 * would cover another label or any visible pin, including the largest count ring. */
export function layoutLabels(points: LabelPin[], width: number, height: number): Label[] {
  const labels: Label[] = []
  const distanceToBox = (point: Point, box: Label) => Math.hypot(
    Math.max(0, Math.abs(point.x - box.x) - box.width / 2),
    Math.max(0, Math.abs(point.y - box.y) - 22),
  )
  const ordered = [...points].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
  for (const pin of ordered) {
    const labelWidth = Math.min(width - 12, pin.name.length * 7.5 + String(pin.count).length * 7 + 28)
    const candidates: Label[] = []
    for (const extra of [0, 12, 24, 40, 64, 96, 144]) {
      const dx = pin.radius + 6 + labelWidth / 2 + extra
      const dy = pin.radius + 6 + 22 + extra
      for (const [x, y] of [[pin.x + dx, pin.y], [pin.x - dx, pin.y], [pin.x, pin.y - dy], [pin.x, pin.y + dy], [pin.x + dx, pin.y - dy], [pin.x - dx, pin.y - dy], [pin.x + dx, pin.y + dy], [pin.x - dx, pin.y + dy]]) {
        candidates.push({ id: pin.id, x, y, width: labelWidth, leader: extra > 0 || candidates.length > 1 })
      }
    }
    const chosen = candidates.find(box =>
      box.x - box.width / 2 >= 4 && box.x + box.width / 2 <= width - 4 && box.y >= 24 && box.y <= height - 24 &&
      points.every(point => distanceToBox(point, box) >= point.radius + 3) &&
      labels.every(other => Math.abs(box.x - other.x) >= (box.width + other.width) / 2 + 4 || Math.abs(box.y - other.y) >= 48),
    )
    // Exceptional dense clusters retain accessible labels below the map.
    labels.push(chosen ?? { id: pin.id, x: width / 2, y: height + 28 + labels.filter(label => label.y > height).length * 48, width: labelWidth, leader: true })
  }
  return labels
}
