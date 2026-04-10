import { useMemo, useState, useRef, useCallback } from 'react'
import DottedMap from 'dotted-map'
import type { Hackathon } from '../../types'

interface CityCluster {
  city: string
  country: string
  lat: number
  lng: number
  count: number
  hackathons: Hackathon[]
}

function clusterByCity(hackathons: Hackathon[]): CityCluster[] {
  const map = new Map<string, CityCluster>()
  for (const h of hackathons) {
    if (h.isRemote || !h.coordinates || !h.city) continue
    const key = `${h.city}-${h.country}`
    const existing = map.get(key)
    if (existing) {
      existing.count++
      existing.hackathons.push(h)
    } else {
      map.set(key, {
        city: h.city,
        country: h.country || '',
        lat: h.coordinates[0],
        lng: h.coordinates[1],
        count: 1,
        hackathons: [h],
      })
    }
  }
  return Array.from(map.values())
}

// Single SVG map tile (reused 3x for infinite horizontal wrap)
function MapTile({ svgInner, viewBox, pinPoints, maxCount }: {
  svgInner: string; viewBox: string; pinPoints: (CityCluster & { x: number; y: number })[]; maxCount: number
}) {
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: '100%' }}>
      <svg className="hackathon-map-svg" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: svgInner }} />
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
        {pinPoints.map((pin) => {
          const intensity = pin.count / maxCount
          const glowR = 2 + intensity * 6
          return (
            <g key={pin.city}>
              <circle cx={pin.x} cy={pin.y} r={glowR} fill="#ff6b9d" opacity={0.08 + intensity * 0.12} />
              <text x={pin.x} y={pin.y - (0.4 + intensity * 1.2) - 1} fill="#ff6b9d"
                opacity={0.5 + intensity * 0.5} fontFamily="sans-serif"
                fontSize={intensity > 0.5 ? 1.8 : 1.3} textAnchor="middle">
                {pin.city}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function HackathonMap({ hackathons }: { hackathons: Hackathon[] }) {
  const [hoveredCity, setHoveredCity] = useState<CityCluster | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Pan state
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)

  const clusters = useMemo(() => clusterByCity(hackathons), [hackathons])
  const maxCount = useMemo(() => Math.max(...clusters.map(c => c.count), 1), [clusters])

  const { svgInner, pinPoints, viewBox } = useMemo(() => {
    const map = new DottedMap({ height: 100, grid: 'diagonal' })

    for (const cluster of clusters) {
      const intensity = cluster.count / maxCount
      map.addPin({
        lat: cluster.lat,
        lng: cluster.lng,
        svgOptions: { color: '#ff6b9d', radius: 0.4 + intensity * 1.2 },
      })
    }

    const svg = map.getSVG({
      radius: 0.35,
      color: '#555555',
      shape: 'circle',
      backgroundColor: 'transparent',
    })

    const pins = clusters.map(cluster => {
      const pinPos = map.getPin({ lat: cluster.lat, lng: cluster.lng })
      return { ...cluster, x: pinPos?.x ?? 0, y: pinPos?.y ?? 0 }
    })

    const vbMatch = svg.match(/viewBox="([^"]*)"/)
    const vb = vbMatch ? vbMatch[1] : '0 0 200 100'
    const inner = svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')

    return { svgInner: inner, pinPoints: pins, viewBox: vb }
  }, [clusters, maxCount])

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [panX, panY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPanX(dragRef.current.startPanX + dx)
    setPanY(Math.max(-100 * zoom, Math.min(100 * zoom, dragRef.current.startPanY + dy)))
  }, [zoom])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.8, Math.min(3, z - e.deltaY * 0.001)))
  }, [])

  // Tooltip on hover targets
  const handlePinEnter = useCallback((pin: CityCluster & { x: number; y: number }, e: React.MouseEvent) => {
    setHoveredCity(pin)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 })
    }
  }, [])

  const handlePinMove = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 })
    }
  }, [])

  // Wrap panX so the map loops infinitely
  const containerWidth = containerRef.current?.clientWidth ?? 800
  const tileWidth = containerWidth * zoom
  const wrappedPanX = ((panX % tileWidth) + tileWidth) % tileWidth - tileWidth

  return (
    <div
      className="hackathon-map-container"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      {/* 3 copies for infinite horizontal wrap */}
      <div style={{
        display: 'flex',
        transform: `translate(${wrappedPanX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: 'top left',
        width: `${300}%`,
        pointerEvents: 'none',
      }}>
        <MapTile svgInner={svgInner} viewBox={viewBox} pinPoints={pinPoints} maxCount={maxCount} />
        <MapTile svgInner={svgInner} viewBox={viewBox} pinPoints={pinPoints} maxCount={maxCount} />
        <MapTile svgInner={svgInner} viewBox={viewBox} pinPoints={pinPoints} maxCount={maxCount} />
      </div>

      {/* Invisible hover targets (positioned on the visible portion) */}
      {[0, 1, 2].map(copy => (
        <svg
          key={`hits-${copy}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${100 * zoom}%`,
            height: `${100 * zoom}%`,
            transform: `translate(${wrappedPanX + copy * tileWidth}px, ${panY}px)`,
            transformOrigin: 'top left',
          }}
          viewBox={viewBox}
          xmlns="http://www.w3.org/2000/svg"
        >
          {pinPoints.map((pin) => {
            const intensity = pin.count / maxCount
            const hitR = 3 + intensity * 5
            return (
              <circle key={`hit-${pin.city}-${copy}`} cx={pin.x} cy={pin.y} r={hitR}
                fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePinEnter(pin, e)}
                onMouseLeave={() => setHoveredCity(null)}
                onMouseMove={handlePinMove}
              />
            )
          })}
        </svg>
      ))}

      {/* Tooltip */}
      {hoveredCity && (
        <div className="hackathon-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div className="hackathon-tooltip-city">{hoveredCity.city}, {hoveredCity.country}</div>
          <div className="hackathon-tooltip-count">{hoveredCity.count} hackathon{hoveredCity.count > 1 ? 's' : ''}</div>
          {hoveredCity.hackathons.map((h, i) => (
            <div key={i} className="hackathon-tooltip-item">
              {h.name} — {h.projectName}
              {h.result && <div className="hackathon-tooltip-result">{h.result}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
