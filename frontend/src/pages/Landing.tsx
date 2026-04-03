import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - var(--ruler-x-height))',
        textAlign: 'center',
        gap: 'var(--space-lg)',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '4rem',
          fontWeight: 300,
          color: 'var(--color-ink)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        YONGKANG ZOU
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--color-ink-muted)',
          margin: 0,
          maxWidth: '500px',
        }}
      >
        Creative Technologist. 9x Hackathon Winner. Ships in 20 hours.
      </p>
      <button
        onClick={() => navigate('/about')}
        style={{
          padding: '1rem 2.5rem',
          background: 'transparent',
          border: '1px solid var(--color-ink)',
          color: 'var(--color-ink)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderRadius: 'var(--radius-md)',
          cursor: 'none',
          fontSize: '0.85rem',
          transition: 'background 0.2s ease, color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-ink)'
          e.currentTarget.style.color = 'var(--color-void)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-ink)'
        }}
        data-interactive
      >
        Enter
      </button>
    </div>
  )
}
