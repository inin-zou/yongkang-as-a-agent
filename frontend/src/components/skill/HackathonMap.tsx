import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Hackathon } from '../../types'
import { groupHackathonPlaces, type HackathonPlace } from './hackathonPlaces'
import {
  buildRegions, geographicPosition, landPath, layoutLabels, maskStrokeWidth, placeCoordinates,
  regionCamera, unwrapPoint, worldCamera, type Region,
} from './hackathonGeography'

function MapExplorer({ regions, selectedId, onSelect, panelId }: {
  regions: Region[]; selectedId: string; onSelect: (id: string) => void; panelId: string
}) {
  const mapId = useId()
  const [regionId, setRegionId] = useState('world')
  const [camera, setCamera] = useState(worldCamera)
  const [width, setWidth] = useState(342)
  const frame = useRef<HTMLDivElement>(null)
  const controls = useRef(new Map<string, HTMLButtonElement>())
  const cameraRef = useRef(camera)
  const targetRef = useRef(camera)
  const animation = useRef(0)
  const region = regions.find(item => item.id === regionId)
  const height = width * camera.height / camera.width

  useEffect(() => {
    const element = frame.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 342))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const stop = () => {
      if (!preference?.matches) return
      cancelAnimationFrame(animation.current)
      cameraRef.current = targetRef.current
      setCamera(targetRef.current)
    }
    preference?.addEventListener('change', stop)
    return () => { cancelAnimationFrame(animation.current); preference?.removeEventListener('change', stop) }
  }, [])

  function switchView(nextRegion?: Region, fromCluster = false) {
    const nextId = nextRegion?.id ?? 'world'
    setRegionId(nextId)
    if (fromCluster) controls.current.get(nextId)?.focus({ preventScroll: true })
    cancelAnimationFrame(animation.current)
    const target = nextRegion ? regionCamera(nextRegion) : worldCamera
    targetRef.current = target
    const start = cameraRef.current
    if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cameraRef.current = target
      setCamera(target)
      return
    }
    let began: number | undefined
    const step = (now: number) => {
      began ??= now
      const t = Math.min(1, (now - began) / 440)
      const ease = t * t * (3 - 2 * t)
      const next = t === 1 ? target : {
        x: start.x + (target.x - start.x) * ease,
        y: start.y + (target.y - start.y) * ease,
        width: start.width + (target.width - start.width) * ease,
        height: start.height + (target.height - start.height) * ease,
      }
      cameraRef.current = next
      setCamera(next)
      if (t < 1) animation.current = requestAnimationFrame(step)
    }
    animation.current = requestAnimationFrame(step)
  }

  const scale = width / camera.width
  const pins = region ? region.places.map(place => ({
    id: place.id, name: place.city, count: place.events.length, place,
    point: unwrapPoint(geographicPosition(placeCoordinates(place)!)!, region.center.x),
  })) : regions.map(item => ({
    id: item.id, name: item.name, count: item.places.reduce((sum, place) => sum + place.events.length, 0),
    region: item, point: { ...item.center, x: (item.center.x + 720) % 720 },
  }))
  const labels = layoutLabels(pins.map(pin => ({ id: pin.id, name: pin.name, count: pin.count, radius: 3 + Math.sqrt(pin.count) * 1.1, x: (pin.point.x - camera.x) * scale, y: (pin.point.y - camera.y) * scale })), width, height)
  const labelHeight = Math.max(height, ...labels.map(label => label.y + 24))

  return <>
    <div className="hackathon-atlas-views" role="group" aria-label="Map view">
      {[{ id: 'world', name: 'World' }, ...regions].map(item => <button key={item.id} type="button"
        ref={element => { if (element) controls.current.set(item.id, element); else controls.current.delete(item.id) }}
        aria-pressed={regionId === item.id} onClick={() => switchView(regions.find(r => r.id === item.id))}
      >{item.name}</button>)}
    </div>
    <div className="hackathon-atlas-map-frame" ref={frame} style={{ height: labelHeight }} role="group" aria-label="Explore hackathons by place">
      <svg className="hackathon-atlas-geography" style={{ height }} viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} role="img" aria-label={region ? `Map of ${region.name}` : 'World map'}>
        <defs>
          <pattern id={`${mapId}-dots`} patternUnits="userSpaceOnUse" width={5 / scale} height={5 / scale}>
            <circle cx={2.5 / scale} cy={2.5 / scale} r={1.05 / scale} className="hackathon-atlas-dot" />
          </pattern>
          <mask id={`${mapId}-land`} maskUnits="userSpaceOnUse" x="-720" y="0" width="2160" height="360" style={{ maskType: 'luminance' }}>
            {[-720, 0, 720].map(offset => <path key={offset} transform={`translate(${offset} 0)`} fill="none" stroke="white" strokeWidth={maskStrokeWidth} d={landPath} />)}
          </mask>
        </defs>
        <rect x="-720" y="0" width="2160" height="360" fill={`url(#${mapId}-dots)`} mask={`url(#${mapId}-land)`} />
        {!region && regions.flatMap(item => item.places.map(place => {
          const point = geographicPosition(placeCoordinates(place)!)!
          return <circle key={place.id} className="hackathon-atlas-context-pin" cx={point.x} cy={point.y} r={2 / scale} />
        }))}
        {[...pins].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId) || a.count - b.count).map(pin => <g key={pin.id} className="hackathon-atlas-pin-target" aria-hidden="true"
          onMouseEnter={() => { if ('place' in pin) onSelect(pin.place.id) }}
          onClick={() => { if ('place' in pin) onSelect(pin.place.id); else switchView(pin.region, true) }}
        >
          <circle className={`hackathon-atlas-geographic-pin${pin.id === selectedId ? ' is-selected' : ''}`}
            cx={pin.point.x} cy={pin.point.y} r={(3 + Math.sqrt(pin.count) * 1.1) / scale} />
          <circle cx={pin.point.x} cy={pin.point.y} r={22 / scale} fill="transparent" />
        </g>)}
      </svg>
      <svg className="hackathon-atlas-leaders" width={width} height={labelHeight} aria-hidden="true">
        {labels.map(label => {
          const pin = pins.find(item => item.id === label.id)!
          if (!label.leader) return null
          const px = (pin.point.x - camera.x) * scale, py = (pin.point.y - camera.y) * scale
          const x2 = Math.max(label.x - label.width / 2, Math.min(label.x + label.width / 2, px))
          const y2 = Math.max(label.y - 22, Math.min(label.y + 22, py))
          const distance = Math.hypot(x2 - px, y2 - py) || 1
          const radius = 5 + Math.sqrt(pin.count) * 1.1
          return <line key={pin.id} x1={px + (x2 - px) * radius / distance} y1={py + (y2 - py) * radius / distance} x2={x2} y2={y2} />
        })}
      </svg>
      {labels.map(label => {
        const pin = pins.find(item => item.id === label.id)!
        const place = 'place' in pin ? pin.place : undefined
        const cluster = 'region' in pin ? pin.region : undefined
        return <button key={pin.id} type="button" className="hackathon-atlas-place hackathon-atlas-label"
          style={{ left: label.x, top: label.y, minWidth: label.width }}
          title={pin.name} aria-label={place ? `${pin.name}, ${pin.count} ${pin.count === 1 ? 'event' : 'events'}` : `Zoom to ${pin.name}, ${cluster!.places.length} cities, ${pin.count} events`}
          aria-pressed={place ? selectedId === place.id : undefined} aria-controls={place ? panelId : undefined}
          onMouseEnter={() => { if (place) onSelect(place.id) }} onFocus={() => { if (place) onSelect(place.id) }}
          onClick={() => { if (place) onSelect(place.id); else switchView(cluster, true) }}
        ><span>{pin.name}</span><span className="hackathon-atlas-count">{pin.count}{cluster && ' ↗'}</span></button>
      })}
    </div>
    <p className="hackathon-atlas-caption" role="status">{region ? `${region.name} · ${region.places.length} ${region.places.length === 1 ? 'city' : 'cities'}. Select a place.` : 'World · select a region to zoom in.'}</p>
  </>
}

export default function HackathonMap({ hackathons }: { hackathons: Hackathon[] }) {
  const places = useMemo(() => groupHackathonPlaces(hackathons), [hackathons])
  const regions = useMemo(() => buildRegions(places), [places])
  const [selectedId, setSelectedId] = useState<string>()
  const id = useId()
  const initialPlace = [...places].sort((a, b) => b.events.length - a.events.length)[0]
  const selected = places.find(place => place.id === selectedId) ?? initialPlace
  if (!selected) return null
  const cities = places.filter(place => !place.isRemote && place.city !== 'Location unlisted')
  const countries = new Set(cities.map(place => place.country.toLowerCase()).filter(Boolean))
  const unpositioned = places.filter(place => !placeCoordinates(place))

  function placeButton(place: HackathonPlace) {
    return <button key={place.id} type="button" className="hackathon-atlas-place"
      aria-label={`${place.city}, ${place.events.length} ${place.events.length === 1 ? 'event' : 'events'}`}
      aria-pressed={selected.id === place.id} aria-controls={`${id}-events`}
      onMouseEnter={() => setSelectedId(place.id)} onFocus={() => setSelectedId(place.id)} onClick={() => setSelectedId(place.id)}
    >{place.isRemote && <span aria-hidden="true">◎</span>}<span>{place.city}</span><span className="hackathon-atlas-count">{place.events.length}</span></button>
  }

  return (
    <section className="hackathon-atlas" aria-labelledby={`${id}-title`}>
      <header className="hackathon-atlas-heading">
        <h2 id={`${id}-title`}>Places</h2>
        <span>{cities.length} cities / {countries.size} countries{places.some(place => place.isRemote) ? ' / online' : ''}</span>
      </header>
      {regions.length > 0 && <MapExplorer key={regions.map(region => region.id).join(';')} regions={regions} selectedId={selected.id} onSelect={setSelectedId} panelId={`${id}-events`} />}
      {unpositioned.length > 0 && <div className="hackathon-atlas-other" role="group" aria-label="Online and locations without map coordinates">{unpositioned.map(placeButton)}</div>}
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
