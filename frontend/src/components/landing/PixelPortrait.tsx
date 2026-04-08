import { useEffect, useRef } from 'react'
import pixelData from './pixel-data.ts?raw'

/**
 * High-res pixel art portrait rendered on Canvas.
 * 119x146 grid with 34 photo-sampled colors.
 * Uses canvas + image-rendering: pixelated for crisp scaling.
 */

// Parse the pixel data at module load
function parsePixelData(raw: string): { colors: Record<string, string>; grid: string[][] } {
  const colors: Record<string, string> = {}
  const lines = raw.split('\n')
  let gridLines: string[] = []
  let inGrid = false

  for (const line of lines) {
    const constMatch = line.match(/^const (c\d+|_) = '([^']*)'/)
    if (constMatch) {
      colors[constMatch[1]] = constMatch[2]
      continue
    }
    if (line.includes('const PIXELS')) { inGrid = true; continue }
    if (inGrid && line.includes(']')) {
      const rowMatch = line.match(/\[([^\]]+)\]/)
      if (rowMatch) gridLines.push(rowMatch[1])
    }
  }

  const grid = gridLines.map(row =>
    row.split(',').map(cell => {
      const name = cell.trim()
      if (name === '_') return ''
      return colors[name] || ''
    })
  )

  return { colors, grid }
}

let parsedData: { colors: Record<string, string>; grid: string[][] } | null = null
function getData() {
  if (!parsedData) parsedData = parsePixelData(pixelData)
  return parsedData
}

// Noise colors for pixel flicker
const NOISE = [
  [249, 114, 121, 0.2],
  [77, 208, 225, 0.2],
  [179, 136, 255, 0.2],
  [255, 255, 255, 0.1],
]

export default function PixelPortrait() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { grid } = getData()
    const W = grid[0]?.length || 0
    const H = grid.length
    if (!W || !H) return

    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Draw base portrait
    const imageData = ctx.createImageData(W, H)
    const data = imageData.data

    // Parse hex to RGB cache
    const colorCache: Record<string, [number, number, number]> = {}
    function hexToRgb(hex: string): [number, number, number] {
      if (colorCache[hex]) return colorCache[hex]
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      colorCache[hex] = [r, g, b]
      return [r, g, b]
    }

    // Draw base frame
    function drawBase() {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4
          const color = grid[y][x]
          if (color) {
            const [r, g, b] = hexToRgb(color)
            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
            data[i + 3] = 255
          } else {
            data[i + 3] = 0
          }
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }

    drawBase()

    // Animated noise — flicker a few pixels with prismatic colors
    let frame = 0
    function tick() {
      frame++
      if (frame % 10 === 0) {
        drawBase()

        // Add 3-6 noise pixels
        const count = Math.floor(Math.random() * 4) + 3
        for (let n = 0; n < count; n++) {
          const x = Math.floor(Math.random() * W)
          const y = Math.floor(Math.random() * H)
          if (grid[y]?.[x]) {
            const noise = NOISE[Math.floor(Math.random() * NOISE.length)]
            const i = (y * W + x) * 4
            data[i] = Math.min(255, data[i] + noise[0] * noise[3] * 255)
            data[i + 1] = Math.min(255, data[i + 1] + noise[1] * noise[3] * 255)
            data[i + 2] = Math.min(255, data[i + 2] + noise[2] * noise[3] * 255)
          }
        }
        ctx.putImageData(imageData, 0, 0)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  )
}
