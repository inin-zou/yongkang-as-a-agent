import DottedMap, { type MapData } from 'dotted-map/without-countries'
import mapData from './hackathonMapData.json'
import type { HackathonPlace } from './hackathonPlaces'

export type MapName = 'europe' | 'world'
export const maps = mapData
const projections = {
  europe: new DottedMap({ map: mapData.europe.map as MapData }),
  world: new DottedMap({ map: mapData.world.map as MapData }),
}

function validCoordinates(coordinates: [number, number]): boolean {
  return coordinates.every(Number.isFinite) && Math.abs(coordinates[0]) <= 90 && Math.abs(coordinates[1]) <= 180
}

export function placeCoordinates(place: HackathonPlace): [number, number] | undefined {
  if (place.isRemote) return undefined
  for (const event of place.events) {
    const coordinates: [number, number] | undefined = event.coordinates ?? (
      event.lat !== undefined && event.lng !== undefined ? [event.lat, event.lng] : undefined
    )
    if (coordinates && validCoordinates(coordinates)) return coordinates
  }
}

/** Percentages in the same aspect-ratio frame as the precomputed land mask. */
export function geographicPosition(name: MapName, coordinates: [number, number]) {
  if (!validCoordinates(coordinates)) return undefined
  const [lat, lng] = coordinates
  const { region, width, height } = maps[name].map
  if (lat < region.lat.min || lat > region.lat.max || lng < region.lng.min || lng > region.lng.max) return undefined
  const point = projections[name].getPin({ lat, lng })
  return point ? { x: point.x / width * 100, y: point.y / height * 100 } : undefined
}
