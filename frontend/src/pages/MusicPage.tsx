import { useParams } from 'react-router-dom'

export default function MusicPage() {
  const { item } = useParams<{ item?: string }>()

  return (
    <>
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '0.85rem',
        color: 'var(--color-ink-muted)',
        marginBottom: 'var(--space-lg)',
      }}>
        {item ? item.replace(/-/g, ' ').toUpperCase() : 'MUSIC'}
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        {item
          ? 'Track player and details will appear here.'
          : 'The artist side — inhibitor. Music player, bio, and platform links.'}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 8 ]
      </p>
    </>
  )
}
