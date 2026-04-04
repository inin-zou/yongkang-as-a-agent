import { useMemo } from 'react'
import { Outlet, useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import TabNavigation from './TabNavigation'
import AuthButton from './AuthButton'
import Sidebar from '../navigation/Sidebar'
import Breadcrumb from '../navigation/Breadcrumb'
import { FILE_TABS, type TabConfig, type SidebarItem } from '../navigation/sidebarConfig'
import { fetchBlogPosts } from '../../lib/api'

export default function FileSystemLayout() {
  const { tab } = useParams<{ tab: string }>()
  const activeTab = FILE_TABS.find((t) => t.id === tab)

  // Fetch blog posts when memory tab is active
  const isMemory = activeTab?.id === 'memory'
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchBlogPosts,
    enabled: isMemory,
  })

  // Build the effective tab config — for memory, override sidebar items with live posts
  const effectiveTab: TabConfig | undefined = useMemo(() => {
    if (!activeTab) return undefined
    if (!isMemory) return activeTab

    const dynamicItems: SidebarItem[] = (posts ?? []).map((post) => ({
      id: post.slug,
      label: post.title,
      date: post.publishedAt?.split('T')[0],
      preview: post.preview,
      routeSegment: post.slug,
    }))

    // Always append guestbook at the end
    dynamicItems.push({
      id: 'guestbook',
      label: 'GUESTBOOK',
      preview: 'Sign in with GitHub to leave a note',
      routeSegment: 'feedback',
    })

    return { ...activeTab, sidebarItems: dynamicItems }
  }, [activeTab, isMemory, posts])

  if (!effectiveTab) {
    return <Navigate to="/files/soul" replace />
  }

  const hasSidebar = effectiveTab.sidebarItems.length > 0

  return (
    <div className="app-window-wrapper">
      <div className="app-window">
        {/* Tabs + auth button sit on top of the window */}
        <div className="tab-bar">
          <TabNavigation />
          <AuthButton />
        </div>

        {/* Window body: sidebar + editor */}
        <div className={`app-body ${hasSidebar ? '' : 'no-sidebar'}`}>
          {hasSidebar && <Sidebar tab={effectiveTab} />}
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
