import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import '../styles/memory.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import AsciiTitle from '../components/global/AsciiTitle'
import { useBlogMediaUpload } from '../hooks/useBlogMediaUpload'
import MediaUploadBar from '../components/admin/MediaUploadBar'
import {
  fetchFeedback,
  deleteFeedback,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  generateDraft,
  refineDraft,
  fetchMusicTracks,
  createMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
} from '../lib/api'
import type { Feedback, AdminNotification, BlogPost, MusicTrack } from '../types/index'
import type { DraftResponse } from '../lib/api'
import { htmlToMarkdown, markdownToHtml } from '../lib/markdown'
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

/* ─── Draft Creator (AI-assisted blog draft) ─── */

function DraftCreator({ onDone, initial }: { onDone: () => void; initial?: BlogPost }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  // Step 1: Input rough idea
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'technical')
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt?.split('T')[0] ?? '')
  const [roughIdea, setRoughIdea] = useState(initial ? '' : '')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // Media uploads (shared hook)
  const { mediaUrls, uploading, status: uploadStatus, error: uploadError, handleUpload, removeUrl } = useBlogMediaUpload()
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null)
  const prevUrlCountRef = useRef(mediaUrls.length)

  // When a new URL is added in editor mode, insert media tag at cursor
  useEffect(() => {
    const prevCount = prevUrlCountRef.current
    prevUrlCountRef.current = mediaUrls.length
    if (mediaUrls.length > prevCount && draft && editorTextareaRef.current) {
      const newUrl = mediaUrls[mediaUrls.length - 1]
      const ta = editorTextareaRef.current
      const pos = ta.selectionStart ?? editContent.length
      const isVideo = newUrl.match(/\.(mp4|webm|mov)/i)
      const tag = isVideo
        ? `\n<video src="${newUrl}" controls style="max-width:100%;border-radius:6px;margin:8px 0"></video>\n`
        : `\n<img src="${newUrl}" alt="media" style="max-width:100%;border-radius:6px;margin:8px 0" />\n`
      const newContent = editContent.slice(0, pos) + tag + editContent.slice(pos)
      setEditContent(newContent)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrls.length])

  // Step 2: Review/edit generated draft
  const [draft, setDraft] = useState<DraftResponse | null>(
    initial ? { content: initial.content, preview: initial.preview, slug: initial.slug } : null
  )
  const [editContent, setEditContent] = useState(() =>
    initial?.content ? htmlToMarkdown(initial.content) : ''
  )
  const [editPreview, setEditPreview] = useState(initial?.preview ?? '')
  const [editSlug, setEditSlug] = useState(initial?.slug ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [refining, setRefining] = useState(false)

  async function handleRefine() {
    if (!editContent.trim() && mediaUrls.length === 0) return
    setRefining(true)
    setSaveError('')
    try {
      const result = await refineDraft(token, {
        title,
        category,
        existingContent: editContent,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      })
      setEditContent(result.content)
      if (result.preview) setEditPreview(result.preview)
      if (result.slug) setEditSlug(result.slug)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Refine failed')
    }
    setRefining(false)
  }

  async function handleGenerate() {
    if (!title.trim() && !roughIdea.trim()) return
    setGenerating(true)
    setGenError('')
    try {
      const result = await generateDraft(token, { title, category, roughIdea, mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined })
      const cleanSlug = (result.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setDraft(result)
      setEditContent(htmlToMarkdown(result.content))
      setEditPreview(result.preview)
      setEditSlug(cleanSlug)
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    }
    setGenerating(false)
  }

  function handleSkipAI() {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setDraft({ content: roughIdea, preview: '', slug })
    setEditContent(roughIdea)
    setEditPreview('')
    setEditSlug(slug)
  }

  async function handlePublish() {
    setSaving(true)
    setSaveError('')
    const safeSlug = editSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      const htmlContent = markdownToHtml(editContent)
      if (initial?.id) {
        await updateBlogPost(token, initial.id, {
          slug: safeSlug,
          title,
          content: htmlContent,
          preview: editPreview,
          category,
        })
      } else {
        await createBlogPost(token, {
          slug: safeSlug,
          title,
          content: htmlContent,
          preview: editPreview,
          category,
          publishedAt: publishedAt || undefined,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      onDone()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  // Draft editing mode (step 2)
  if (draft) {
    return (
      <div className="admin-editor">
        {saveError && <div className="admin-error">{saveError}</div>}
        {uploadError && <div className="admin-error">{uploadError}</div>}

        <div>
          <label htmlFor="draft-slug" className="memory-feedback-label">Slug</label>
          <input
            id="draft-slug"
            type="text"
            className="memory-feedback-input"
            placeholder="my-post-slug"
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="draft-title" className="memory-feedback-label">Title</label>
          <input
            id="draft-title"
            type="text"
            className="memory-feedback-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="draft-preview" className="memory-feedback-label">Preview</label>
          <input
            id="draft-preview"
            type="text"
            className="memory-feedback-input"
            placeholder="Short preview text..."
            value={editPreview}
            onChange={(e) => setEditPreview(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="draft-category" className="memory-feedback-label">Category</label>
          <select
            id="draft-category"
            className="memory-feedback-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="technical">Technical Blog</option>
            <option value="hackathon">Hackathon Journey</option>
            <option value="research">Research Reading</option>
          </select>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="memory-feedback-label" style={{ margin: 0 }}>Content (Markdown) + Preview</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <MediaUploadBar
                mediaUrls={mediaUrls}
                uploading={uploading}
                status={uploadStatus}
                onUpload={handleUpload}
                onRemove={removeUrl}
                compact
              />
              <button
                type="button"
                className="admin-bar-btn admin-bar-btn-save"
                disabled={refining || (!editContent.trim() && mediaUrls.length === 0)}
                onClick={handleRefine}
              >
                {refining ? 'REFINING...' : 'REFINE WITH AI'}
              </button>
            </div>
          </div>
          <div className="admin-draft-split">
            <textarea
              ref={editorTextareaRef}
              className="memory-feedback-input admin-textarea-lg"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={20}
              placeholder={"## Section title\n\nWrite in markdown... **bold**, [links](url)\n\nUse 📷 ADD MEDIA to insert images/videos."}
            />
            <div
              className="admin-draft-preview blog-post-content"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(editContent) }}
            />
          </div>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn admin-bar-btn-save"
            disabled={saving || !editSlug.trim() || !title.trim()}
            onClick={handlePublish}
          >
            {saving ? 'SAVING...' : initial ? 'UPDATE' : 'PUBLISH'}
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => {
              setDraft(null)
              setEditContent('')
              setEditPreview('')
              setEditSlug('')
            }}
            disabled={saving}
          >
            BACK
          </button>
          <button type="button" className="admin-btn" onClick={onDone} disabled={saving}>
            CANCEL
          </button>
        </div>
      </div>
    )
  }

  // Rough idea input mode (step 1)
  return (
    <div className="admin-editor">
      {genError && <div className="admin-error">{genError}</div>}
      {uploadError && <div className="admin-error">{uploadError}</div>}

      <div>
        <label htmlFor="idea-title" className="memory-feedback-label">Title</label>
        <input
          id="idea-title"
          type="text"
          className="memory-feedback-input"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="idea-category" className="memory-feedback-label">Category</label>
        <select
          id="idea-category"
          className="memory-feedback-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="technical">Technical Blog</option>
          <option value="hackathon">Hackathon Journey</option>
          <option value="research">Research Reading</option>
        </select>
      </div>

      <div>
        <label htmlFor="idea-published" className="memory-feedback-label">Published Date</label>
        <input
          id="idea-published"
          type="date"
          className="memory-feedback-input"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="idea-rough" className="memory-feedback-label">Rough Idea</label>
        <textarea
          id="idea-rough"
          className="memory-feedback-input admin-textarea-lg"
          placeholder="Write your rough draft, bullet points, or stream of consciousness here..."
          value={roughIdea}
          onChange={(e) => setRoughIdea(e.target.value)}
          rows={12}
        />
      </div>

      <div>
        <label className="memory-feedback-label">Attach Media (optional)</label>
        <MediaUploadBar
          mediaUrls={mediaUrls}
          uploading={uploading}
          status={uploadStatus}
          onUpload={handleUpload}
          onRemove={removeUrl}
        />
        {mediaUrls.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ink-faint)', marginTop: '4px' }}>
            AI will analyze and place them
          </span>
        )}
      </div>

      {generating ? (
        <div className="admin-generating">
          <span className="admin-generating-dot" />
          <span className="admin-generating-dot" />
          <span className="admin-generating-dot" />
          <span>Generating draft with Gemini...</span>
        </div>
      ) : (
        <div className="admin-btn-row">
          <button
            type="button"
            className="admin-bar-btn admin-bar-btn-save"
            disabled={!title.trim() && !roughIdea.trim()}
            onClick={handleGenerate}
          >
            GENERATE WITH AI
          </button>
          <button
            type="button"
            className="admin-bar-btn admin-bar-btn-add"
            onClick={handleSkipAI}
          >
            SKIP AI
          </button>
          <button type="button" className="admin-bar-btn" onClick={onDone}>
            CANCEL
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Posts manager tab ─── */

function PostsManager() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: fetchBlogPosts,
    enabled: !!token,
  })

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"?`)) return
    await deleteBlogPost(token, post.id)
    queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })
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

/* ─── Music manager tab ─── */

function MusicManager() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: tracks, isLoading } = useQuery({
    queryKey: ['admin-music-tracks'],
    queryFn: fetchMusicTracks,
    enabled: !!token,
  })

  async function handleDelete(track: MusicTrack) {
    if (!track.id || !confirm(`Delete "${track.name}"?`)) return
    await deleteMusicTrack(token, track.id)
    queryClient.invalidateQueries({ queryKey: ['admin-music-tracks'] })
    queryClient.invalidateQueries({ queryKey: ['music-tracks'] })
  }

  if (mode === 'create' || (mode === 'edit' && editingTrack)) {
    return (
      <MusicTrackEditor
        initial={editingTrack ?? undefined}
        uploading={uploading}
        setUploading={setUploading}
        onSave={async (data) => {
          if (editingTrack?.id) {
            await updateMusicTrack(token, editingTrack.id, data)
          } else {
            await createMusicTrack(token, data)
          }
          queryClient.invalidateQueries({ queryKey: ['admin-music-tracks'] })
          queryClient.invalidateQueries({ queryKey: ['music-tracks'] })
          setMode('list')
          setEditingTrack(null)
        }}
        onCancel={() => { setMode('list'); setEditingTrack(null) }}
      />
    )
  }

  if (isLoading) return <p className="admin-empty">Loading tracks...</p>

  return (
    <>
      <button
        className="admin-btn admin-bar-btn-add"
        onClick={() => setMode('create')}
        style={{ marginBottom: 'var(--space-md)' }}
      >
        + NEW TRACK
      </button>

      {!tracks || tracks.length === 0 ? (
        <p className="admin-empty">No tracks yet. Upload your first one.</p>
      ) : (
        tracks.map((track) => (
          <div key={track.id} className="admin-post-item">
            <div className="admin-post-info">
              <div className="admin-post-title">{track.name}</div>
              <div className="admin-post-slug">{track.genre} — {track.original === 'true' || track.original === 'original' ? 'Original' : 'Cover'}</div>
            </div>
            <div className="admin-actions">
              <button className="admin-btn" onClick={() => { setEditingTrack(track); setMode('edit') }}>
                EDIT
              </button>
              <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(track)}>
                DELETE
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}

function MusicTrackEditor({
  initial,
  uploading,
  setUploading,
  onSave,
  onCancel,
}: {
  initial?: MusicTrack
  uploading: boolean
  setUploading: (v: boolean) => void
  onSave: (data: Omit<MusicTrack, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [original, setOriginal] = useState(initial?.original ?? 'true')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      // Convert WAV/FLAC/AIFF to MP3 client-side before uploading
      const { needsAudioConversion: needsConversion, convertToMp3 } = await import('../lib/mediaConvert')
      if (needsConversion(file)) {
        setConverting(true)
        file = await convertToMp3(file)
        setConverting(false)
      }
      const ext = file.name.split('.').pop() ?? 'mp3'
      const path = `music/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('blog-media').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('blog-media').getPublicUrl(path)
      setFileUrl(urlData.publicUrl)
    } catch (err) {
      setConverting(false)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ name, slug, genre, original, notes, fileUrl, sortOrder })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form className="admin-editor" onSubmit={handleSubmit}>
      {error && <div className="admin-error">{error}</div>}

      <div>
        <label htmlFor="track-name" className="memory-feedback-label">Track Name</label>
        <input id="track-name" type="text" className="memory-feedback-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-slug" className="memory-feedback-label">Slug</label>
        <input id="track-slug" type="text" className="memory-feedback-input" placeholder="my-track" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-genre" className="memory-feedback-label">Genre</label>
        <input id="track-genre" type="text" className="memory-feedback-input" placeholder="R&B, Pop, etc." value={genre} onChange={(e) => setGenre(e.target.value)} />
      </div>

      <div>
        <label htmlFor="track-original" className="memory-feedback-label">Type</label>
        <select id="track-original" className="memory-feedback-input" value={original} onChange={(e) => setOriginal(e.target.value)}>
          <option value="true">Original</option>
          <option value="false">Cover</option>
        </select>
      </div>

      <div>
        <label htmlFor="track-notes" className="memory-feedback-label">Notes</label>
        <input id="track-notes" type="text" className="memory-feedback-input" placeholder="Production notes, credits, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div>
        <label htmlFor="track-order" className="memory-feedback-label">Sort Order</label>
        <input id="track-order" type="number" className="memory-feedback-input" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </div>

      <div>
        <label className="memory-feedback-label">Audio File</label>
        {fileUrl && (
          <div style={{ marginBottom: '6px' }}>
            <audio controls src={fileUrl} style={{ width: '100%', height: '32px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-ink-faint)', marginTop: '2px', wordBreak: 'break-all' }}>
              {fileUrl.split('/').pop()}
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button type="button" className="admin-bar-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading || converting}>
          {converting ? 'CONVERTING TO MP3...' : uploading ? 'UPLOADING...' : fileUrl ? 'REPLACE FILE' : 'UPLOAD AUDIO'}
        </button>
      </div>

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || uploading || !name.trim() || !fileUrl}>
          {saving ? 'SAVING...' : initial ? 'UPDATE' : 'CREATE'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
          CANCEL
        </button>
      </div>
    </form>
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
    '': { label: 'Posts', ascii: 'posts' },
    posts: { label: 'Posts', ascii: 'posts' },
    music: { label: 'Music', ascii: 'music' },
    feedback: { label: 'Feedback', ascii: 'feedback' },
    notifications: { label: 'Notifications', ascii: 'notifications' },
  }

  const section = item || ''
  const { label, ascii } = sectionMap[section] ?? sectionMap['']

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
      <AsciiTitle name={ascii} />
      <div className="editor-content">
        {content}
      </div>
    </div>
  )
}
