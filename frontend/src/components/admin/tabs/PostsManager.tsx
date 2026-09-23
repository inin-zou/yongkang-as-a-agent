import { queryKeys } from '../../../lib/queryKeys'
import PostArchiveToggle from '../PostArchiveToggle'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { fetchBlogPosts, deleteBlogPost } from '../../../lib/api'
import type { BlogPost } from '../../../types/index'
import DraftCreator from '../DraftCreator'

/* ─── Posts manager tab ─── */

export default function PostsManager() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)

  const { data: posts, isLoading } = useQuery({
    queryKey: queryKeys.adminPosts(),
    queryFn: fetchBlogPosts,
    enabled: !!token,
  })

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"?`)) return
    await deleteBlogPost(token, post.id)
    queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts() })
    queryClient.invalidateQueries({ queryKey: queryKeys.posts() })
  }

  function handleEdit(post: BlogPost) {
    setEditingPost(post)
    setMode('edit')
  }

  function handleDone() {
    setMode('list')
    setEditingPost(null)
  }

  if (mode === 'create') {
    return <DraftCreator onDone={handleDone} />
  }

  if (mode === 'edit' && editingPost) {
    return <DraftCreator onDone={handleDone} initial={editingPost} />
  }

  if (isLoading) return <p className="admin-empty">Loading posts...</p>

  return (
    <>
      <button
        className="admin-btn admin-bar-btn-add"
        onClick={() => setMode('create')}
        style={{ marginBottom: 'var(--space-md)' }}
      >
        + NEW POST
      </button>

      {!posts || posts.length === 0 ? (
        <p className="admin-empty">No posts yet. Create your first one.</p>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="admin-post-item">
            <div className="admin-post-info">
              <div className="admin-post-title">
                {post.title}
                {post.archived && <span className="post-archived-marker">archived</span>}
                {' '}
                <span className={`admin-category-badge admin-category-${post.category}`}>
                  {post.category}
                </span>
              </div>
              <div className="admin-post-slug">/{post.slug}</div>
            </div>
            <div className="admin-actions">
              <button className="admin-btn" onClick={() => handleEdit(post)}>
                EDIT
              </button>
              <PostArchiveToggle post={post} token={token} />
              <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(post)}>
                DELETE
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}
