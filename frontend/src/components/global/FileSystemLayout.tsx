import { Outlet, useParams, Navigate } from 'react-router-dom'
import TabNavigation from './TabNavigation'
import Sidebar from '../navigation/Sidebar'
import Breadcrumb from '../navigation/Breadcrumb'
import { FILE_TABS } from '../navigation/sidebarConfig'

export default function FileSystemLayout() {
  const { tab } = useParams<{ tab: string }>()
  const activeTab = FILE_TABS.find((t) => t.id === tab)

  // If no valid tab, redirect to SOUL.md (first tab)
  if (!activeTab) {
    return <Navigate to="/files/soul" replace />
  }

  const hasSidebar = activeTab.sidebarItems.length > 0

  return (
    <>
      <TabNavigation />
      <div className={`fs-layout ${hasSidebar ? '' : 'no-sidebar'}`}>
        {hasSidebar && <Sidebar tab={activeTab} />}
        <div className="fs-main">
          <Breadcrumb />
          <div className="fs-main-inner">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  )
}
