import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('shows events on hover, keyboard focus, and tap in a persistent accessible panel', () => {
    render(<HackathonMap hackathons={events} />)
    expect(screen.getByRole('heading', { name: 'Places' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Map of Europe' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'World map' })).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'Events in Paris' })
    expect(within(panel).getByText('Paris latest')).toBeInTheDocument()
    expect(within(panel).getByText('Finalist')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Shanghai, 1 event/ }))
    expect(screen.getByRole('region', { name: 'Events in Shanghai' })).toHaveTextContent('Shanghai event')
    fireEvent.focus(screen.getByRole('button', { name: /Versailles, 1 event/ }))
    expect(screen.getByRole('region', { name: 'Events in Versailles' })).toHaveTextContent('2026.01')
    fireEvent.click(screen.getByRole('button', { name: /Online, 1 event/ }))
    expect(screen.getByRole('region', { name: 'Events in Online' })).toHaveTextContent('Online event')
    expect(screen.getByRole('button', { name: /Online, 1 event/ })).toHaveAttribute('aria-pressed', 'true')
  })
  it('handles empty data and falls back when the selected city disappears', () => {
    const { rerender, container } = render(<HackathonMap hackathons={[]} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<HackathonMap hackathons={events} />)
    fireEvent.click(screen.getByRole('button', { name: /Shanghai, 1 event/ }))
    rerender(<HackathonMap hackathons={[events[0]]} />)
    expect(screen.getByRole('region', { name: 'Events in Paris' })).toBeInTheDocument()
  })
})
