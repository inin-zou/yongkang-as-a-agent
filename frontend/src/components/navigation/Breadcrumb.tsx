import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FILE_TABS } from './sidebarConfig'
import { fetchViews } from '../../lib/api'

function ViewCounter() {
  const { data } = useQuery({
    queryKey: ['views'],
    queryFn: fetchViews,
    staleTime: 60000, // don't refetch for 1 min
  })

  if (!data) return null

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.6rem',
      color: 'var(--color-ink-faint)',
      letterSpacing: '0.05em',
      opacity: 0.7,
    }}>
      {data.views.toLocaleString()} views
    </span>
  )
}

export default function Breadcrumb() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  if (pathSegments.length < 2 || pathSegments[0] !== 'files') return null

  const tabId = pathSegments[1]
  const tab = FILE_TABS.find((t) => t.id === tabId)
  if (!tab) return null

  const itemSegment = pathSegments[2] || null
  const item = itemSegment
    ? tab.sidebarItems.find((si) => si.routeSegment === itemSegment)
    : null

  return (
    <div className="breadcrumb" style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="breadcrumb-segment">~/agent</span>
        <span className="breadcrumb-separator">/</span>
        {item ? (
          <Link to={tab.basePath} className="breadcrumb-segment" data-interactive>
            {tab.label}
          </Link>
        ) : (
          <span className="breadcrumb-current">{tab.label}</span>
        )}
        {item && (
          <>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{item.label}</span>
          </>
        )}
      </div>
      <ViewCounter />
    </div>
  )
}
