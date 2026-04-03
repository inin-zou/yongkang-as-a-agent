import { NavLink, useLocation } from 'react-router-dom'
import { FILE_TABS } from '../navigation/sidebarConfig'

export default function TabNavigation() {
  const location = useLocation()

  return (
    <nav className="tab-container">
      {FILE_TABS.map((tab, index) => {
        const isActive =
          location.pathname === tab.basePath ||
          location.pathname.startsWith(tab.basePath + '/')

        return (
          <NavLink
            key={tab.id}
            to={tab.basePath}
            aria-current={isActive ? 'page' : undefined}
            className={`tab ${isActive ? 'tab-active' : 'tab-inactive'}`}
            style={{ zIndex: isActive ? 3 : 2 - index }}
            data-interactive
          >
            {tab.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
