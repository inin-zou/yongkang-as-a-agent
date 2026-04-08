import { useState, type FormEvent } from 'react'
import type { Hackathon } from '../../types/index'
import '../../styles/admin.css'
import '../../styles/memory.css'

interface HackathonEditorProps {
  initial?: Hackathon
  onSave: (data: Hackathon) => Promise<void>
  onCancel: () => void
}

export default function HackathonEditor({ initial, onSave, onCancel }: HackathonEditorProps) {
  const [date, setDate] = useState(initial?.date ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [lat, setLat] = useState(initial?.lat ?? (initial?.coordinates ? initial.coordinates[0] : 0))
  const [lng, setLng] = useState(initial?.lng ?? (initial?.coordinates ? initial.coordinates[1] : 0))
  const [isRemote, setIsRemote] = useState(initial?.isRemote ?? false)
  const [projectName, setProjectName] = useState(initial?.projectName ?? '')
  const [projectSlug, setProjectSlug] = useState(initial?.projectSlug ?? '')
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? '')
  const [result, setResult] = useState(initial?.result ?? '')
  const [solo, setSolo] = useState(initial?.solo ?? false)
  const [domain, setDomain] = useState(initial?.domain ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        date,
        name,
        city: city || undefined,
        country: country || undefined,
        lat: lat || undefined,
        lng: lng || undefined,
        isRemote,
        projectName,
        projectSlug: projectSlug || undefined,
        projectUrl: projectUrl || undefined,
        result: result || undefined,
        solo,
        domain,
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
        <label htmlFor="hack-date" className="memory-feedback-label">Date</label>
        <input id="hack-date" type="text" className="memory-feedback-input" placeholder="YYYY.MM" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="hack-name" className="memory-feedback-label">Name</label>
        <input id="hack-name" type="text" className="memory-feedback-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="hack-city" className="memory-feedback-label">City</label>
        <input id="hack-city" type="text" className="memory-feedback-input" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      <div>
        <label htmlFor="hack-country" className="memory-feedback-label">Country</label>
        <input id="hack-country" type="text" className="memory-feedback-input" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <div>
        <label htmlFor="hack-lat" className="memory-feedback-label">Latitude</label>
        <input id="hack-lat" type="number" step="any" className="memory-feedback-input" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
      </div>

      <div>
        <label htmlFor="hack-lng" className="memory-feedback-label">Longitude</label>
        <input id="hack-lng" type="number" step="any" className="memory-feedback-input" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <input id="hack-remote" type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
        <label htmlFor="hack-remote" className="memory-feedback-label" style={{ marginBottom: 0 }}>Remote</label>
      </div>

      <div>
        <label htmlFor="hack-project" className="memory-feedback-label">Project Name</label>
        <input id="hack-project" type="text" className="memory-feedback-input" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
      </div>

      <div>
        <label htmlFor="hack-pslug" className="memory-feedback-label">Project Slug</label>
        <input id="hack-pslug" type="text" className="memory-feedback-input" value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)} />
      </div>

      <div>
        <label htmlFor="hack-purl" className="memory-feedback-label">Project URL</label>
        <input id="hack-purl" type="text" className="memory-feedback-input" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} />
      </div>

      <div>
        <label htmlFor="hack-result" className="memory-feedback-label">Result</label>
        <input id="hack-result" type="text" className="memory-feedback-input" value={result} onChange={(e) => setResult(e.target.value)} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <input id="hack-solo" type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} />
        <label htmlFor="hack-solo" className="memory-feedback-label" style={{ marginBottom: 0 }}>Solo</label>
      </div>

      <div>
        <label htmlFor="hack-domain" className="memory-feedback-label">Domain</label>
        <input id="hack-domain" type="text" className="memory-feedback-input" value={domain} onChange={(e) => setDomain(e.target.value)} required />
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
