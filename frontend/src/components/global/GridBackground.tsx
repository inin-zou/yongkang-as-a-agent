import { useEffect, useState, useCallback } from 'react'

function getColumnLabel(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index)
  const first = Math.floor(index / 26) - 1
  const second = index % 26
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second)
}

export default function GridBackground() {
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<number[]>([])
  const [cursorPos, setCursorPos] = useState({ col: 'A', row: 1 })

  const computeLabels = useCallback(() => {
    const style = getComputedStyle(document.documentElement)
    const cellSize = parseInt(style.getPropertyValue('--cell-size'), 10) || 20
    const rulerXHeight = parseInt(style.getPropertyValue('--ruler-x-height'), 10) || 20
    const rulerYWidth = parseInt(style.getPropertyValue('--ruler-y-width'), 10) || 30

    const colCount = Math.ceil((window.innerWidth - rulerYWidth) / cellSize)
    const rowCount = Math.ceil((window.innerHeight - rulerXHeight) / cellSize)

    const cols: string[] = []
    for (let i = 0; i < colCount; i++) {
      cols.push(getColumnLabel(i))
    }

    const rowLabels: number[] = []
    for (let i = 1; i <= rowCount; i++) {
      rowLabels.push(i)
    }

    setColumns(cols)
    setRows(rowLabels)
  }, [])

  useEffect(() => {
    computeLabels()
    window.addEventListener('resize', computeLabels)
    return () => window.removeEventListener('resize', computeLabels)
  }, [computeLabels])

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const cellSize = parseInt(style.getPropertyValue('--cell-size'), 10) || 20
    const rulerXHeight = parseInt(style.getPropertyValue('--ruler-x-height'), 10) || 20
    const rulerYWidth = parseInt(style.getPropertyValue('--ruler-y-width'), 10) || 30

    const handleMouseMove = (e: MouseEvent) => {
      const colIndex = Math.max(0, Math.floor((e.clientX - rulerYWidth) / cellSize))
      const rowIndex = Math.max(0, Math.floor((e.clientY - rulerXHeight) / cellSize))
      setCursorPos({
        col: getColumnLabel(colIndex),
        row: rowIndex + 1,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <>
      {/* X Ruler (top horizontal bar) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 'var(--ruler-y-width)',
          width: 'calc(100% - var(--ruler-y-width))',
          height: 'var(--ruler-x-height)',
          background: 'var(--color-surface-0)',
          borderBottom: '1px solid var(--color-grid-major)',
          display: 'flex',
          alignItems: 'center',
          zIndex: 100,
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-ink-muted)',
          userSelect: 'none',
        }}
      >
        {columns.map((label) => (
          <span
            key={label}
            style={{
              width: 'var(--cell-size)',
              minWidth: 'var(--cell-size)',
              textAlign: 'center',
              lineHeight: 'var(--ruler-x-height)',
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Y Ruler (left vertical bar) */}
      <div
        style={{
          position: 'fixed',
          top: 'var(--ruler-x-height)',
          left: 0,
          width: 'var(--ruler-y-width)',
          height: 'calc(100% - var(--ruler-x-height))',
          background: 'var(--color-surface-0)',
          borderRight: '1px solid var(--color-grid-major)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 100,
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-ink-muted)',
          userSelect: 'none',
        }}
      >
        {rows.map((label) => (
          <span
            key={label}
            style={{
              height: 'var(--cell-size)',
              minHeight: 'var(--cell-size)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 'var(--cell-size)',
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Coordinates display */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          background: 'var(--color-surface-0)',
          color: 'var(--color-ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          padding: '4px 10px',
          zIndex: 100,
          userSelect: 'none',
        }}
      >
        X: {cursorPos.col} | Y: {cursorPos.row}
      </div>
    </>
  )
}
