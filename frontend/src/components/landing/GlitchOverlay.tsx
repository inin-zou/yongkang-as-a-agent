import { useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * Procedural glitch overlay — generates rectangular blocks, vertical strips,
 * horizontal bands, and cross-pattern intersections algorithmically.
 *
 * Each glitch burst creates a unique composition of:
 * - Rectangular blocks (random position, size, color, scanline direction)
 * - Vertical strips (tall, narrow, shifted)
 * - Horizontal bands (wide, short, shifted)
 * - Cross intersections where vertical + horizontal overlap (brighter)
 * - Chromatic RGB channel displacement
 * - Thin scan tear lines
 */

const COLORS = [
  { r: 249, g: 114, b: 121 }, // pink
  { r: 77,  g: 208, b: 225 }, // teal
  { r: 179, g: 136, b: 255 }, // lavender
  { r: 255, g: 138, b: 101 }, // coral
  { r: 105, g: 240, b: 174 }, // mint
  { r: 198, g: 216, b: 230 }, // pearl
]

function randRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function pickColor(alpha: number) {
  const c = COLORS[Math.floor(Math.random() * COLORS.length)]
  return `rgba(${c.r},${c.g},${c.b},${alpha})`
}

interface GlitchRect {
  x: number  // % left
  y: number  // % top
  w: number  // % width
  h: number  // % height
  color: string
  offsetX: number // px shift
  offsetY: number // px shift
  scanDir: 'h' | 'v' // scanline direction
}

function generateBurst(): GlitchRect[] {
  const rects: GlitchRect[] = []
  const count = Math.floor(randRange(4, 12))

  for (let i = 0; i < count; i++) {
    const type = Math.random()

    if (type < 0.35) {
      // Rectangular block — medium size, random position
      rects.push({
        x: randRange(0, 85),
        y: randRange(0, 85),
        w: randRange(8, 25),
        h: randRange(8, 30),
        color: pickColor(randRange(0.08, 0.2)),
        offsetX: randRange(-6, 6),
        offsetY: randRange(-3, 3),
        scanDir: Math.random() > 0.5 ? 'h' : 'v',
      })
    } else if (type < 0.6) {
      // Vertical strip — tall and narrow
      const x = randRange(0, 90)
      rects.push({
        x,
        y: randRange(0, 20),
        w: randRange(3, 10),
        h: randRange(40, 80),
        color: pickColor(randRange(0.06, 0.16)),
        offsetX: randRange(-8, 8),
        offsetY: 0,
        scanDir: 'v',
      })
    } else if (type < 0.85) {
      // Horizontal band — wide and short
      const y = randRange(0, 90)
      rects.push({
        x: randRange(0, 15),
        y,
        w: randRange(40, 85),
        h: randRange(2, 8),
        color: pickColor(randRange(0.08, 0.18)),
        offsetX: randRange(-10, 10),
        offsetY: 0,
        scanDir: 'h',
      })
    } else {
      // Small accent square — like a pixel artifact
      rects.push({
        x: randRange(5, 90),
        y: randRange(5, 90),
        w: randRange(3, 8),
        h: randRange(3, 8),
        color: pickColor(randRange(0.12, 0.25)),
        offsetX: randRange(-4, 4),
        offsetY: randRange(-4, 4),
        scanDir: Math.random() > 0.5 ? 'h' : 'v',
      })
    }
  }

  // Add 1-3 cross-pattern intersections (brighter where V and H overlap)
  const crossCount = Math.floor(randRange(1, 4))
  for (let i = 0; i < crossCount; i++) {
    const cx = randRange(10, 80)
    const cy = randRange(10, 80)
    const armLen = randRange(15, 40)
    const thickness = randRange(3, 8)
    const color = pickColor(randRange(0.1, 0.2))
    const offset = randRange(-5, 5)

    // Horizontal arm
    rects.push({
      x: cx - armLen / 2,
      y: cy - thickness / 2,
      w: armLen,
      h: thickness,
      color,
      offsetX: offset,
      offsetY: 0,
      scanDir: 'h',
    })
    // Vertical arm
    rects.push({
      x: cx - thickness / 2,
      y: cy - armLen / 2,
      w: thickness,
      h: armLen,
      color,
      offsetX: offset,
      offsetY: 0,
      scanDir: 'v',
    })
  }

  return rects
}

function renderRect(rect: GlitchRect): string {
  const scanlines = rect.scanDir === 'h'
    ? `repeating-linear-gradient(0deg,transparent 0px,transparent 1px,rgba(255,255,255,0.05) 1px,rgba(255,255,255,0.05) 2px)`
    : `repeating-linear-gradient(90deg,transparent 0px,transparent 1px,rgba(255,255,255,0.05) 1px,rgba(255,255,255,0.05) 2px)`

  return `<div style="
    position:absolute;
    left:${rect.x}%;
    top:${rect.y}%;
    width:${rect.w}%;
    height:${rect.h}%;
    transform:translate(${rect.offsetX}px,${rect.offsetY}px);
    background:${rect.color};
    background-image:${scanlines};
    mix-blend-mode:screen;
  "></div>`
}

function GlitchEngine() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const tick = useCallback(() => {
    const el = containerRef.current
    if (!el) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // State stored on the DOM element to avoid re-renders
    const state = (el as any).__glitchState || {
      isGlitching: false,
      burstEnd: 0,
      nextBurst: performance.now() + randRange(800, 3000),
      flickerPhase: 0,
    }
    ;(el as any).__glitchState = state

    const now = performance.now()

    // Start a new burst
    if (!state.isGlitching && now >= state.nextBurst) {
      state.isGlitching = true
      state.burstEnd = now + randRange(120, 500)
      state.flickerPhase = 0
      const rects = generateBurst()
      el.innerHTML = rects.map(renderRect).join('')
    }

    // During burst — flicker: randomly regenerate a few times
    if (state.isGlitching && now < state.burstEnd) {
      state.flickerPhase++

      // Flicker every ~3-5 frames with slight position jitter
      if (state.flickerPhase % (3 + Math.floor(Math.random() * 3)) === 0) {
        // Sometimes regenerate entirely, sometimes just shift
        if (Math.random() < 0.4) {
          const rects = generateBurst()
          el.innerHTML = rects.map(renderRect).join('')
        } else {
          // Jitter existing elements
          el.style.transform = `translate(${randRange(-3, 3)}px, ${randRange(-2, 2)}px)`
        }
      }

      // Random brief blank frames (makes it feel more digital)
      if (Math.random() < 0.15) {
        el.style.opacity = '0'
      } else {
        el.style.opacity = '1'
      }
    }

    // End burst
    if (state.isGlitching && now >= state.burstEnd) {
      state.isGlitching = false
      state.nextBurst = now + randRange(1500, 5000)
      el.innerHTML = ''
      el.style.opacity = '1'
      el.style.transform = 'none'
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        willChange: 'opacity, transform',
      }}
    />
  )
}

// Chromatic aberration — two shifted color bands
function ChromaShift() {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let nextFire = performance.now() + randRange(2000, 6000)
    let endTime = 0
    let active = false

    function tick() {
      const now = performance.now()

      if (!active && now >= nextFire) {
        active = true
        endTime = now + randRange(60, 200)
      }

      if (active && now < endTime) {
        const shiftR = randRange(-8, 8)
        const shiftC = randRange(-8, 8)
        const y1 = randRange(0, 80)
        const h1 = randRange(5, 20)

        el.innerHTML = `
          <div style="position:absolute;left:0;right:0;top:${y1}%;height:${h1}%;
            background:rgba(249,114,121,0.05);transform:translateX(${shiftR}px);mix-blend-mode:screen"></div>
          <div style="position:absolute;left:0;right:0;top:${y1 + randRange(1, 4)}%;height:${h1}%;
            background:rgba(77,208,225,0.04);transform:translateX(${shiftC}px);mix-blend-mode:screen"></div>
        `
      } else if (active) {
        active = false
        nextFire = now + randRange(2000, 6000)
        el.innerHTML = ''
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
}

export default function GlitchOverlay() {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden
    >
      {/* Two independent glitch engines for layered density */}
      <GlitchEngine />
      <GlitchEngine />

      {/* Chromatic aberration */}
      <ChromaShift />
    </div>
  )
}
