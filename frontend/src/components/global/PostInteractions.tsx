import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPostStats,
  fetchPostComments,
  togglePostLike,
  createPostComment,
} from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'
import type { PostComment } from '../../types/index'

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

function CommentItem({ comment }: { comment: PostComment }) {
  return (
    <div className="guestbook-entry">
      <div className="guestbook-header">
        <a href={comment.githubProfileUrl} target="_blank" rel="noopener noreferrer" className="guestbook-author">
          <img src={comment.githubAvatarUrl} alt={comment.githubUsername} className="guestbook-avatar" />
          <span className="guestbook-username">@{comment.githubUsername}</span>
        </a>
        <span className="guestbook-time">{formatTimeAgo(comment.createdAt)}</span>
      </div>
      <p className="guestbook-message">{comment.message}</p>
    </div>
  )
}

export default function PostInteractions({ slug }: { slug: string }) {
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
    if (!user) { loginWithGitHub(); return }
    if (liking) return
    setLiking(true)
    try {
      await togglePostLike(slug, { githubUsername })
      queryClient.invalidateQueries({ queryKey: ['post-stats', slug] })
    } catch { /* */ } finally { setLiking(false) }
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault()
    if (!message.trim() || !githubUsername) return
    setSubmitting(true)
    try {
      await createPostComment(slug, { githubUsername, githubAvatarUrl: githubAvatar, githubProfileUrl, message: message.trim() })
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['post-comments', slug] })
      queryClient.invalidateQueries({ queryKey: ['post-stats', slug] })
    } catch { /* */ } finally { setSubmitting(false) }
  }

  const liked = stats?.userLiked ?? false
  const likeCount = stats?.likeCount ?? 0
  const commentCount = stats?.commentCount ?? 0

  return (
    <div className="post-interactions">
      <div className="post-like-row">
        <button className={`post-like-btn ${liked ? 'liked' : ''}`} onClick={handleLike} disabled={liking} aria-label={liked ? 'Unlike' : 'Like'}>
          {liked ? <HeartFilled /> : <HeartOutline />}
        </button>
        <span className="post-like-count">{likeCount}</span>
        <span className="post-stat-separator">|</span>
        <span className="post-like-count">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="editor-divider" />

      {user ? (
        <form className="post-comment-form" onSubmit={handleComment}>
          <div className="guestbook-form-header">
            <img src={githubAvatar} alt={githubUsername} className="guestbook-avatar" />
            <span className="guestbook-username">@{githubUsername}</span>
          </div>
          <textarea className="memory-feedback-input" placeholder="Leave a comment..." value={message} onChange={(e) => setMessage(e.target.value)} rows={3} required />
          <button type="submit" className="memory-feedback-submit" disabled={submitting}>
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
