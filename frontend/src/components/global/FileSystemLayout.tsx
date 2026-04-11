import { useMemo, useState } from 'react'
import { Outlet, useParams, Navigate, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import TabNavigation from './TabNavigation'
import AuthButton from './AuthButton'
import Sidebar from '../navigation/Sidebar'
import Breadcrumb from '../navigation/Breadcrumb'
import { FILE_TABS, ADMIN_TAB, type TabConfig, type SidebarItem } from '../navigation/sidebarConfig'
import { fetchBlogPosts, fetchMusicTracks } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'
import MusicPlayerBar from './MusicPlayerBar'

function MobileSidebarWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`mobile-sidebar-wrapper ${open ? 'mobile-sidebar-wrapper--open' : ''}`}>
      <button className="mobile-sidebar-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <span className={`mobile-sidebar-chevron ${open ? 'mobile-sidebar-chevron--open' : ''}`}>&#9662;</span>
      </button>
      <div className="mobile-sidebar-content">
        {children}
      </div>
    </div>
  )
}

function AdminTabLink() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return null

  const isActive = location.pathname.startsWith(ADMIN_TAB.basePath)

  return (
    <NavLink
      to={ADMIN_TAB.basePath}
      className={`tab ${isActive ? 'tab-active' : 'tab-inactive'}`}
      data-interactive
    >
      {ADMIN_TAB.label}
    </NavLink>
  )
}

export default function FileSystemLayout() {
  const { tab } = useParams<{ tab: string }>()
  const activeTab = FILE_TABS.find((t) => t.id === tab) || (tab === 'admin' ? ADMIN_TAB : undefined)

  // Fetch blog posts when memory tab is active
  const isMemory = activeTab?.id === 'memory'
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchBlogPosts,
    enabled: isMemory,
  })

  // Fetch music tracks when music tab is active
  const isMusic = activeTab?.id === 'music'
  const { data: musicTracks } = useQuery({
    queryKey: ['music-tracks'],
    queryFn: fetchMusicTracks,
    enabled: isMusic,
  })

  // Build the effective tab config — for music, override sidebar items with live data
  // For memory, we pass raw posts to Sidebar for two-level drill-down
  const effectiveTab: TabConfig | undefined = useMemo(() => {
    if (!activeTab) return undefined

    if (isMusic && musicTracks) {
      const dynamicItems: SidebarItem[] = musicTracks.map((track) => ({
        id: track.slug,
        label: track.name,
        preview: `Cover · ${track.original}`,
        routeSegment: track.slug,
      }))
      return { ...activeTab, sidebarItems: dynamicItems }
    }

    if (isMemory) {
      // Memory sidebar uses two-level drill-down, so we just need to ensure
      // it renders (sidebarItems won't be used, but we need hasSidebar = true)
      return { ...activeTab, sidebarItems: [{ id: '_memory_placeholder', label: '', routeSegment: '' }] }
    }

    return activeTab
  }, [activeTab, isMemory, isMusic, musicTracks])

  if (!effectiveTab) {
    return <Navigate to="/files/soul" replace />
  }

  const hasSidebar = effectiveTab.sidebarItems.length > 0

  return (
    <div className="app-window-wrapper">
      <div className="app-window">
        {/* Tabs + admin link + auth button sit on top of the window */}
        <div className="tab-bar">
          <TabNavigation />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <AdminTabLink />
            <AuthButton />
          </div>
        </div>

        {/* Window body: sidebar + editor */}
        <div className={`app-body ${hasSidebar ? '' : 'no-sidebar'}`}>
          {hasSidebar && (
            <MobileSidebarWrapper label={effectiveTab.label}>
              <Sidebar tab={effectiveTab} memoryPosts={isMemory ? (posts ?? []) : undefined} />
            </MobileSidebarWrapper>
          )}
          <div className="app-editor">
            <Breadcrumb />
            <div className="app-editor-content">
              <Outlet />
            </div>
          </div>
        </div>

        {/* Persistent music player bar at bottom */}
        <MusicPlayerBar />
      </div>
    </div>
  )
}
