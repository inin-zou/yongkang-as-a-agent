import { useState } from 'react'
import { useParams } from 'react-router-dom'
import '../styles/memory.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import AsciiTitle from '../components/global/AsciiTitle'
import {
  fetchFeedback,
  deleteFeedback,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/api'
import type { Feedback, AdminNotification } from '../types/index'
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

/* ─── Main admin page ─── */

export default function AdminPage() {
  const { user, loading } = useAuth()
  const { item } = useParams<{ item?: string }>()

  if (loading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const sectionMap: Record<string, { label: string; ascii: string }> = {
    '': { label: 'Feedback', ascii: 'feedback' },
    feedback: { label: 'Feedback', ascii: 'feedback' },
    notifications: { label: 'Notifications', ascii: 'notifications' },
  }

  const section = item || ''
  const { label, ascii } = sectionMap[section] ?? sectionMap['']

  const content = (() => {
    switch (section) {
      case 'notifications': return <NotificationsTab />
      case '':
      case 'feedback':
      default:
        return <FeedbackTab />
    }
  })()

  return (
    <div className="editor-page">
      <div className="editor-meta">Admin Panel — {label}</div>
      <AsciiTitle name={ascii} />
      <div className="editor-content">
        {content}
      </div>
    </div>
  )
}
