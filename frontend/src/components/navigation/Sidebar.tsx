import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { TabConfig } from './sidebarConfig'
import type { BlogPost } from '../../types/index'

interface SidebarProps {
  tab: TabConfig
  memoryPosts?: BlogPost[]
}

const MEMORY_CATEGORIES = [
  { id: 'hackathon', label: 'HACKATHON JOURNEY', preview: 'Competition stories & lessons' },
  { id: 'technical', label: 'TECHNICAL BLOG', preview: 'Engineering deep-dives & notes' },
  { id: 'research', label: 'RESEARCH READING', preview: 'Papers & tech trends' },
] as const

function MemorySidebar({ posts }: { posts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const navigate = useNavigate()
  const { item } = useParams()
  const location = useLocation()

  // Sync active category with URL
  useEffect(() => {
    const categoryIds: string[] = MEMORY_CATEGORIES.map(c => c.id)
    if (item && categoryIds.includes(item)) {
      setActiveCategory(item)
    } else if (item !== 'feedback') {
      // If we're at /files/memory or an unknown item, reset to category view
      setActiveCategory(null)
    }
  }, [item])

  const filteredPosts = posts.filter(p => p.category === activeCategory)

  return (
    <aside className="sidebar fs-sidebar">
      <div className="sidebar-header">MEMORY.MD</div>
      <div className="sidebar-slider-container">
        <div
          className="sidebar-slider"
          style={{ transform: activeCategory ? 'translateX(-50%)' : 'translateX(0)' }}
        >
          {/* Panel 1: Categories */}
          <nav className="sidebar-panel">
            {MEMORY_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`note-item sidebar-category-btn ${item === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.id)
                  navigate(`/files/memory/${cat.id}`)
                }}
                data-interactive
              >
                <div className="note-item-title">{cat.label}</div>
                <div className="note-item-preview">{cat.preview}</div>
              </button>
            ))}
            {/* Guestbook always at bottom */}
            <NavLink
              to="/files/memory/feedback"
              className={`note-item ${item === 'feedback' ? 'active' : ''}`}
              data-interactive
            >
              <div className="note-item-title">GUESTBOOK</div>
              <div className="note-item-preview">Sign in with GitHub to leave a note</div>
            </NavLink>
          </nav>

          {/* Panel 2: Posts in category */}
          <nav className="sidebar-panel">
            <button
              className="sidebar-back"
              onClick={() => {
                setActiveCategory(null)
                navigate('/files/memory')
              }}
            >
              <span className="sidebar-back-arrow">&larr;</span>
              {MEMORY_CATEGORIES.find(c => c.id === activeCategory)?.label ?? 'BACK'}
            </button>
            {filteredPosts.map(post => {
              const postPath = `/files/memory/${activeCategory}/${post.slug}`
              const isActive = location.pathname === postPath
              return (
                <NavLink
                  key={post.slug}
                  to={postPath}
                  className={`note-item ${isActive ? 'active' : ''}`}
                  data-interactive
                >
                  {post.publishedAt && (
                    <div className="note-item-date">{post.publishedAt.split('T')[0]}</div>
                  )}
                  <div className="note-item-title">{post.title}</div>
                  {post.preview && <div className="note-item-preview">{post.preview}</div>}
                </NavLink>
              )
            })}
            {filteredPosts.length === 0 && (
              <div className="sidebar-empty">No entries yet</div>
            )}
          </nav>
        </div>
      </div>
    </aside>
  )
}

export default function Sidebar({ tab, memoryPosts }: SidebarProps) {
  const location = useLocation()

  // For memory tab, use the two-level drill-down sidebar
  if (tab.id === 'memory' && memoryPosts) {
    return <MemorySidebar posts={memoryPosts} />
  }

  if (tab.sidebarItems.length === 0) return null

  return (
    <aside className="sidebar fs-sidebar">
      <div className="sidebar-header">
        {tab.label}
      </div>
      <nav style={{ flex: 1, overflowY: 'auto' }}>
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
