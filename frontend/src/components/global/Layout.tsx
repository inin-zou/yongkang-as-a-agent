import { type ReactNode } from 'react'
import GridBackground from './GridBackground'
import NoiseOverlay from './NoiseOverlay'
import CrosshairCursor from './CrosshairCursor'
import TabNavigation from './TabNavigation'

interface LayoutProps {
  showTabs?: boolean
  children?: ReactNode
}

export default function Layout({ showTabs = true, children }: LayoutProps) {
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
        {showTabs && <TabNavigation />}
        <div style={{ paddingTop: showTabs ? 12 : 0 }}>
          {children}
        </div>
      </div>
    </>
  )
}
