import { useState, type FormEvent } from 'react'
import type { BlogPost } from '../../types/index'
import { htmlToMarkdown, markdownToHtml } from '../../lib/markdown'
import { refineDraft } from '../../lib/api'
import { useBlogMediaUpload } from '../../hooks/useBlogMediaUpload'
import MediaUploadBar from './MediaUploadBar'
import '../../styles/admin.css'
import '../../styles/memory.css'

interface PostEditorProps {
  initial?: BlogPost
  token: string
  onSave: (data: { slug: string; title: string; content: string; preview: string; category: string }) => Promise<void>
  onCancel: () => void
}

export default function PostEditor({ initial, token, onSave, onCancel }: PostEditorProps) {
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [preview, setPreview] = useState(initial?.preview ?? '')
  const [content, setContent] = useState(() =>
    initial?.content ? htmlToMarkdown(initial.content) : ''
  )
  const [category, setCategory] = useState(initial?.category ?? 'technical')
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState('')

  const { mediaUrls, uploading, error: uploadError, handleUpload, removeUrl } = useBlogMediaUpload()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ slug, title, content: markdownToHtml(content), preview, category })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  async function handleRefine() {
    setRefining(true)
    setError('')
    try {
      const result = await refineDraft(token, {
        title,
        category,
        existingContent: content,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      })
      setContent(htmlToMarkdown(result.content))
      if (result.preview) setPreview(result.preview)
      if (result.slug) setSlug(result.slug)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refine failed')
    }
    setRefining(false)
  }

  return (
    <form className="admin-editor" onSubmit={handleSubmit}>
      {error && <div className="admin-error">{error}</div>}
      {uploadError && <div className="admin-error">{uploadError}</div>}

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
        <label htmlFor="post-category" className="memory-feedback-label">Category</label>
        <select
          id="post-category"
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
        <label htmlFor="post-content" className="memory-feedback-label">Content (Markdown)</label>
        <textarea
          id="post-content"
          className="memory-feedback-input admin-textarea-lg"
          placeholder={"## Section title\n\nWrite your post in markdown...\n\n- bullet points\n- **bold text**\n- [links](url)"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          required
        />
      </div>

      <div>
        <label className="memory-feedback-label">Attach Media + AI Refine</label>
        <MediaUploadBar
          mediaUrls={mediaUrls}
          uploading={uploading}
          onUpload={handleUpload}
          onRemove={removeUrl}
          compact
        />
        <button
          type="button"
          className="admin-bar-btn admin-bar-btn-save"
          disabled={refining || (!content.trim() && mediaUrls.length === 0)}
          onClick={handleRefine}
          style={{ marginTop: '6px' }}
        >
          {refining ? 'REFINING...' : 'REFINE WITH AI'}
        </button>
        {mediaUrls.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ink-faint)', marginLeft: '8px' }}>
            AI will analyze and place {mediaUrls.length} file{mediaUrls.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || refining}>
          {saving ? 'SAVING...' : initial ? 'UPDATE' : 'CREATE'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={saving || refining}>
          CANCEL
        </button>
      </div>
    </form>
  )
}
