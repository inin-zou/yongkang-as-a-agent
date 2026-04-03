import { useEffect } from 'react'
import gsap from 'gsap'
import HalftoneCanvas from './HalftoneCanvas'
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
        <HalftoneCanvas reducedMotion={reducedMotion} />
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
          <dd className="col-value">inhibitor</dd>

          <dt className="col-label">BASE</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">PARIS, FR</dd>

          <dt className="col-label">CLEARANCE</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">ALL DOMAINS</dd>
        </dl>

        <div className="texture-divider" aria-hidden="true">
          LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
        </div>

        <dl className="data-grid">
          <dt className="col-label">MISSIONS</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">24</dd>

          <dt className="col-label">WINS</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">9</dd>

          <dt className="col-label">SPEED</dt>
          <dd className="col-sep">&gt;</dd>
          <dd className="col-value">{'0 \u2192 DEMO < 20H'}</dd>
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
            <span>ID: 0029384-A</span>
            <span>CLASSIFIED</span>
          </div>
        </div>
      </div>
    </article>
  )
}
