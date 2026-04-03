import { type ReactNode } from 'react'
import GridBackground from './GridBackground'
import NoiseOverlay from './NoiseOverlay'
import CrosshairCursor from './CrosshairCursor'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <GridBackground />
      <NoiseOverlay />
      <CrosshairCursor />
      <div
        style={{
          position: 'relative',
          marginTop: 'var(--ruler-x-height)',
          marginLeft: 'var(--ruler-y-width)',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </>
  )
}
