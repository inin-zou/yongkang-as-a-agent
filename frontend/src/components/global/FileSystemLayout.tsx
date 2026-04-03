import { Outlet, useParams, Navigate } from 'react-router-dom'
import TabNavigation from './TabNavigation'
import Sidebar from '../navigation/Sidebar'
import Breadcrumb from '../navigation/Breadcrumb'
import { FILE_TABS } from '../navigation/sidebarConfig'

export default function FileSystemLayout() {
  const { tab } = useParams<{ tab: string }>()
  const activeTab = FILE_TABS.find((t) => t.id === tab)

  if (!activeTab) {
    return <Navigate to="/files/soul" replace />
  }

  const hasSidebar = activeTab.sidebarItems.length > 0

  return (
    <div className="app-window-wrapper">
      <div className="app-window">
        {/* Tabs sit on top of the window */}
        <TabNavigation />

        {/* Window body: sidebar + editor */}
        <div className={`app-body ${hasSidebar ? '' : 'no-sidebar'}`}>
          {hasSidebar && <Sidebar tab={activeTab} />}
          <div className="app-editor">
            <Breadcrumb />
            <div className="app-editor-content">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
