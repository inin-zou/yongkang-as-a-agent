export default function ContactPage() {
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
        Contact
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        Get in touch — email, GitHub, LinkedIn, and a contact form.
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 4 ]
      </p>
    </>
  )
}
