import type { CSSProperties } from 'react'

interface SocialEntry {
  label: string
  value: string
  href: string
  external: boolean
}

const SOCIAL_DATA: SocialEntry[] = [
  {
    label: 'EMAIL',
    value: 'yongkang.zou1999@gmail.com',
    href: 'mailto:yongkang.zou1999@gmail.com',
    external: false,
  },
  {
    label: 'GITHUB',
    value: 'inin-zou',
    href: 'https://github.com/inin-zou',
    external: true,
  },
  {
    label: 'LINKEDIN',
    value: 'yongkang-zou',
    href: 'https://linkedin.com/in/yongkang-zou',
    external: true,
  },
]

const headerStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--color-ink-muted)',
  marginBottom: 'var(--space-md)',
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '90px 16px 1fr',
  gap: '12px 0',
  alignItems: 'baseline',
}

const labelCellStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-ink-muted)',
}

const separatorStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'var(--color-ink-faint)',
}

const linkStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: 'var(--color-ink)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--color-ink-faint)',
  paddingBottom: 2,
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, color 0.15s ease',
}

export default function SocialLinks() {
  return (
    <section>
      <h2 style={headerStyle}>Elsewhere</h2>
      <div style={gridStyle}>
        {SOCIAL_DATA.map((entry) => (
          <SocialRow key={entry.label} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function SocialRow({ entry }: { entry: SocialEntry }) {
  return (
    <>
      <span style={labelCellStyle}>{entry.label}</span>
      <span style={separatorStyle}>&gt;</span>
      <a
        href={entry.href}
        style={linkStyle}
        data-interactive
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-ink)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-ink-faint)'
        }}
        {...(entry.external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {entry.value}
      </a>
    </>
  )
}
