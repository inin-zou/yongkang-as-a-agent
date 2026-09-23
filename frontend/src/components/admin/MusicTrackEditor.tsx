import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { MusicTrack } from '../../types/index'

export default function MusicTrackEditor({
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
      const { needsAudioConversion: needsConversion, convertToMp3 } = await import('../../lib/mediaConvert')
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
