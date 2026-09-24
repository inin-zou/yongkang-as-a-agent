import { describe, expect, it } from 'vitest'
import { buildRegions, geographicPosition, layoutLabels, placeCoordinates, regionCamera, worldCamera } from '../hackathonGeography'
import { groupHackathonPlaces } from '../hackathonPlaces'
import { clusterEvents } from './hackathonFixtures'

describe('geographic regions', () => {
  it('derives Europe and China by proximity, independent of input order, and retains new destinations', () => {
    const places = groupHackathonPlaces(clusterEvents)
    const regions = buildRegions(places)
    expect(regions.map(r => [r.name, r.places.length])).toEqual([['Europe', 5], ['China', 3]])
    expect(buildRegions([...places].reverse())).toEqual(regions)
    const future = groupHackathonPlaces([...clusterEvents, { ...clusterEvents[0], city: 'Sydney', country: 'Australia', coordinates: [-33.87, 151.21] }])
    expect(buildRegions(future).find(r => r.name === 'Sydney')?.places).toHaveLength(1)
    expect(buildRegions([])).toEqual([])
  })
  it('fits every regional pin with padding, including single-city regions', () => {
    for (const region of buildRegions(groupHackathonPlaces(clusterEvents))) {
      const camera = regionCamera(region)
      for (const place of region.places) {
        const point = geographicPosition(placeCoordinates(place)!)!
        expect(point.x).toBeGreaterThan(camera.x)
        expect(point.x).toBeLessThan(camera.x + camera.width)
        expect(point.y).toBeGreaterThan(camera.y)
        expect(point.y).toBeLessThan(camera.y + camera.height)
      }
    }
    const camera = regionCamera(buildRegions(groupHackathonPlaces([clusterEvents[0]]))[0])
    expect(camera.width).toBeGreaterThan(0)
  })
  it('keeps fixture labels adjacent, clear of every pin, and separate at desktop and mobile widths', () => {
    for (const width of [342, 800]) for (const region of buildRegions(groupHackathonPlaces(clusterEvents))) {
      const camera = regionCamera(region)
      const scale = width / camera.width
      const height = camera.height * scale
      const pins = region.places.map(place => {
        const p = geographicPosition(placeCoordinates(place)!)!
        return { id: place.id, name: place.city, count: place.city === 'Paris' ? 14 : 1, x: (p.x - camera.x) * scale, y: (p.y - camera.y) * scale, radius: place.city === 'Paris' ? 8 : 5 }
      })
      const labels = layoutLabels(pins, width, height)
      for (const label of labels) {
        const pin = pins.find(p => p.id === label.id)!
        const edgeDistance = Math.hypot(Math.max(0, Math.abs(label.x - pin.x) - label.width / 2), Math.max(0, Math.abs(label.y - pin.y) - 22))
        expect(edgeDistance, `${width}px ${pin.name}`).toBeLessThan(45)
        expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0)
        expect(label.x + label.width / 2).toBeLessThanOrEqual(width)
        for (const other of pins) {
          const distance = Math.hypot(Math.max(0, Math.abs(label.x - other.x) - label.width / 2), Math.max(0, Math.abs(label.y - other.y) - 22))
          expect(distance).toBeGreaterThanOrEqual(other.radius + 2)
        }
        for (const other of labels.filter(l => l.id !== label.id)) {
          expect(Math.abs(label.x - other.x) >= (label.width + other.width) / 2 || Math.abs(label.y - other.y) >= 44).toBe(true)
        }
      }
    }
  })
  it('fits the world frame to inhabited latitudes without polar letterboxing', () => {
    expect(worldCamera.y).toBe(20)
    expect(worldCamera.height).toBe(280)
    expect(worldCamera.width / worldCamera.height).toBeGreaterThan(2.5)
  })
  it('projects coordinates onto the single world grid and excludes invalid or remote coordinates', () => {
    expect(geographicPosition([0, 0])).toEqual({ x: 360, y: 180 })
    expect(geographicPosition([39.9, 116.4])?.x).toBeCloseTo(593, 0)
    expect(geographicPosition([91, 0])).toBeUndefined()
    expect(geographicPosition([0, Infinity])).toBeUndefined()
    const [remote] = groupHackathonPlaces([{ ...clusterEvents[0], isRemote: true }])
    expect(placeCoordinates(remote)).toBeUndefined()
    const [legacy] = groupHackathonPlaces([{ ...clusterEvents[0], coordinates: undefined, lat: 48.86, lng: 2.35 }])
    expect(placeCoordinates(legacy)).toEqual([48.86, 2.35])
  })
})
