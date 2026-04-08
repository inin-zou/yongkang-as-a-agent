import { useState, type FormEvent } from 'react'
import type { SkillDomain } from '../../types/index'
import '../../styles/admin.css'
import '../../styles/memory.css'

interface SkillEditorProps {
  initial?: SkillDomain
  onSave: (data: { title: string; slug: string; skills: string[]; battleTested: string[]; sortOrder: number }) => Promise<void>
  onCancel: () => void
}

export default function SkillEditor({ initial, onSave, onCancel }: SkillEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [skillsList, setSkillsList] = useState((initial?.skills ?? []).join(', '))
  const [battleTested, setBattleTested] = useState((initial?.battleTested ?? []).join(', '))
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        title,
        slug,
        skills: skillsList.split(',').map((s) => s.trim()).filter(Boolean),
        battleTested: battleTested.split(',').map((s) => s.trim()).filter(Boolean),
        sortOrder,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form className="admin-editor" onSubmit={handleSubmit}>
      {error && <div className="admin-error">{error}</div>}

      <div>
        <label htmlFor="skill-title" className="memory-feedback-label">Title</label>
        <input id="skill-title" type="text" className="memory-feedback-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="skill-slug" className="memory-feedback-label">Slug</label>
        <input id="skill-slug" type="text" className="memory-feedback-input" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="skill-skills" className="memory-feedback-label">Skills (comma-separated)</label>
        <input id="skill-skills" type="text" className="memory-feedback-input" placeholder="React, TypeScript, Go" value={skillsList} onChange={(e) => setSkillsList(e.target.value)} />
      </div>

      <div>
        <label htmlFor="skill-battle" className="memory-feedback-label">Battle Tested (comma-separated)</label>
        <input id="skill-battle" type="text" className="memory-feedback-input" placeholder="React, Go" value={battleTested} onChange={(e) => setBattleTested(e.target.value)} />
      </div>

      <div>
        <label htmlFor="skill-sort" className="memory-feedback-label">Sort Order</label>
        <input id="skill-sort" type="number" className="memory-feedback-input" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
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
