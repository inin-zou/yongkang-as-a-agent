import { Link, useLocation } from 'react-router-dom'
import type { TabConfig } from './sidebarConfig'

interface SidebarProps {
  tab: TabConfig
}

export default function Sidebar({ tab }: SidebarProps) {
  const location = useLocation()

  if (tab.sidebarItems.length === 0) return null

  return (
    <aside className="sidebar fs-sidebar">
      <div className="sidebar-header">
        {tab.label}
      </div>
      <nav>
        {tab.sidebarItems.map((item) => {
          const fullPath = item.routeSegment
            ? `${tab.basePath}/${item.routeSegment}`
            : tab.basePath
          const isActive = location.pathname === fullPath

          return (
            <Link
              key={item.id}
              to={fullPath}
              className={`note-item ${isActive ? 'active' : ''}`}
              data-interactive
            >
              {item.date && <div className="note-item-date">{item.date}</div>}
              <div className="note-item-title">{item.label}</div>
              {item.preview && <div className="note-item-preview">{item.preview}</div>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
