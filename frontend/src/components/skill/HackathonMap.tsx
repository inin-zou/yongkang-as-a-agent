import { useMemo, useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
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
  const pinsRef = useRef<SVGGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const clusters = useMemo(() => clusterByCity(hackathons), [hackathons])
  const maxCount = useMemo(() => Math.max(...clusters.map(c => c.count), 1), [clusters])

  // Create dotted map SVG
  const { svgContent, mapInstance } = useMemo(() => {
    const map = new DottedMap({ height: 60, grid: 'diagonal' })
    const svg = map.getSVG({
      radius: 0.22,
      color: '#3a3a3a',
      shape: 'circle',
      backgroundColor: 'transparent',
    })
    return { svgContent: svg, mapInstance: map }
  }, [])

  // Get pin positions
  const pinPositions = useMemo(() => {
    return clusters.map(cluster => {
      const pin = mapInstance.getPin({ lat: cluster.lat, lng: cluster.lng })
      return { ...cluster, x: pin.x, y: pin.y }
    })
  }, [clusters, mapInstance])

  // Animate pins on mount
  useEffect(() => {
    if (!pinsRef.current) return
    const pins = pinsRef.current.querySelectorAll('.hackathon-pin')
    if (pins.length === 0) return

    gsap.from(pins, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'back.out(1.7)',
      transformOrigin: 'center center',
    })
  }, [pinPositions])

  const handlePinHover = (cluster: CityCluster & { x: number; y: number }, e: React.MouseEvent) => {
    setHoveredCity(cluster)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 10,
      })
    }
  }

  // Parse the dotted map SVG to extract viewBox
  const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 120 60'

  return (
    <div className="hackathon-map-container" ref={containerRef}>
      <svg
        className="hackathon-map-svg"
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{
          __html: svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, ''),
        }}
      />

      {/* Overlay pins as absolute-positioned SVG */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hotGlow">
            <stop offset="0%" stopColor="#ff6b9d" stopOpacity="1" />
            <stop offset="40%" stopColor="#ff6b9d" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff6b9d" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g ref={pinsRef}>
          {pinPositions.map((pin) => {
            const intensity = pin.count / maxCount
            const outerR = 1 + intensity * 5
            const midR = 0.5 + intensity * 2.5
            const coreR = 0.25 + intensity * 0.8
            const isHot = intensity > 0.8

            // Convert percentage to viewBox coordinates
            const vb = viewBox.split(' ').map(Number)
            const cx = (pin.x / 100) * vb[2]
            const cy = (pin.y / 100) * vb[3]

            return (
              <g
                key={pin.city}
                className="hackathon-pin"
                onMouseEnter={(e) => handlePinHover(pin, e)}
                onMouseLeave={() => setHoveredCity(null)}
                onMouseMove={(e) => {
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect()
                    setTooltipPos({
                      x: e.clientX - rect.left + 12,
                      y: e.clientY - rect.top - 10,
                    })
                  }
                }}
              >
                {/* Outer glow */}
                <circle
                  cx={cx} cy={cy} r={outerR}
                  fill="#ff6b9d"
                  opacity={0.05 + intensity * 0.1}
                />
                {/* Mid glow */}
                <circle
                  cx={cx} cy={cy} r={midR}
                  fill="#ff6b9d"
                  opacity={0.1 + intensity * 0.15}
                />
                {/* Core */}
                <circle
                  cx={cx} cy={cy} r={coreR}
                  fill="#ff6b9d"
                  opacity={0.5 + intensity * 0.5}
                />
                {/* White-hot center for Paris */}
                {isHot && (
                  <circle cx={cx} cy={cy} r={0.2} fill="#ffffff" opacity={0.7} />
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredCity && (
        <div
          className="hackathon-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="hackathon-tooltip-city">{hoveredCity.city}</div>
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
