import { useMemo, useState, useRef } from 'react'
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

export default function HackathonMap({ hackathons }: { hackathons: Hackathon[] }) {
  const [hoveredCity, setHoveredCity] = useState<CityCluster | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const clusters = useMemo(() => clusterByCity(hackathons), [hackathons])
  const maxCount = useMemo(() => Math.max(...clusters.map(c => c.count), 1), [clusters])

  // Build dotted map with pins added via addPin()
  const { svgContent, pinPoints } = useMemo(() => {
    const map = new DottedMap({ height: 100, grid: 'diagonal' })

    // Add each city as a pin — this uses the library's own projection
    for (const cluster of clusters) {
      const intensity = cluster.count / maxCount
      map.addPin({
        lat: cluster.lat,
        lng: cluster.lng,
        svgOptions: {
          color: '#ff6b9d',
          radius: 0.4 + intensity * 1.2,
        },
      })
    }

    const svg = map.getSVG({
      radius: 0.35,
      color: '#555555',
      shape: 'circle',
      backgroundColor: 'transparent',
    })

    const pins = clusters.map(cluster => {
      // Use getPin for position (returns {x, y} in SVG coordinate space)
      const pinPos = map.getPin({ lat: cluster.lat, lng: cluster.lng })
      return { ...cluster, x: pinPos?.x ?? 0, y: pinPos?.y ?? 0 }
    })

    return { svgContent: svg, pinPoints: pins }
  }, [clusters, maxCount])

  const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 200 100'

  return (
    <div className="hackathon-map-container" ref={containerRef}>
      {/* Map with pins baked in */}
      <svg
        className="hackathon-map-svg"
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{
          __html: svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, ''),
        }}
      />

      {/* Labels + glow overlay */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
      >
        {pinPoints.map((pin) => {
          const intensity = pin.count / maxCount
          const glowR = 2 + intensity * 6

          return (
            <g key={pin.city}>
              {/* Glow behind pin */}
              <circle cx={pin.x} cy={pin.y} r={glowR} fill="#ff6b9d" opacity={0.08 + intensity * 0.12} />
              {/* Label */}
              <text
                x={pin.x}
                y={pin.y - (0.4 + intensity * 1.2) - 1}
                fill="#ff6b9d"
                opacity={0.5 + intensity * 0.5}
                fontFamily="sans-serif"
                fontSize={intensity > 0.5 ? 1.8 : 1.3}
                textAnchor="middle"
              >
                {pin.city}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Invisible hover targets */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
      >
        {pinPoints.map((pin) => {
          const intensity = pin.count / maxCount
          const hitR = 3 + intensity * 5

          return (
            <circle
              key={`hit-${pin.city}`}
              cx={pin.x}
              cy={pin.y}
              r={hitR}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                setHoveredCity(pin)
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect()
                  setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 })
                }
              }}
              onMouseLeave={() => setHoveredCity(null)}
              onMouseMove={(e) => {
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect()
                  setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 })
                }
              }}
            />
          )
        })}
      </svg>

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
