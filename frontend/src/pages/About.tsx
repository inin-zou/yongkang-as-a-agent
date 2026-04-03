import { useQuery } from '@tanstack/react-query'
import { fetchExperience, fetchSkills } from '../lib/api'

export default function About() {
  const { data: experience, isLoading: expLoading } = useQuery({
    queryKey: ['experience'],
    queryFn: fetchExperience,
  })
  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  })

  if (expLoading || skillsLoading) {
    return (
      <div style={{ padding: 'var(--space-lg)', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-lg)', maxWidth: '900px' }}>
      {/* Experience Section */}
      <section style={{ marginBottom: 'var(--space-section)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.85rem',
            color: 'var(--color-ink-muted)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          Trajectory
        </h2>
        {experience?.map((exp, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface-0)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
              borderRadius: 'var(--radius-none)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ marginBottom: 'var(--space-xs)' }}>
              <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem' }}>{exp.role}</strong>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--color-ink-muted)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              {exp.company} &middot; {exp.location}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-ink-faint)',
                marginBottom: 'var(--space-sm)',
              }}
            >
              {exp.startDate} &mdash; {exp.endDate ?? 'Present'}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--color-ink)',
                margin: '0 0 var(--space-sm) 0',
              }}
            >
              {exp.skillAssembled}
            </p>
            {exp.highlights && exp.highlights.length > 0 && (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 'var(--space-md)',
                  listStyle: 'disc',
                }}
              >
                {exp.highlights.map((h, j) => (
                  <li
                    key={j}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.85rem',
                      lineHeight: 1.6,
                      color: 'var(--color-ink)',
                      marginBottom: 4,
                    }}
                  >
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {exp.note && (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--color-ink-muted)',
                  fontStyle: 'italic',
                  marginTop: 'var(--space-sm)',
                  marginBottom: 0,
                }}
              >
                {exp.note}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Skills Section */}
      <section>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.85rem',
            color: 'var(--color-ink-muted)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          Arsenal
        </h2>
        {skills?.map((domain, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface-0)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
              borderRadius: 'var(--radius-none)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem' }}>
                {domain.icon && <span style={{ marginRight: 8 }}>{domain.icon}</span>}
                {domain.title}
              </strong>
            </div>

            {/* Subcategories */}
            {domain.subcategories?.map((sub, j) => (
              <div key={j} style={{ marginBottom: 'var(--space-sm)' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-ink-muted)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {sub.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sub.skills.map((skill, k) => (
                    <span
                      key={k}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--color-ink-faint)',
                        borderRadius: 'var(--radius-subtle)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--color-ink)',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Flat skills (if no subcategories) */}
            {domain.skills && domain.skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-sm)' }}>
                {domain.skills.map((skill, k) => (
                  <span
                    key={k}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid var(--color-ink-faint)',
                      borderRadius: 'var(--radius-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Battle tested */}
            {domain.battleTested && domain.battleTested.length > 0 && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--color-ink-muted)',
                  marginTop: 'var(--space-xs)',
                }}
              >
                Battle-tested: {domain.battleTested.join(', ')}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
