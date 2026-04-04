import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchBlogPost,
  fetchGuestbook,
  createGuestbookEntry,
  fetchPostStats,
  fetchPostComments,
  togglePostLike,
  createPostComment,
} from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import type { GuestbookEntry, PostComment } from '../types/index'
import '../styles/memory.css'

/* ─── Heart SVG icons ─── */

function HeartOutline() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function HeartFilled() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

/* ─── Comment item (reuses guestbook patterns) ─── */

function CommentItem({ comment }: { comment: PostComment }) {
  const timeAgo = formatTimeAgo(comment.createdAt)

  return (
    <div className="guestbook-entry">
      <div className="guestbook-header">
        <a
          href={comment.githubProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="guestbook-author"
        >
          <img
            src={comment.githubAvatarUrl}
            alt={comment.githubUsername}
            className="guestbook-avatar"
          />
          <span className="guestbook-username">@{comment.githubUsername}</span>
        </a>
        <span className="guestbook-time">{timeAgo}</span>
      </div>
      <p className="guestbook-message">{comment.message}</p>
    </div>
  )
}

/* ─── Post interactions (likes + comments) ─── */

function PostInteractions({ slug }: { slug: string }) {
  const { user, loginWithGitHub, githubUsername, githubAvatar, githubProfileUrl } = useAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liking, setLiking] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['post-stats', slug, githubUsername],
    queryFn: () => fetchPostStats(slug, githubUsername || undefined),
  })

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['post-comments', slug],
    queryFn: () => fetchPostComments(slug),
  })

  async function handleLike() {
    if (!user) {
      loginWithGitHub()
      return
    }
    if (liking) return
    setLiking(true)
    try {
      await togglePostLike(slug, { githubUsername })
      queryClient.invalidateQueries({ queryKey: ['post-stats', slug] })
    } catch {
      // silently fail
    } finally {
      setLiking(false)
    }
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault()
    if (!message.trim() || !githubUsername) return
    setSubmitting(true)
    try {
      await createPostComment(slug, {
        githubUsername,
        githubAvatarUrl: githubAvatar,
        githubProfileUrl,
        message: message.trim(),
      })
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['post-comments', slug] })
      queryClient.invalidateQueries({ queryKey: ['post-stats', slug] })
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const liked = stats?.userLiked ?? false
  const likeCount = stats?.likeCount ?? 0
  const commentCount = stats?.commentCount ?? 0

  return (
    <div className="post-interactions">
      {/* Like + stats row */}
      <div className="post-like-row">
        <button
          className={`post-like-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={liking}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          {liked ? <HeartFilled /> : <HeartOutline />}
        </button>
        <span className="post-like-count">{likeCount}</span>
        <span className="post-stat-separator">|</span>
        <span className="post-like-count">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="editor-divider" />

      {/* Comment form or sign-in prompt */}
      {user ? (
        <form className="post-comment-form" onSubmit={handleComment}>
          <div className="guestbook-form-header">
            <img src={githubAvatar} alt={githubUsername} className="guestbook-avatar" />
            <span className="guestbook-username">@{githubUsername}</span>
          </div>
          <textarea
            className="memory-feedback-input"
            placeholder="Leave a comment..."
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
            {submitting ? 'POSTING...' : 'COMMENT'}
          </button>
        </form>
      ) : (
        <button className="guestbook-github-btn" onClick={loginWithGitHub}>
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Sign in with GitHub to comment
        </button>
      )}

      {/* Comments list */}
      {commentsLoading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)', marginTop: 'var(--space-md)' }}>
          Loading comments...
        </p>
      )}

      {!commentsLoading && comments && comments.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Blog post view ─── */

function BlogPostView({ slug }: { slug: string }) {
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
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Post not found.
        </p>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">{post.publishedAt?.split('T')[0]}</div>
      <h1 className="editor-title">{post.title}</h1>
      <div className="editor-content">
        {post.content.split('\n').map((paragraph, i) =>
          paragraph.trim() ? <p key={i}>{paragraph}</p> : null
        )}
      </div>
      <PostInteractions slug={slug} />
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
      <h1 className="editor-title">Guestbook</h1>
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

/* ─── Default prompt ─── */

function MemoryPrompt() {
  return (
    <div className="memory-prompt">
      <div className="memory-prompt-icon">&gt;_</div>
      <p className="memory-prompt-text">
        Select a memory entry from the sidebar to read, or leave a note.
      </p>
      <p className="memory-prompt-hint">MEMORY.md</p>
    </div>
  )
}

/* ─── Main page ─── */

export default function MemoryPage() {
  const { item } = useParams<{ item?: string }>()

  if (!item) return <MemoryPrompt />

  if (item === 'feedback') return <GuestbookView />

  return <BlogPostView slug={item} />
}
