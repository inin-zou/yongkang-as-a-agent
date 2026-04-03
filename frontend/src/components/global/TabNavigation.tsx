import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'About', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Contact', to: '/contact' },
]

export default function TabNavigation() {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        paddingLeft: 8,
        position: 'relative',
        zIndex: 50,
      }}
    >
      {tabs.map((tab, index) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 36,
            padding: '0 24px',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            textDecoration: 'none',
            clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0% 100%)',
            borderRadius: 'var(--radius-none)',
            marginRight: -12,
            cursor: 'none',
            transition: 'transform 0.15s ease, background 0.15s ease',
            ...(isActive
              ? {
                  zIndex: 3,
                  background: 'var(--color-surface-0)',
                  color: 'var(--color-ink)',
                  fontWeight: 600,
                }
              : {
                  zIndex: 2 - index,
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-ink-muted)',
                  fontWeight: 400,
                }),
          })}
          data-interactive
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
