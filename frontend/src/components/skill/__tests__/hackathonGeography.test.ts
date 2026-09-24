import { describe, expect, it } from 'vitest'
import { geographicPosition, maps, placeCoordinates } from '../hackathonGeography'
import { groupHackathonPlaces } from '../hackathonPlaces'

describe('geographic map placement', () => {
  it('places real coordinates on the matching Mercator land mask', () => {
    const paris = geographicPosition('europe', [48.8566, 2.3522])!
    const helsinki = geographicPosition('europe', [60.1699, 24.9384])!
    // Independently calculated Mercator positions; allow half a percent for grid snapping.
    expect(paris.x).toBeCloseTo(34, 0)
    expect(paris.y).toBeCloseTo(70, 0)
    expect(helsinki.x).toBeCloseTo(75.8, 0)
    expect(helsinki.y).toBeCloseTo(33.4, 0)
    expect(geographicPosition('europe', [31.2304, 121.4737])).toBeUndefined()
    const shanghai = geographicPosition('world', [31.2304, 121.4737])!
    expect(shanghai.x).toBeGreaterThan(80)
    expect(shanghai.y).toBeGreaterThan(40)
    expect(shanghai.y).toBeLessThan(50)
    expect(maps.europe.dots.length).toBeGreaterThan(1000)
    expect(maps.world.dots.length).toBeGreaterThan(1000)
  })
  it('uses usable API coordinates, including legacy lat/lng, and never maps remote events', () => {
    const base = { name: 'Event', date: '2026.01', projectName: 'Project', domain: 'AI', city: 'Paris' }
    const [place] = groupHackathonPlaces([{ ...base, coordinates: [NaN, 2] }, { ...base, lat: 48.86, lng: 2.35 }])
    expect(placeCoordinates(place)).toEqual([48.86, 2.35])
    const [remote] = groupHackathonPlaces([{ ...base, coordinates: [48.86, 2.35], isRemote: true }])
    expect(placeCoordinates(remote)).toBeUndefined()
    expect(geographicPosition('world', [91, 0])).toBeUndefined()
    expect(geographicPosition('world', [0, Infinity])).toBeUndefined()
  })
})
