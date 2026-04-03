import gsap from 'gsap'
import type * as THREE from 'three'

interface TransitionTargets {
  ticketEl: HTMLDivElement
  canvasEl: HTMLCanvasElement
  ribbonGroup: THREE.Group
  onComplete: () => void
}

export function playExitTransition({
  ticketEl,
  canvasEl,
  ribbonGroup,
  onComplete,
}: TransitionTargets): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete })

  // Phase A (0s - 0.6s): Ribbons converge toward center
  tl.to(
    {},
    {
      duration: 0.6,
      ease: 'power2.in',
      onUpdate: function (this: gsap.core.Tween) {
        const progress = this.progress()
        // Squeeze ribbons vertically toward y=0
        ribbonGroup.scale.y = 1 - progress * 0.7
        // Pull ribbons toward center (compress x-spread)
        ribbonGroup.scale.x = 1 - progress * 0.3
      },
    },
    0,
  )

  // Phase B (0.3s - 0.8s): Ticket morphs — shrinks, moves to top
  tl.to(
    ticketEl,
    {
      duration: 0.5,
      ease: 'power3.inOut',
      width: '100%',
      height: '48px',
      top: '20px',
      left: '30px',
      transform: 'translate(0, 0)',
      borderRadius: '0px',
      opacity: 0,
    },
    0.3,
  )

  // Phase C (0.6s - 1.0s): Canvas fades out
  tl.to(
    canvasEl,
    {
      duration: 0.4,
      ease: 'power2.out',
      opacity: 0,
    },
    0.6,
  )

  return tl
}
