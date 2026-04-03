import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProjects } from '../lib/api'

const CATEGORIES = [
  { label: 'All', value: null },
  { label: 'Favorite', value: '__favorite__' },
  { label: 'Hackathon', value: 'hackathon' },
  { label: 'Industry', value: 'industry' },
  { label: 'Academic', value: 'academic' },
  { label: 'Side', value: 'side' },
] as const

export default function Projects() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
  })

  const filtered = useMemo(() => {
    if (!projects) return []
    let result = [...projects]

    if (activeFilter === '__favorite__') {
      result = result.filter((p) => p.isFavorite)
    } else if (activeFilter) {
      result = result.filter((p) => p.category === activeFilter)
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return result
  }, [projects, activeFilter])

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-lg)', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-lg)', maxWidth: '900px' }}>
      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 'var(--space-lg)',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeFilter === cat.value
          return (
            <button
              key={cat.label}
              onClick={() => setActiveFilter(cat.value)}
              style={{
                padding: '8px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: 'var(--radius-lg)',
                cursor: 'none',
                transition: 'all 0.15s ease',
                ...(isActive
                  ? {
                      background: 'var(--color-ink)',
                      color: 'var(--color-void)',
                      border: '1px solid var(--color-ink)',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--color-ink)',
                      border: '1px solid var(--color-ink-faint)',
                    }),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--color-ink)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--color-ink-faint)'
                }
              }}
              data-interactive
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Project cards */}
      {filtered.map((project) => (
        <div
          key={project.slug}
          style={{
            background: 'var(--color-surface-0)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
            borderRadius: 'var(--radius-none)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-xs)',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem' }}>{project.title}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {project.date}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  border: '1px solid var(--color-ink-faint)',
                  borderRadius: 'var(--radius-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--color-ink-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {project.category}
              </span>
            </div>
          </div>

          {/* Result */}
          {project.result && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--color-win)',
                marginBottom: 'var(--space-xs)',
                fontWeight: 600,
              }}
            >
              {project.result}
            </div>
          )}

          {/* Description */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              margin: '0 0 var(--space-sm) 0',
            }}
          >
            {project.description}
          </p>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-sm)' }}>
              {project.tags.map((tag, j) => (
                <span
                  key={j}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--color-ink-faint)',
                    borderRadius: 'var(--radius-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-ink)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Links */}
          {(project.codeUrl || project.demoUrl) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {project.codeUrl && (
                <a
                  href={project.codeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 16px',
                    background: 'transparent',
                    border: '1px solid var(--color-ink)',
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    cursor: 'none',
                    transition: 'all 0.15s ease',
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
                  Code
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 16px',
                    background: 'transparent',
                    border: '1px solid var(--color-ink)',
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    cursor: 'none',
                    transition: 'all 0.15s ease',
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
                  Demo
                </a>
              )}
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--color-ink-muted)',
            padding: 'var(--space-xl)',
            textAlign: 'center',
          }}
        >
          No projects found for this filter.
        </div>
      )}
    </div>
  )
}
