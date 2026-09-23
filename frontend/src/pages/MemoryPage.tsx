import { useState, type FormEvent } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import '../styles/skill.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchBlogPost,
  fetchBlogPosts,
  fetchGuestbook,
  createGuestbookEntry,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAdminEdit } from '../hooks/useAdminEdit'
import AdminBar from '../components/admin/AdminBar'
import PostArchiveToggle from '../components/admin/PostArchiveToggle'
import PostEditor from '../components/admin/PostEditor'
import BlogPostContent from '../components/global/BlogPostContent'
import PostInteractions from '../components/global/PostInteractions'
import type { GuestbookEntry } from '../types/index'
import '../styles/memory.css'

const CATEGORIES = ['hackathon', 'technical', 'research'] as const

/* ─── Blog post view ─── */

function BlogPostView({ slug }: { slug: string }) {
  const { isAdmin, token } = useAdminEdit()
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchBlogPost(slug),
  })

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="editor-page">
        {isAdmin && (
          <>
            <AdminBar
              isEditing={isEditMode}
              onToggleEdit={() => { setIsEditMode(!isEditMode); setCreating(false) }}
              onAdd={isEditMode ? () => { setCreating(true) } : undefined}
            />
            {creating && (
              <PostEditor
                token={token}
                onSave={async (data) => {
                  await createBlogPost(token, data)
                  queryClient.invalidateQueries({ queryKey: ['posts'] })
                  setCreating(false)
                }}
                onCancel={() => setCreating(false)}
              />
            )}
          </>
        )}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Post not found.
        </p>
      </div>
    )
  }

  return (
    <div className="editor-page">
      {isAdmin && (
        <AdminBar
          isEditing={isEditMode}
          onToggleEdit={() => { setIsEditMode(!isEditMode); setEditing(false); setCreating(false) }}
          onAdd={isEditMode ? () => { setCreating(true); setEditing(false) } : undefined}
        />
      )}

      {creating && (
        <PostEditor
          token={token}
          onSave={async (data) => {
            await createBlogPost(token, data)
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            queryClient.invalidateQueries({ queryKey: ['post', slug] })
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {isEditMode && editing ? (
        <PostEditor
          token={token}
          initial={post}
          onSave={async (data) => {
            await updateBlogPost(token, post.id, data)
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            queryClient.invalidateQueries({ queryKey: ['post', slug] })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <h1 className="editor-title">{post.title}</h1>
          <div className="editor-meta">
            {post.archived && <><span className="post-archived-marker">archived</span>· </>}
            {post.category} · {post.publishedAt?.split('T')[0]}
            {post.updatedAt && post.updatedAt.split('T')[0] !== post.publishedAt?.split('T')[0] && (
              <span style={{ marginLeft: '8px', color: 'var(--color-ink-faint)' }}>
                (edited {post.updatedAt.split('T')[0]})
              </span>
            )}
          </div>
          {isEditMode && (
            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
              <button className="admin-btn" onClick={() => setEditing(true)}>EDIT</button>
              <PostArchiveToggle post={post} token={token} />
              <button
                className="admin-btn admin-btn-danger"
                onClick={async () => {
                  if (!confirm(`Delete "${post.title}"?`)) return
                  await deleteBlogPost(token, post.id)
                  queryClient.invalidateQueries({ queryKey: ['posts'] })
                }}
              >
                DELETE
              </button>
            </div>
          )}
          <BlogPostContent html={post.content} />
          <PostInteractions slug={slug} />
        </>
      )}
    </div>
  )
}

/* ─── Guestbook entry display ─── */

function GuestbookItem({ entry }: { entry: GuestbookEntry }) {
  const timeAgo = formatTimeAgo(entry.createdAt)

  return (
    <div className="guestbook-entry">
      <div className="guestbook-header">
        <a
          href={entry.githubProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="guestbook-author"
        >
          <img
            src={entry.githubAvatarUrl}
            alt={entry.githubUsername}
            className="guestbook-avatar"
          />
          <span className="guestbook-username">@{entry.githubUsername}</span>
        </a>
        <span className="guestbook-time">{timeAgo}</span>
      </div>
      <p className="guestbook-message">{entry.message}</p>
    </div>
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

/* ─── Guestbook (GitHub OAuth) ─── */

function GuestbookView() {
  const { user, loginWithGitHub, githubUsername, githubAvatar, githubProfileUrl } = useAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['guestbook'],
    queryFn: fetchGuestbook,
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim() || !githubUsername) return
    setSubmitting(true)
    try {
      await createGuestbookEntry({
        githubUsername,
        githubAvatarUrl: githubAvatar,
        githubProfileUrl: githubProfileUrl,
        message: message.trim(),
      })
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['guestbook'] })
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">Open channel — sign in with GitHub to leave a note</div>
      <h1>Guestbook</h1>
      <div className="editor-content">

        {/* Comment form or sign-in prompt */}
        {user ? (
          <form className="guestbook-form" onSubmit={handleSubmit}>
            <div className="guestbook-form-header">
              <img src={githubAvatar} alt={githubUsername} className="guestbook-avatar" />
              <span className="guestbook-username">@{githubUsername}</span>
            </div>
            <textarea
              className="memory-feedback-input"
              placeholder="Leave a note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required
            />
            <button
              type="submit"
              className="memory-feedback-submit"
              disabled={submitting}
            >
              {submitting ? 'POSTING...' : 'POST'}
            </button>
          </form>
        ) : (
          <button
            className="guestbook-github-btn"
            onClick={loginWithGitHub}
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Sign in with GitHub to leave a note
          </button>
        )}

        <div className="editor-divider" />

        {/* Entries */}
        {isLoading && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
            Loading...
          </p>
        )}

        {!isLoading && (!entries || entries.length === 0) && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
            No entries yet. Be the first to sign the guestbook.
          </p>
        )}

        {entries?.map((entry) => (
          <GuestbookItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

/* Writing index uses the same rows as the README. */
function MemoryLanding({ category }: { category?: string }) {
  const { data: posts, isLoading } = useQuery({ queryKey: ['posts'], queryFn: fetchBlogPosts })
  const categories = [...new Set(posts?.filter(post => !post.archived).map(post => post.category) ?? [])]
  const visible = (posts ?? []).filter(post => !post.archived && (!category || post.category === category))
    .slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const archived = (posts ?? []).filter(post => post.archived && (!category || post.category === category))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return <div className="editor-page">
    <h1>Writing</h1>
    <nav className="document-filters" aria-label="Writing categories">
      <NavLink end to="/files/memory">All</NavLink>
      {categories.map(value => <NavLink key={value} to={`/files/memory/${value}`}>{value}</NavLink>)}
    </nav>
    {isLoading && <p>Loading writing...</p>}
    {!isLoading && visible.length === 0 && <p>No entries yet.</p>}
    {visible.map(post => <article className="soul-post-row" key={post.id}>
      <div><h3><Link to={`/files/memory/${post.category}/${post.slug}`}>{post.title}</Link></h3><p className="soul-mono">{post.category}</p></div>
      <time className="soul-mono" dateTime={post.publishedAt}>{post.publishedAt?.split('T')[0]}</time>
    </article>)}
    {archived.length > 0 && <details className="dir-archive memory-archive">
      <summary className="soul-mono">ARCHIVE</summary>
      <ul>{archived.map(post => <li key={post.id}>
        <Link to={`/files/memory/${encodeURIComponent(post.category)}/${encodeURIComponent(post.slug)}`}>{post.title}</Link>
        <time className="soul-mono" dateTime={post.publishedAt}>{post.publishedAt?.split('T')[0]}</time>
      </li>)}</ul>
    </details>}
  </div>
}

export default function MemoryPage() {
  const { item, sub } = useParams<{ item?: string; sub?: string }>()
  const { data: posts, isLoading } = useQuery({ queryKey: ['posts'], queryFn: fetchBlogPosts, enabled: !!item && !sub && item !== 'guestbook' && item !== 'feedback' })
  if (!item) return <MemoryLanding />
  if (item === 'guestbook' || item === 'feedback') return <GuestbookView />
  if (sub) return <BlogPostView slug={sub} />
  if ((CATEGORIES as readonly string[]).includes(item) || posts?.some(post => post.category === item)) return <MemoryLanding category={item} />
  if (isLoading) return <div className="editor-page">Loading writing...</div>
  // Preserve legacy direct post URLs.
  return <BlogPostView slug={item} />
}
