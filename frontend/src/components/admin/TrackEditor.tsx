import { useState, type FormEvent } from 'react'
import type { MusicTrack } from '../../types/index'
import '../../styles/admin.css'
import '../../styles/memory.css'

interface TrackEditorProps {
  initial?: MusicTrack
  onSave: (data: { slug: string; name: string; genre: string; original: string; notes: string; fileUrl: string; sortOrder: number }) => Promise<void>
  onCancel: () => void
}

export default function TrackEditor({ initial, onSave, onCancel }: TrackEditorProps) {
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [original, setOriginal] = useState(initial?.original ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ slug, name, genre, original, notes, fileUrl, sortOrder })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form className="admin-editor" onSubmit={handleSubmit}>
      {error && <div className="admin-error">{error}</div>}

      <div>
        <label htmlFor="track-slug" className="memory-feedback-label">Slug</label>
        <input id="track-slug" type="text" className="memory-feedback-input" placeholder="track-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-name" className="memory-feedback-label">Name</label>
        <input id="track-name" type="text" className="memory-feedback-input" placeholder="Track name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-genre" className="memory-feedback-label">Genre</label>
        <input id="track-genre" type="text" className="memory-feedback-input" placeholder="R&B, Pop..." value={genre} onChange={(e) => setGenre(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-original" className="memory-feedback-label">Original</label>
        <input id="track-original" type="text" className="memory-feedback-input" placeholder="Original artist" value={original} onChange={(e) => setOriginal(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-notes" className="memory-feedback-label">Notes</label>
        <textarea id="track-notes" className="memory-feedback-input" placeholder="Notes about the track..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </div>

      <div>
        <label htmlFor="track-file" className="memory-feedback-label">File URL</label>
        <input id="track-file" type="text" className="memory-feedback-input" placeholder="https://..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="track-sort" className="memory-feedback-label">Sort Order</label>
        <input id="track-sort" type="number" className="memory-feedback-input" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </div>

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          {saving ? 'SAVING...' : initial ? 'UPDATE' : 'CREATE'}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel}>CANCEL</button>
      </div>
    </form>
  )
}
