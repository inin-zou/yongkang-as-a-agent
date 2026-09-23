import { useParams } from 'react-router-dom'
import '../styles/memory.css'
import { useAuth } from '../lib/auth'
import '../styles/admin.css'
import LoginForm from '../components/admin/LoginForm'
import PostsManager from '../components/admin/tabs/PostsManager'
import MusicManager from '../components/admin/tabs/MusicManager'
import FeedbackTab from '../components/admin/tabs/FeedbackTab'
import NotificationsTab from '../components/admin/tabs/NotificationsTab'

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

  const sectionMap: Record<string, { label: string }> = {
    '': { label: 'Posts' },
    posts: { label: 'Posts' },
    music: { label: 'Music' },
    feedback: { label: 'Feedback' },
    notifications: { label: 'Notifications' },
  }

  const section = item || ''
  const { label } = sectionMap[section] ?? sectionMap['']

  const content = (() => {
    switch (section) {
      case 'notifications': return <NotificationsTab />
      case 'music': return <MusicManager />
      case 'feedback': return <FeedbackTab />
      case '':
      case 'posts':
      default:
        return <PostsManager />
    }
  })()

  return (
    <div className="editor-page">
      <div className="editor-meta">Admin Panel — {label}</div>
      <h1>{label}</h1>
      <div className="editor-content">
        {content}
      </div>
    </div>
  )
}
