import { queryKeys } from '../../../lib/queryKeys'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, fetchBlogPosts } from '../../../lib/api'
import type { AdminNotification } from '../../../types/index'

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

export default function NotificationsTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const token = session?.access_token ?? ''

  const { data: notifications, isLoading } = useQuery({
    queryKey: queryKeys.adminNotifications(),
    queryFn: () => fetchNotifications(token),
    enabled: !!token,
  })

  const { data: posts } = useQuery({
    queryKey: queryKeys.posts(),
    queryFn: fetchBlogPosts,
  })

  async function handleClickNotification(item: AdminNotification) {
    if (!item.isRead) {
      await markNotificationRead(token, item.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUnread() })
    }
    // Navigate to the post if postId exists
    if (item.postId && posts) {
      const post = posts.find((p) => p.id === item.postId)
      if (post) {
        navigate(`/files/memory/${post.category}/${post.slug}`)
        return
      }
    }
    // Guestbook notifications → go to guestbook
    if (item.type === 'guestbook') {
      navigate('/files/memory/guestbook')
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(token)
    queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications() })
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUnread() })
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
          onClick={() => handleClickNotification(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClickNotification(item) }}
          style={{ cursor: item.postId || item.type === 'guestbook' ? 'pointer' : 'default' }}
        >
          <div className="admin-notification-icon">
            <NotificationIcon type={item.type} />
          </div>
          <div className="admin-notification-body">
            <span className="admin-notification-message">{item.message}</span>
            {item.postId && posts && (() => {
              const post = posts.find(p => p.id === item.postId)
              return post ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-prism-teal)', display: 'block', marginTop: 2 }}>on "{post.title}"</span> : null
            })()}
            <span className="admin-notification-time">{formatTimeAgo(item.createdAt)}</span>
          </div>
        </div>
      ))}
    </>
  )
}
