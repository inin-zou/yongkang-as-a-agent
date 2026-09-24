import { useId, useState } from 'react'
import type { Hackathon } from '../../types'
import { groupHackathonPlaces, type HackathonPlace } from './hackathonPlaces'

import { geographicPosition, maps, placeCoordinates, type MapName } from './hackathonGeography'

const labelOffsets: Record<string, [number, number]> = {
  paris: [-7, -8], versailles: [-8, 14], berlin: [14, 0],
  stockholm: [-14, -4], helsinki: [3, -12],
}
const landPaths = Object.fromEntries(Object.entries(maps).map(([name, { dots }]) => [
  name, dots.map(([x, y]) => `M${x - .26},${y}a.26,.26 0 1,0 .52,0a.26,.26 0 1,0 -.52,0`).join(''),
]))

export default function HackathonMap({ hackathons }: { hackathons: Hackathon[] }) {
  const places = groupHackathonPlaces(hackathons)
  const [selectedId, setSelectedId] = useState<string>()
  const id = useId()
  const initialPlace = [...places].sort((a, b) => b.events.length - a.events.length)[0]
  const selected = places.find(place => place.id === selectedId) ?? initialPlace
  if (!selected) return null

  const cities = places.filter(place => !place.isRemote && place.city !== 'Location unlisted')
  const countries = new Set(cities.map(place => place.country.toLowerCase()).filter(Boolean))
  const positioned = places.flatMap(place => {
    const coordinates = placeCoordinates(place)
    if (!coordinates) return []
    const europe = geographicPosition('europe', coordinates)
    const name: MapName = europe ? 'europe' : 'world'
    const point = europe ?? geographicPosition('world', coordinates)
    if (!point) return []
    const [dx, dy] = name === 'europe' ? labelOffsets[place.city.toLowerCase()] ?? [0, 10] : [-5, 18]
    return [{ place, name, point, label: { x: Math.max(20, Math.min(80, point.x + dx)), y: Math.max(12, Math.min(88, point.y + dy)) } }]
  })
  const unpositioned = places.filter(place => !positioned.some(pin => pin.place.id === place.id))

  function placeButton(place: HackathonPlace, label?: { x: number; y: number }) {
    return (
      <button
        key={place.id}
        type="button"
        className={`hackathon-atlas-place${label ? ' hackathon-atlas-label' : ''}`}
        style={label ? { left: `${label.x}%`, top: `${label.y}%` } : undefined}
        aria-label={`${place.city}, ${place.events.length} ${place.events.length === 1 ? 'event' : 'events'}`}
        aria-pressed={selected.id === place.id}
        aria-controls={`${id}-events`}
        onMouseEnter={() => setSelectedId(place.id)}
        onFocus={() => setSelectedId(place.id)}
        onClick={() => setSelectedId(place.id)}
      >
        {place.isRemote && <span aria-hidden="true">◎ </span>}
        <span>{place.city}</span><span className="hackathon-atlas-count">{place.events.length}</span>
      </button>
    )
  }

  function geographicMap(name: MapName) {
    const { width, height } = maps[name].map
    const pins = positioned.filter(pin => pin.name === name)
    return <div className={`hackathon-atlas-geography hackathon-atlas-${name}`}>
      <span className="hackathon-atlas-map-label">{name === 'europe' ? 'Europe' : 'World'}</span>
      <div className="hackathon-atlas-map-frame" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={name === 'europe' ? 'Map of Europe' : 'World map'}>
          <path className="hackathon-atlas-land" d={landPaths[name]} />
          {name === 'world' && positioned.filter(pin => pin.name === 'europe').map(({ place }) => {
            const point = geographicPosition('world', placeCoordinates(place)!)!
            return <circle key={place.id} className="hackathon-atlas-context-pin" cx={point.x * width / 100} cy={point.y * height / 100} r=".8" />
          })}
          {pins.map(({ place, point, label }) => <g key={place.id} onMouseEnter={() => setSelectedId(place.id)} onClick={() => setSelectedId(place.id)} className={selected.id === place.id ? 'hackathon-atlas-marker is-selected' : 'hackathon-atlas-marker'}>
            <line x1={point.x * width / 100} y1={point.y * height / 100} x2={label.x * width / 100} y2={label.y * height / 100} />
            <circle cx={point.x * width / 100} cy={point.y * height / 100} r={.7 + Math.sqrt(place.events.length) * .35} />
          </g>)}
        </svg>
        {pins.map(({ place, label }) => placeButton(place, label))}
        {name === 'world' && <span className="hackathon-atlas-europe-caption">Europe</span>}
      </div>
    </div>
  }

  return (
    <section className="hackathon-atlas" aria-labelledby={`${id}-title`}>
      <header className="hackathon-atlas-heading">
        <h2 id={`${id}-title`}>Places</h2>
        <span>{cities.length} cities / {countries.size} countries{places.some(place => place.isRemote) ? ' / online' : ''}</span>
      </header>
      <div className="hackathon-atlas-map" role="group" aria-label="Explore hackathons by place">
        {positioned.some(pin => pin.name === 'europe') && geographicMap('europe')}
        {positioned.some(pin => pin.name === 'world') && geographicMap('world')}
      </div>
      {unpositioned.length > 0 && <div className="hackathon-atlas-other" role="group" aria-label="Online and locations without map coordinates">
        {unpositioned.map(place => placeButton(place))}
      </div>}
      <p className="hackathon-atlas-caption">Hover, focus or tap a place</p>
      <section className="hackathon-atlas-events" id={`${id}-events`} aria-label={`Events in ${selected.city}`} tabIndex={0}>
        <div className="hackathon-atlas-events-heading">
          <h3>{selected.city} <span>{selected.country}</span></h3>
          <span>{selected.events.length} {selected.events.length === 1 ? 'event' : 'events'}</span>
        </div>
        <p className="hackathon-atlas-status" role="status">{selected.city}: {selected.events.length} {selected.events.length === 1 ? 'event' : 'events'} listed below.</p>
        <ul>
          {selected.events.map((event, index) => <li key={event.id ?? `${event.name}-${event.date}-${index}`}>
            <time dateTime={event.date.replace('.', '-')}>{event.date}</time>
            <div><span>{event.name}</span>{event.result && <small className={/finalist/i.test(event.result) ? '' : 'hackathon-atlas-win'}>{event.result}</small>}</div>
          </li>)}
        </ul>
      </section>
    </section>
  )
}
