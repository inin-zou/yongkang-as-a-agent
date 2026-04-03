import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: 720,
  animation: 'fadeInFromBlur 0.6s ease forwards',
}

const nameStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '2rem',
  fontWeight: 600,
  color: 'var(--color-ink)',
  margin: 0,
  lineHeight: 1.2,
}

const roleStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: 'var(--color-ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginTop: 'var(--space-xs)',
}

const thesisStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '1rem',
  lineHeight: 1.8,
  color: 'var(--color-ink)',
  maxWidth: 640,
  margin: 'var(--space-lg) 0',
}

const statsContainerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 'var(--space-md)',
  borderTop: '1px solid var(--color-grid)',
  paddingTop: 'var(--space-lg)',
  borderRadius: 'var(--radius-none)',
}

const statValueStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--color-ink)',
  lineHeight: 1.2,
}

const statLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  color: 'var(--color-ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginTop: 4,
}

const seeAlsoHeaderStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'var(--color-ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginTop: 'var(--space-xl)',
  marginBottom: 'var(--space-sm)',
}

const seeAlsoLinkStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: 'var(--color-ink)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--color-ink-faint)',
  paddingBottom: 2,
  cursor: 'none',
  transition: 'border-color 0.15s ease, color 0.15s ease',
}

const separatorStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: 'var(--color-ink-faint)',
  margin: '0 var(--space-sm)',
}

interface Stat {
  value: string
  label: string
}

const STATS: Stat[] = [
  { value: '24', label: 'HACKATHONS' },
  { value: '9', label: 'WINS' },
  { value: '< 20H', label: 'ZERO TO DEMO' },
  { value: 'PARIS, FR', label: 'BASE' },
  { value: '8+', label: 'DOMAINS EXPLORED' },
]

interface SeeAlsoLink {
  label: string
  to: string
}

const SEE_ALSO: SeeAlsoLink[] = [
  { label: 'SKILL.md', to: '/files/skill' },
  { label: 'MEMORY.md', to: '/files/memory' },
  { label: 'CONTACT.md', to: '/files/contact' },
  { label: 'MUSIC.md', to: '/files/music' },
]

export default function SoulPage() {
  return (
    <div style={pageStyle}>
      {/* Name block */}
      <h1 style={nameStyle}>Yongkang ZOU</h1>
      <p style={roleStyle}>AI Engineer / Creative Technologist</p>

      {/* Thesis paragraph */}
      <p style={thesisStyle}>
        Creative technologist assembling skills across domains — from enterprise
        RAG pipelines and multi-agent orchestration to 3D spatial intelligence
        and music AI. Part engineer, part artist. 24 hackathons, 9 wins, a
        record of going from zero to demo in under 20 hours. Every role, every
        hackathon, every domain shift was equipping the agent with a new
        capability.
      </p>

      {/* Stats row */}
      <div style={statsContainerStyle}>
        {STATS.map((stat) => (
          <div key={stat.label}>
            <div style={statValueStyle}>{stat.value}</div>
            <div style={statLabelStyle}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* See also links */}
      <p style={seeAlsoHeaderStyle}>See Also</p>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {SEE_ALSO.map((link, i) => (
          <span key={link.to} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {i > 0 && <span style={separatorStyle}>&gt;</span>}
            <Link
              to={link.to}
              style={seeAlsoLinkStyle}
              data-interactive
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-ink)'
                e.currentTarget.style.color = 'var(--color-prism-teal)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-ink-faint)'
                e.currentTarget.style.color = 'var(--color-ink)'
              }}
            >
              {link.label}
            </Link>
          </span>
        ))}
      </div>
    </div>
  )
}
