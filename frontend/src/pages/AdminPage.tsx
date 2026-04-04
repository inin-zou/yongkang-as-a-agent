import { useState, type FormEvent } from 'react'
import '../styles/memory.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import {
  fetchBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  fetchFeedback,
  deleteFeedback,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/api'
import type { BlogPost, Feedback, AdminNotification } from '../types/index'
import '../styles/admin.css'

/* ─── Login form (GitHub OAuth) ─── */

function LoginForm() {
  const { loginWithGitHub } = useAuth()
  const [error, setError] = useState('')

  async function handleLogin() {
    try {
      await loginWithGitHub()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">Authentication required — admin access only</div>
      <h1 className="editor-title">Admin Login</h1>
      <div className="editor-content">
        {error && <div className="admin-error">{error}</div>}
        <p>Sign in with your GitHub account to access the admin panel.</p>
        <button className="guestbook-github-btn" onClick={handleLogin} style={{ marginTop: 'var(--space-md)' }}>
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </div>
  )
}

/* ─── Post editor form ─── */

interface PostEditorProps {
  initial?: BlogPost
  onSave: (data: { slug: string; title: string; content: string; preview: string }) => Promise<void>
  onCancel: () => void
}

function PostEditor({ initial, onSave, onCancel }: PostEditorProps) {
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [preview, setPreview] = useState(initial?.preview ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ slug, title, content, preview })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form className="admin-editor" onSubmit={handleSubmit}>
      {error && <div className="admin-error">{error}</div>}

      <div>
        <label htmlFor="post-slug" className="memory-feedback-label">Slug</label>
        <input
          id="post-slug"
          type="text"
          className="memory-feedback-input"
          placeholder="my-post-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="post-title" className="memory-feedback-label">Title</label>
        <input
          id="post-title"
          type="text"
          className="memory-feedback-input"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="post-preview" className="memory-feedback-label">Preview</label>
        <input
          id="post-preview"
          type="text"
          className="memory-feedback-input"
          placeholder="Short preview text..."
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="post-content" className="memory-feedback-label">Content</label>
        <textarea
          id="post-content"
          className="memory-feedback-input"
          placeholder="Write your post content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          required
        />
      </div>

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          {saving ? 'SAVING...' : initial ? 'UPDATE' : 'CREATE'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel}>
          CANCEL
        </button>
      </div>
    </form>
  )
}

/* ─── Posts management tab ─── */

function PostsTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchBlogPosts,
  })

  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate(data: { slug: string; title: string; content: string; preview: string }) {
    await createBlogPost(token, data)
    setCreating(false)
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  async function handleUpdate(data: { slug: string; title: string; content: string; preview: string }) {
    if (!editing) return
    await updateBlogPost(token, editing.id, data)
    setEditing(null)
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"?`)) return
    await deleteBlogPost(token, post.id)
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  if (creating) {
    return (
      <>
        <div className="editor-label">New Post</div>
        <PostEditor onSave={handleCreate} onCancel={() => setCreating(false)} />
      </>
    )
  }

  if (editing) {
    return (
      <>
        <div className="editor-label">Edit Post</div>
        <PostEditor initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      </>
    )
  }

  return (
    <>
      <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
        + NEW POST
      </button>

      <div className="editor-divider" />

      {isLoading && <p className="admin-empty">Loading posts...</p>}

      {!isLoading && (!posts || posts.length === 0) && (
        <p className="admin-empty">No posts yet.</p>
      )}

      {posts?.map((post) => (
        <div key={post.id} className="admin-post-item">
          <div className="admin-post-info">
            <div className="admin-post-title">{post.title}</div>
            <div className="admin-post-slug">/{post.slug}</div>
          </div>
          <div className="admin-actions">
            <button className="admin-btn" onClick={() => setEditing(post)}>EDIT</button>
            <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(post)}>DELETE</button>
          </div>
        </div>
      ))}
    </>
  )
}

/* ─── Feedback viewer tab ─── */

function FeedbackTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: () => fetchFeedback(token),
    enabled: !!token,
  })

  async function handleDelete(item: Feedback) {
    if (!confirm('Delete this feedback?')) return
    await deleteFeedback(token, item.id)
    queryClient.invalidateQueries({ queryKey: ['admin-feedback'] })
  }

  if (isLoading) return <p className="admin-empty">Loading feedback...</p>

  if (!feedback || feedback.length === 0) {
    return <p className="admin-empty">No feedback yet.</p>
  }

  return (
    <>
      {feedback.map((item) => (
        <div key={item.id} className="admin-feedback-item">
          <div className="admin-feedback-header">
            <span className="admin-feedback-name">{item.name}</span>
            <span className="admin-feedback-date">{item.createdAt?.split('T')[0]}</span>
          </div>
          <div className="admin-feedback-message">{item.message}</div>
          <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(item)}>
            DELETE
          </button>
        </div>
      ))}
    </>
  )
}

/* ─── Notification type icon ─── */

function NotificationIcon({ type }: { type: string }) {
  if (type === 'like') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    )
  }
  if (type === 'comment') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/* ─── Notifications tab ─── */

function NotificationsTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => fetchNotifications(token),
    enabled: !!token,
  })

  async function handleMarkRead(item: AdminNotification) {
    if (item.isRead) return
    await markNotificationRead(token, item.id)
    queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
    queryClient.invalidateQueries({ queryKey: ['admin-unread'] })
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(token)
    queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
    queryClient.invalidateQueries({ queryKey: ['admin-unread'] })
  }

  if (isLoading) return <p className="admin-empty">Loading notifications...</p>

  if (!notifications || notifications.length === 0) {
    return <p className="admin-empty">No notifications yet.</p>
  }

  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <>
      {hasUnread && (
        <button className="admin-btn admin-btn-primary" onClick={handleMarkAllRead} style={{ marginBottom: 'var(--space-md)' }}>
          MARK ALL READ
        </button>
      )}

      {notifications.map((item) => (
        <div
          key={item.id}
          className={`admin-notification-item ${!item.isRead ? 'admin-notification-unread' : ''}`}
          onClick={() => handleMarkRead(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleMarkRead(item) }}
        >
          <div className="admin-notification-icon">
            <NotificationIcon type={item.type} />
          </div>
          <div className="admin-notification-body">
            <span className="admin-notification-message">{item.message}</span>
            <span className="admin-notification-time">{formatTimeAgo(item.createdAt)}</span>
          </div>
        </div>
      ))}
    </>
  )
}

/* ─── Admin dashboard ─── */

function AdminDashboard() {
  const { logout, user, githubUsername } = useAuth()
  const [activeTab, setActiveTab] = useState<'posts' | 'feedback' | 'notifications'>('posts')

  return (
    <div className="editor-page">
      <div className="editor-meta">Signed in as @{githubUsername || user?.email}</div>
      <h1 className="editor-title">Admin Panel</h1>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'posts' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`admin-tab ${activeTab === 'feedback' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback
          </button>
          <button
            className={`admin-tab ${activeTab === 'notifications' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
        </div>
        <button className="admin-btn admin-btn-danger" onClick={logout}>
          SIGN OUT
        </button>
      </div>

      <div className="editor-divider" />

      {activeTab === 'posts' && <PostsTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
    </div>
  )
}

/* ─── Main admin page ─── */

export default function AdminPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading...
        </p>
      </div>
    )
  }

  return user ? <AdminDashboard /> : <LoginForm />
}
