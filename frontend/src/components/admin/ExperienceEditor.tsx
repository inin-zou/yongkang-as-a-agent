import { useState, type FormEvent } from 'react'
import type { Experience } from '../../types/index'
import '../../styles/admin.css'
import '../../styles/memory.css'

interface ExperienceEditorProps {
  initial?: Experience
  onSave: (data: Experience) => Promise<void>
  onCancel: () => void
}

export default function ExperienceEditor({ initial, onSave, onCancel }: ExperienceEditorProps) {
  const [role, setRole] = useState(initial?.role ?? '')
  const [company, setCompany] = useState(initial?.company ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [skillAssembled, setSkillAssembled] = useState(initial?.skillAssembled ?? '')
  const [highlights, setHighlights] = useState((initial?.highlights ?? []).join('\n'))
  const [note, setNote] = useState(initial?.note ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        role,
        company,
        location,
        startDate,
        endDate: endDate || undefined,
        skillAssembled,
        highlights: highlights.split('\n').map((s) => s.trim()).filter(Boolean),
        note: note || undefined,
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
        <label htmlFor="exp-role" className="memory-feedback-label">Role</label>
        <input id="exp-role" type="text" className="memory-feedback-input" value={role} onChange={(e) => setRole(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="exp-company" className="memory-feedback-label">Company</label>
        <input id="exp-company" type="text" className="memory-feedback-input" value={company} onChange={(e) => setCompany(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="exp-location" className="memory-feedback-label">Location</label>
        <input id="exp-location" type="text" className="memory-feedback-input" value={location} onChange={(e) => setLocation(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="exp-start" className="memory-feedback-label">Start Date</label>
        <input id="exp-start" type="text" className="memory-feedback-input" placeholder="YYYY-MM" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="exp-end" className="memory-feedback-label">End Date</label>
        <input id="exp-end" type="text" className="memory-feedback-input" placeholder="YYYY-MM" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div>
        <label htmlFor="exp-skill" className="memory-feedback-label">Skill Assembled</label>
        <textarea id="exp-skill" className="memory-feedback-input" value={skillAssembled} onChange={(e) => setSkillAssembled(e.target.value)} rows={3} required />
      </div>

      <div>
        <label htmlFor="exp-highlights" className="memory-feedback-label">Highlights (one per line)</label>
        <textarea id="exp-highlights" className="memory-feedback-input" value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={6} />
      </div>

      <div>
        <label htmlFor="exp-note" className="memory-feedback-label">Note</label>
        <input id="exp-note" type="text" className="memory-feedback-input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div>
        <label htmlFor="exp-sort" className="memory-feedback-label">Sort Order</label>
        <input id="exp-sort" type="number" className="memory-feedback-input" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
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
