import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import gsap from 'gsap'
import RibbonScene from '../components/landing/RibbonScene'
import TicketPass from '../components/landing/TicketPass'
import GlitchOverlay from '../components/landing/GlitchOverlay'
import { playExitTransition } from '../components/landing/LandingTransition'
import { useReducedMotion } from '../hooks/useReducedMotion'

export default function Landing() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ribbonGroupRef = useRef<THREE.Group | null>(null)
  const reducedMotion = useReducedMotion()

  const handleAccess = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)

    if (reducedMotion) {
      // Simple fade for reduced motion
      gsap.to(document.body, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          navigate('/files/soul')
          gsap.set(document.body, { opacity: 1 })
        },
      })
      return
    }

    // Full cinematic transition
    if (ticketRef.current && canvasRef.current && ribbonGroupRef.current) {
      playExitTransition({
        ticketEl: ticketRef.current,
        canvasEl: canvasRef.current,
        ribbonGroup: ribbonGroupRef.current,
        onComplete: () => navigate('/files/soul'),
      })
    } else {
      // Fallback: just navigate
      navigate('/files/soul')
    }
  }, [navigate, isTransitioning, reducedMotion])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Layer 0: Three.js ribbons + particles */}
      <RibbonScene
        reducedMotion={reducedMotion}
        ribbonGroupRef={ribbonGroupRef}
        canvasRef={canvasRef}
      />

      {/* Layer 1: Glitch overlay */}
      <GlitchOverlay />

      {/* Layer 2: Ticket pass overlay */}
      <TicketPass
        onAccessClick={handleAccess}
        ticketRef={ticketRef}
        reducedMotion={reducedMotion}
      />

      {/* Layer 2: Noise overlay is rendered globally by LandingLayout */}
    </div>
  )
}
