import { type ReactNode } from 'react'
import NoiseOverlay from './NoiseOverlay'
import PrismaticBackground from './PrismaticBackground'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <PrismaticBackground />
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </>
  )
}
