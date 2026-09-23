import { useEffect, useRef, type ReactNode } from 'react'

export default function SoulReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.classList.add('soul-reveal-pending')
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        element.classList.remove('soul-reveal-pending')
        element.classList.add('soul-reveal-entered')
        observer.disconnect()
      }
    }, { threshold: 0.06 })
    observer.observe(element)
    return () => { observer.disconnect(); element.classList.remove('soul-reveal-pending') }
  }, [])
  return <div ref={ref} className="soul-reveal">{children}</div>
}
