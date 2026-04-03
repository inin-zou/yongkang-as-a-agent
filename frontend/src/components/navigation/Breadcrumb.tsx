import { Link, useLocation } from 'react-router-dom'
import { FILE_TABS } from './sidebarConfig'

export default function Breadcrumb() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)
  // Expected: ['files', 'skill', 'resume'] or ['files', 'soul']

  if (pathSegments.length < 2 || pathSegments[0] !== 'files') return null

  const tabId = pathSegments[1]
  const tab = FILE_TABS.find((t) => t.id === tabId)
  if (!tab) return null

  const itemSegment = pathSegments[2] || null
  const item = itemSegment
    ? tab.sidebarItems.find((si) => si.routeSegment === itemSegment)
    : null

  return (
    <div className="breadcrumb">
      <span className="breadcrumb-segment">~/agent</span>
      <span className="breadcrumb-separator">/</span>
      {item ? (
        // When a sub-item is selected, tab name is a clickable link back to tab root
        <Link to={tab.basePath} className="breadcrumb-segment" data-interactive>
          {tab.label}
        </Link>
      ) : (
        // When no sub-item, tab name is the terminal node — use current styling, not a link
        <span className="breadcrumb-current">{tab.label}</span>
      )}
      {item && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{item.label}</span>
        </>
      )}
    </div>
  )
}
