import { useState, type FormEvent } from 'react'
import type { BlogPost } from '../../types/index'
import '../../styles/admin.css'
import '../../styles/memory.css'

interface PostEditorProps {
  initial?: BlogPost
  onSave: (data: { slug: string; title: string; content: string; preview: string }) => Promise<void>
  onCancel: () => void
}

export default function PostEditor({ initial, onSave, onCancel }: PostEditorProps) {
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
