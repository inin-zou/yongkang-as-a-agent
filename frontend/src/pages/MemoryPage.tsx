import { useParams } from 'react-router-dom'

export default function MemoryPage() {
  const { item } = useParams<{ item?: string }>()

  if (item === 'feedback') {
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
          LEAVE A NOTE
        </h2>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1rem',
          color: 'var(--color-ink)',
        }}>
          Visitor feedback form — share your thoughts.
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-ink-faint)',
          marginTop: 'var(--space-lg)',
        }}>
          [ Full content coming in Phase 7 ]
        </p>
      </>
    )
  }

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
        {item ? item.replace(/-/g, ' ').toUpperCase() : 'MEMORY LOG'}
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        {item
          ? 'Blog post content will appear here.'
          : 'The agent\'s memory log. Select a post from the sidebar.'}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 7 ]
      </p>
    </>
  )
}
