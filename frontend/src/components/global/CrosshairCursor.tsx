import { useEffect, useRef, useState } from 'react'

interface CrosshairCursorProps {
  /** Show the grid cell indicator (only on file system pages, not landing) */
  showCellIndicator?: boolean
}

export default function CrosshairCursor({ showCellIndicator = true }: CrosshairCursorProps) {
  const dotRef = useRef<HTMLDivElement>(null)
  const outlineRef = useRef<HTMLDivElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)
  const mousePos = useRef({ x: 0, y: 0 })
  const outlinePos = useRef({ x: 0, y: 0 })
  const isHovering = useRef(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const match = window.matchMedia('(pointer: fine)')
    setIsDesktop(match.matches)

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    match.addEventListener('change', handler)
    return () => match.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!isDesktop) return

    // Hide default cursor
    document.body.style.cursor = 'none'

    const style = getComputedStyle(document.documentElement)
    const cellSize = parseInt(style.getPropertyValue('--cell-size'), 10) || 20
    const rulerXHeight = parseInt(style.getPropertyValue('--ruler-x-height'), 10) || 20
    const rulerYWidth = parseInt(style.getPropertyValue('--ruler-y-width'), 10) || 30

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }

      // Update dot immediately
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`
      }

      // Update cell indicator (snap to grid)
      if (cellRef.current) {
        const snapX =
          Math.floor((e.clientX - rulerYWidth) / cellSize) * cellSize + rulerYWidth
        const snapY =
          Math.floor((e.clientY - rulerXHeight) / cellSize) * cellSize + rulerXHeight
        cellRef.current.style.transform = `translate(${snapX}px, ${snapY}px)`
      }
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, [data-interactive]')) {
        isHovering.current = true
      }
    }

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, [data-interactive]')) {
        isHovering.current = false
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)

    // Animation loop for outline easing
    let animId: number
    const animate = () => {
      outlinePos.current.x += (mousePos.current.x - outlinePos.current.x) * 0.1
      outlinePos.current.y += (mousePos.current.y - outlinePos.current.y) * 0.1

      if (outlineRef.current) {
        const size = isHovering.current ? 60 : 40
        const half = size / 2
        outlineRef.current.style.width = `${size}px`
        outlineRef.current.style.height = `${size}px`
        outlineRef.current.style.borderColor = isHovering.current
          ? 'var(--color-ink-muted)'
          : 'var(--color-ink-faint)'
        outlineRef.current.style.transform = `translate(${outlinePos.current.x - half}px, ${outlinePos.current.y - half}px)`
      }

      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
      cancelAnimationFrame(animId)
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'var(--color-prism-pink)',
          pointerEvents: 'none',
          zIndex: 10000,
          willChange: 'transform',
        }}
      />

      {/* Outline with crosshair lines */}
      <div
        ref={outlineRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid var(--color-ink-faint)',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
          transition: 'width 0.2s ease, height 0.2s ease, border-color 0.2s ease',
        }}
      />

      {/* Active cell indicator — only on file system pages */}
      {showCellIndicator && (
        <div
          ref={cellRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 'var(--cell-size)',
            height: 'var(--cell-size)',
            border: '1px solid var(--color-prism-pink)',
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: 2,
            willChange: 'transform',
          }}
        />
      )}
    </>
  )
}
