import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { clusterEvents } from './hackathonFixtures'
import { regionCamera, buildRegions, worldCamera, geographicPosition, placeCoordinates, layoutLabels } from '../hackathonGeography'
import type { Hackathon } from '../../../types'
import HackathonMap from '../HackathonMap'
import { groupHackathonPlaces } from '../hackathonPlaces'

const event = (name: string, city?: string, extra: Partial<Hackathon> = {}): Hackathon => ({
  name, city, country: 'France', date: '2026.01', projectName: 'Project', domain: 'AI', ...extra,
})
const events = [
  event('Paris first', 'Paris', { coordinates: [48.8566, 2.3522], date: '2025.01', result: 'Winner' }),
  event('Paris latest', 'Paris', { result: 'Finalist' }),
  event('Versailles event', 'Versailles', { coordinates: [48.8014, 2.1301] }),
  event('Shanghai event', 'Shanghai', { country: 'China', coordinates: [31.2304, 121.4737] }),
  event('Online event', 'Paris', { isRemote: true }),
]

describe('place grouping', () => {
  it('keeps nearby cities separate, collects remote events, and sorts without mutating input', () => {
    const places = groupHackathonPlaces(events)
    expect(places.map(p => p.city)).toEqual(['Paris', 'Shanghai', 'Versailles', 'Online'])
    expect(places[0].events.map(h => h.name)).toEqual(['Paris latest', 'Paris first'])
    expect(places[0].wins).toBe(1)
    expect(places[3].events.map(h => h.name)).toEqual(['Online event'])
    expect(events[0].name).toBe('Paris first')
  })
  it('does not lose unknown places or combine same-named cities in different countries', () => {
    const places = groupHackathonPlaces([event('A', 'Paris'), event('B', 'Paris', { country: 'US' }), event('C')])
    expect(places).toHaveLength(3)
    expect(places.find(p => p.city === 'Location unlisted')?.events[0].name).toBe('C')
    expect(groupHackathonPlaces([])).toEqual([])
  })
})

describe('geographic places map', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('zooms clusters with the same SVG, and selects places by hover, focus and tap', () => {
    render(<HackathonMap hackathons={[...events, ...clusterEvents]} />)
    const map = screen.getByRole('img', { name: 'World map' })
    const worldBox = map.getAttribute('viewBox')
    const panel = screen.getByRole('region', { name: 'Events in Paris' })
    expect(within(panel).getByText('Paris latest')).toBeInTheDocument()
    expect(within(panel).getByText('Finalist')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Zoom to China/ }))
    expect(screen.getByRole('img', { name: 'Map of China' })).toBe(map)
    expect(map.getAttribute('viewBox')).not.toBe(worldBox)
    expect(screen.getByRole('button', { name: 'China' })).toHaveFocus()
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Shanghai, / }))
    expect(screen.getByRole('region', { name: 'Events in Shanghai' })).toHaveTextContent('Shanghai event')
    fireEvent.click(screen.getByRole('button', { name: /Hangzhou, / }))
    expect(screen.getByRole('region', { name: 'Events in Hangzhou' })).toHaveTextContent('Hangzhou event')
    fireEvent.click(screen.getByRole('button', { name: 'Europe' }))
    fireEvent.focus(screen.getByRole('button', { name: /Versailles, / }))
    expect(screen.getByRole('region', { name: 'Events in Versailles' })).toHaveTextContent('2026.01')
    fireEvent.click(screen.getByRole('button', { name: /Online, 1 event/ }))
    expect(screen.getByRole('region', { name: 'Events in Online' })).toHaveTextContent('Online event')
    fireEvent.click(screen.getByRole('button', { name: 'World' }))
    expect(map).toHaveAttribute('viewBox', worldBox)
    expect(screen.getByRole('region', { name: 'Events in Online' })).toBeInTheDocument()
  })

  it('animates the camera, cancels an interrupted zoom, and switches instantly for reduced motion', () => {
    let reduced = false
    let onPreferenceChange = () => {}
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced }, addEventListener: (_: string, fn: () => void) => { onPreferenceChange = fn }, removeEventListener: vi.fn() }))
    const frames = new Map<number, FrameRequestCallback>()
    let nextId = 0
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++nextId, fn); return nextId })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
    const advance = (time: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)) })
    render(<HackathonMap hackathons={clusterEvents} />)
    const map = screen.getByRole('img', { name: 'World map' })
    const start = map.getAttribute('viewBox')
    fireEvent.click(screen.getByRole('button', { name: 'China' }))
    expect(map).toHaveAttribute('viewBox', start)
    advance(performance.now())
    advance(performance.now() + 200)
    expect(map.getAttribute('viewBox')).not.toBe(start)
    fireEvent.click(screen.getByRole('button', { name: 'Europe' }))
    expect(frames.size).toBe(1)
    advance(performance.now())
    advance(performance.now() + 500)
    const europe = regionCamera(buildRegions(groupHackathonPlaces(clusterEvents))[0])
    expect(map).toHaveAttribute('viewBox', `${europe.x} ${europe.y} ${europe.width} ${europe.height}`)
    expect(frames.size).toBe(0)
    advance(performance.now() + 1000)
    expect(map).toHaveAttribute('viewBox', `${europe.x} ${europe.y} ${europe.width} ${europe.height}`)
    const scale = 342 / europe.width
    const pins = buildRegions(groupHackathonPlaces(clusterEvents))[0].places.map(place => {
      const point = geographicPosition(placeCoordinates(place)!)!
      return { id: place.id, name: place.city, count: place.events.length, radius: 4.1, x: (point.x - europe.x) * scale, y: (point.y - europe.y) * scale }
    })
    for (const label of layoutLabels(pins, 342, europe.height * scale)) {
      const pin = pins.find(p => p.id === label.id)!
      const button = screen.getByRole('button', { name: `${pin.name}, 1 event` })
      expect(button).toHaveStyle({ left: `${label.x}px`, top: `${label.y}px` })
    }
    const pattern = map.querySelector('pattern')!
    expect(Number(pattern.getAttribute('width')) * scale).toBeCloseTo(5)
    expect(Number(pattern.querySelector('circle')!.getAttribute('r')) * scale).toBeCloseTo(1.05)

    fireEvent.click(screen.getByRole('button', { name: 'China' }))
    reduced = true
    act(onPreferenceChange)
    expect(frames.size).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'World' }))
    expect(map).toHaveAttribute('viewBox', `${worldCamera.x} ${worldCamera.y} ${worldCamera.width} ${worldCamera.height}`)
    expect(frames.size).toBe(0)
  })

  it('handles empty data and resets a view when its region disappears', () => {
    const { rerender, container } = render(<HackathonMap hackathons={[]} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<HackathonMap hackathons={clusterEvents} />)
    fireEvent.click(screen.getByRole('button', { name: 'China' }))
    fireEvent.click(screen.getByRole('button', { name: /Shanghai, / }))
    rerender(<HackathonMap hackathons={[events[0]]} />)
    expect(screen.getByRole('region', { name: 'Events in Paris' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'World' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Paris' })).toBeInTheDocument()
  })
})
