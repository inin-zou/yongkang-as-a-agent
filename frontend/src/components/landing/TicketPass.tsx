import { useEffect } from 'react'
import gsap from 'gsap'
import PixelPortrait from './PixelPortrait'
import './TicketPass.css'

interface TicketPassProps {
  onAccessClick: () => void
  ticketRef: React.RefObject<HTMLDivElement | null>
  reducedMotion: boolean
}

export default function TicketPass({ onAccessClick, ticketRef, reducedMotion }: TicketPassProps) {
  /* Entrance animation: fade in from blur */
  useEffect(() => {
    if (!ticketRef.current || reducedMotion) return

    gsap.fromTo(
      ticketRef.current,
      { opacity: 0, filter: 'blur(10px)' },
      { opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out', delay: 0.5 },
    )
  }, [ticketRef, reducedMotion])

  return (
    <article
      className="ticket-wrapper"
      ref={ticketRef}
      role="region"
      aria-label="Agent credentials"
      style={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* Left: Visual zone — decorative */}
      <div className="visual-zone" aria-hidden="true">
        <PixelPortrait />
        <div className="visual-overlay-text">
          <span>A G E N T</span>
          <span style={{ paddingLeft: '1.5rem' }}>D O S S I E R</span>
        </div>
      </div>

      {/* Right: Data zone */}
      <div className="data-zone">
        <dl className="data-grid">
          <dt className="col-label">AGENT</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">YONGKANG ZOU</dd>

          <dt className="col-label">CODENAME</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">
            <a href="https://github.com/inin-zou" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--color-ink-faint)' }}>
              @inin-zou
            </a>
          </dd>

          <dt className="col-label">BASE</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">PARIS, FR</dd>

          <dt className="col-label">ROLE</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">AI ENGINEER</dd>
        </dl>

        <div className="texture-divider" aria-hidden="true">
          LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
        </div>

        <dl className="data-grid">
          <dt className="col-label">STACK</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">GO / TS / PYTHON</dd>

          <dt className="col-label">WINS</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">9 / 24 HACKATHONS</dd>

          <dt className="col-label">SPEED</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">FULL DEMO IN {'<'} 20H AVG</dd>
        </dl>

        <div className="ticket-footer">
          <button
            className="access-btn"
            onClick={onAccessClick}
            aria-label="Enter the file system"
            data-interactive
          >
            ACCESS FILE SYSTEM
          </button>
          <div className="footer-meta">
            <span>github.com/inin-zou</span>
            <span>inhibitor</span>
          </div>
        </div>
      </div>
    </article>
  )
}
