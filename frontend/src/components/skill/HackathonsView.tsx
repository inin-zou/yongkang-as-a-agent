import { queryKeys } from '../../lib/queryKeys'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHackathons, createHackathon, updateHackathon, deleteHackathon } from '../../lib/api'
import { useAdminEdit } from '../../hooks/useAdminEdit'
import AdminBar from '../admin/AdminBar'
import EditableItem from '../admin/EditableItem'
import HackathonEditor from '../admin/HackathonEditor'
import HackathonMap from './HackathonMap'
import type { Hackathon } from '../../types'
import '../../styles/skill.css'

/* ===== Terminal Timeline ===== */
function HackathonTimeline({
  hackathons,
  isEditMode,
  editingHackathon,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: {
  hackathons: Hackathon[]
  isEditMode: boolean
  editingHackathon: Hackathon | null
  onEdit: (h: Hackathon) => void
  onDelete: (h: Hackathon) => void
  onSaveEdit: (h: Hackathon, data: Hackathon) => Promise<void>
  onCancelEdit: () => void
}) {
  return (
    <div className="cli-block">
      <div className="cli-output">
        {hackathons.map((h, i) => {
          if (isEditMode && editingHackathon?.id === h.id && h.id) {
            return (
              <HackathonEditor
                key={i}
                initial={h}
                onSave={(data) => onSaveEdit(h, data)}
                onCancel={onCancelEdit}
              />
            )
          }

          const hasWin = !!h.result
          const projectUrl = h.projectUrl || undefined

          return (
            <EditableItem
              key={i}
              isEditMode={isEditMode}
              onEdit={() => onEdit(h)}
              onDelete={() => onDelete(h)}
            >
              <div className={`cli-log-line ${hasWin ? 'cli-log-win' : 'cli-log-default'}`}>
                <span className="cli-log-date">{h.date}</span>
                <span className="cli-log-name">{h.name}</span>
                <span className="document-muted">{h.city}</span>
                {projectUrl ? (
                  <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="cli-log-project">
                    {h.projectName}
                  </a>
                ) : (
                  <span className="cli-log-project">{h.projectName}</span>
                )}
                {h.result && <span className="cli-log-result">{h.result}</span>}
                {h.solo && <span className="cli-log-solo">(solo)</span>}
              </div>
            </EditableItem>
          )
        })}
      </div>
    </div>
  )
}

/* ===== Main View ===== */
export default function HackathonsView() {
  const { isAdmin, token } = useAdminEdit()
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: hackathons, isLoading } = useQuery({
    queryKey: queryKeys.hackathons(),
    queryFn: fetchHackathons,
  })

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading hackathons...
        </p>
      </div>
    )
  }

  const all = hackathons || []

  return (
    <div className="editor-page">
      <div className="editor-meta">26 missions. 11 wins. Always shipping.</div>
      <h1>Hackathons</h1>

      {isAdmin && (
        <AdminBar
          isEditing={isEditMode}
          onToggleEdit={() => { setIsEditMode(!isEditMode); setEditingHackathon(null); setCreating(false) }}
          onAdd={isEditMode ? () => { setCreating(true); setEditingHackathon(null) } : undefined}
        />
      )}

      {creating && (
        <HackathonEditor
          onSave={async (data) => {
            await createHackathon(token, data)
            queryClient.invalidateQueries({ queryKey: queryKeys.hackathons() })
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <HackathonMap hackathons={all} />

      <div className="editor-content">
        {[...new Set(all.map(h => h.date.slice(0, 4)))].sort().reverse().map(year => <section className="document-year" key={year}>
          <h2>{year}</h2>
        <HackathonTimeline
          hackathons={all.filter(h => h.date.startsWith(year))}
          isEditMode={isEditMode}
          editingHackathon={editingHackathon}
          onEdit={(h) => setEditingHackathon(h)}
          onDelete={async (h) => {
            if (!confirm(`Delete "${h.name}"?`)) return
            await deleteHackathon(token, h.id!)
            queryClient.invalidateQueries({ queryKey: queryKeys.hackathons() })
          }}
          onSaveEdit={async (h, data) => {
            await updateHackathon(token, h.id!, data)
            queryClient.invalidateQueries({ queryKey: queryKeys.hackathons() })
            setEditingHackathon(null)
          }}
          onCancelEdit={() => setEditingHackathon(null)}
        />
        </section>)}
      </div>
    </div>
  )
}
