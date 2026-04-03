import { useParams } from 'react-router-dom'

const SKILL_VIEWS: Record<string, { title: string; description: string }> = {
  '': { title: 'SKILLS', description: 'Arsenal overview — GSAP progressive skill animation' },
  resume: { title: 'RESUME', description: 'Experience timeline — every role, every skill assembled' },
  hackathons: { title: 'HACKATHONS', description: 'Interactive map + timeline animation' },
  certifications: { title: 'CERTIFICATIONS', description: 'Education + professional certifications' },
}

export default function SkillPage() {
  const { item } = useParams<{ item?: string }>()
  const view = SKILL_VIEWS[item || ''] || SKILL_VIEWS['']

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
        {view.title}
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        {view.description}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 5 ]
      </p>
    </>
  )
}
