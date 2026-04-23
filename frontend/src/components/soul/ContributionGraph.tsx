import { useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchGitHubContributions } from '../../lib/api'
import type { ContributionDay } from '../../lib/api'

const CELL = 11
const GAP = 2
const STRIDE = CELL + GAP
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Prismatic palette for intensity levels (0-4)
const COLORS = [
  'rgba(255,255,255,0.04)',  // 0: empty
  'rgba(77, 208, 225, 0.25)', // 1: low (teal faint)
  'rgba(77, 208, 225, 0.45)', // 2: medium
  'rgba(105, 240, 174, 0.6)', // 3: high (teal→mint)
  'rgba(105, 240, 174, 0.85)', // 4: max (mint bright)
]

function getLevel(count: number, max: number): number {
  if (count === 0) return 0
  if (max === 0) return 0
  const ratio = count / max
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

export default function ContributionGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const { data: calendar, isLoading } = useQuery({
    queryKey: ['github-contributions'],
    queryFn: fetchGitHubContributions,
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !calendar) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const weeks = calendar.weeks
    const allDays = weeks.flatMap(w => w.contributionDays)
    const maxCount = Math.max(...allDays.map(d => d.contributionCount), 1)

    const dpr = window.devicePixelRatio || 1
    const LEFT_PAD = 28
    const TOP_PAD = 16
    const w = LEFT_PAD + weeks.length * STRIDE + GAP
    const h = TOP_PAD + 7 * STRIDE + 20 // 7 days + legend

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, w, h)

    // Month labels
    ctx.font = '9px system-ui'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const firstDay = week.contributionDays[0]
      if (!firstDay) return
      const month = new Date(firstDay.date).getMonth()
      if (month !== lastMonth) {
        lastMonth = month
        ctx.fillText(MONTHS[month], LEFT_PAD + wi * STRIDE, 2)
      }
    })

    // Day labels (Mon, Wed, Fri)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ;['', 'M', '', 'W', '', 'F', ''].forEach((label, i) => {
      if (label) ctx.fillText(label, LEFT_PAD - 4, TOP_PAD + i * STRIDE + CELL / 2)
    })

    // Cells
    weeks.forEach((week, wi) => {
      week.contributionDays.forEach((day) => {
        const dow = new Date(day.date).getDay()
        const x = LEFT_PAD + wi * STRIDE
        const y = TOP_PAD + dow * STRIDE
        const level = getLevel(day.contributionCount, maxCount)

        ctx.fillStyle = COLORS[level]
        ctx.beginPath()
        ctx.roundRect(x, y, CELL, CELL, 2)
        ctx.fill()

        // Subtle glow for high-contribution days
        if (level >= 3) {
          ctx.shadowColor = level === 4 ? 'rgba(105,240,174,0.4)' : 'rgba(77,208,225,0.25)'
          ctx.shadowBlur = 6
          ctx.fillStyle = COLORS[level]
          ctx.beginPath()
          ctx.roundRect(x, y, CELL, CELL, 2)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
        }
      })
    })

    // Legend
    const legendY = TOP_PAD + 7 * STRIDE + 6
    ctx.font = '9px system-ui'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('Less', w - 120, legendY + CELL / 2)
    COLORS.forEach((color, i) => {
      const lx = w - 88 + i * (CELL + 2)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(lx, legendY, CELL, CELL, 2)
      ctx.fill()
    })
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('More', w - 88 + 5 * (CELL + 2) + 2, legendY + CELL / 2)
  }, [calendar])

  useEffect(() => { draw() }, [draw])

  // Tooltip on hover
  function handleMouseMove(e: React.MouseEvent) {
    const canvas = canvasRef.current
    const tooltip = tooltipRef.current
    if (!canvas || !tooltip || !calendar) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const LEFT_PAD = 28
    const TOP_PAD = 16
    const wi = Math.floor((mx - LEFT_PAD) / STRIDE)
    const di = Math.floor((my - TOP_PAD) / STRIDE)

    if (wi < 0 || wi >= calendar.weeks.length || di < 0 || di > 6) {
      tooltip.style.display = 'none'
      return
    }

    const day = calendar.weeks[wi]?.contributionDays?.find(
      d => new Date(d.date).getDay() === di
    )
    if (!day) { tooltip.style.display = 'none'; return }

    tooltip.textContent = `${day.contributionCount} contributions on ${day.date}`
    tooltip.style.display = 'block'
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px'
    tooltip.style.top = (e.clientY - rect.top - 24) + 'px'
  }

  function handleMouseLeave() {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none'
  }

  // Find current streak
  function getStreak(days: ContributionDay[]): number {
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].contributionCount > 0) streak++
      else break
    }
    return streak
  }

  const allDays = calendar?.weeks.flatMap(w => w.contributionDays) ?? []
  const streak = getStreak(allDays.slice(0, -1)) // exclude today (might still be contributing)
  const todayCount = allDays[allDays.length - 1]?.contributionCount ?? 0
  if (todayCount > 0) {
    // today counts toward streak
  }
  const finalStreak = todayCount > 0 ? streak + 1 : streak

  return (
    <div className="editor-page">
      <div className="editor-meta">GitHub Contributions — {calendar?.totalContributions ?? '...'} in the last year</div>
      <div className="editor-content">
        <div className="cli-block" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="cli-prompt">$ git log --author="inin-zou" --oneline | wc -l</div>
          <div className="cli-output" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span><strong style={{ color: 'var(--color-ink)' }}>{calendar?.totalContributions ?? '...'}</strong> contributions</span>
            <span>|</span>
            <span><strong style={{ color: 'var(--color-ink)' }}>{finalStreak}</strong> day streak</span>
          </div>
        </div>

        <div style={{ position: 'relative', overflowX: 'auto' }}>
          {isLoading && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
              Loading contributions...
            </p>
          )}
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
          <div
            ref={tooltipRef}
            style={{
              display: 'none',
              position: 'absolute',
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-ink-faint)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--color-ink)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          />
        </div>
      </div>
    </div>
  )
}
