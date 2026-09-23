import { queryKeys } from '../../lib/queryKeys'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSkills, createSkill, updateSkill, deleteSkill, fetchPage, updatePage } from '../../lib/api'
import { useAdminEdit } from '../../hooks/useAdminEdit'
import AdminBar from '../admin/AdminBar'
import EditableItem from '../admin/EditableItem'
import SkillEditor from '../admin/SkillEditor'
import type { SkillDomain } from '../../types'
import '../../styles/skill.css'

function SkillEntry({ domain }: { domain: SkillDomain }) {
  return (
    <div className="cli-skill-entry">
      <h3>{domain.title}</h3>
      <p className="document-muted">{[...(domain.skills ?? []), ...(domain.subcategories?.flatMap(sub => sub.skills) ?? [])].join(' · ')}</p>
      <div className="cli-skill-tested">
        ref: {domain.battleTested.join(' · ')}
      </div>
    </div>
  )
}

export default function SkillsView() {
  const { isAdmin, token } = useAdminEdit()
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SkillDomain | null>(null)
  const [creating, setCreating] = useState(false)
  const [editNarrative, setEditNarrative] = useState('')
  const [savingPage, setSavingPage] = useState(false)

  const { data: skills, isLoading } = useQuery({
    queryKey: queryKeys.skills(),
    queryFn: fetchSkills,
  })

  const { data: pageData } = useQuery({
    queryKey: queryKeys.page('skill'),
    queryFn: () => fetchPage('skill'),
  })

  const DEFAULT_NARRATIVE = 'Creative technologist assembling skills across domains. From enterprise RAG pipelines at Societe Generale to multi-agent orchestration at Misogi Labs, from 3D spatial intelligence to music AI at Mozart AI. Tested across 26 hackathons with 11 wins — every domain shift adds a new capability to the stack.'
  const narrative = (pageData?.narrative as string) ?? DEFAULT_NARRATIVE

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading skills...
        </p>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">Agent skill manifest — {skills?.length || 0} domains, 26 missions</div>
      <h1>Skills</h1>

      {isAdmin && (
        <AdminBar
          isEditing={isEditMode}
          onToggleEdit={() => {
            if (!isEditMode) setEditNarrative(narrative)
            setIsEditMode(!isEditMode); setEditingSkill(null); setCreating(false)
          }}
          onSave={async () => {
            setSavingPage(true)
            try {
              const updated = await updatePage(token, 'skill', { narrative: editNarrative })
              queryClient.setQueryData(queryKeys.page('skill'), updated)
              setIsEditMode(false)
            } finally { setSavingPage(false) }
          }}
          saving={savingPage}
          onAdd={isEditMode ? () => { setCreating(true); setEditingSkill(null) } : undefined}
        />
      )}

      {creating && (
        <SkillEditor
          onSave={async (data) => {
            await createSkill(token, data)
            queryClient.invalidateQueries({ queryKey: queryKeys.skills() })
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="editor-content">
        {isEditMode ? (
          <textarea
            className="memory-feedback-input"
            value={editNarrative}
            onChange={(e) => setEditNarrative(e.target.value)}
            rows={4}
            style={{ marginBottom: 'var(--space-sm)' }}
          />
        ) : (
          <p style={{ whiteSpace: 'pre-line' }}>{narrative}</p>
        )}

        <div className="editor-divider" />

        <p className="editor-label">Domains</p>
        <div className="cli-block">
          <div className="cli-output">
            {skills?.map((domain, i) => (
              <div key={domain.title}>
                {isEditMode && editingSkill?.id === domain.id && domain.id ? (
                  <SkillEditor
                    initial={domain}
                    onSave={async (data) => {
                      await updateSkill(token, domain.id!, data)
                      queryClient.invalidateQueries({ queryKey: queryKeys.skills() })
                      setEditingSkill(null)
                    }}
                    onCancel={() => setEditingSkill(null)}
                  />
                ) : (
                  <EditableItem
                    isEditMode={isEditMode}
                    onEdit={() => setEditingSkill(domain)}
                    onDelete={async () => {
                      if (!confirm(`Delete "${domain.title}"?`)) return
                      await deleteSkill(token, domain.id!)
                      queryClient.invalidateQueries({ queryKey: queryKeys.skills() })
                    }}
                    isFirst={i === 0}
                    isLast={i === (skills?.length ?? 0) - 1}
                    onMoveUp={async () => {
                      try {
                        if (i === 0 || !skills) return
                        const prev = skills[i - 1]
                        await Promise.all([
                          updateSkill(token, domain.id!, { title: domain.title, slug: domain.slug ?? '', skills: domain.skills ?? [], battleTested: domain.battleTested ?? [], sortOrder: prev.sortOrder ?? i - 1 }),
                          updateSkill(token, prev.id!, { title: prev.title, slug: prev.slug ?? '', skills: prev.skills ?? [], battleTested: prev.battleTested ?? [], sortOrder: domain.sortOrder ?? i }),
                        ])
                        queryClient.invalidateQueries({ queryKey: queryKeys.skills() })
                      } catch (err) { console.error('Move up failed:', err); alert('Move failed: ' + (err instanceof Error ? err.message : err)) }
                    }}
                    onMoveDown={async () => {
                      try {
                        if (!skills || i >= skills.length - 1) return
                        const next = skills[i + 1]
                        await Promise.all([
                          updateSkill(token, domain.id!, { title: domain.title, slug: domain.slug ?? '', skills: domain.skills ?? [], battleTested: domain.battleTested ?? [], sortOrder: next.sortOrder ?? i + 1 }),
                          updateSkill(token, next.id!, { title: next.title, slug: next.slug ?? '', skills: next.skills ?? [], battleTested: next.battleTested ?? [], sortOrder: domain.sortOrder ?? i }),
                        ])
                        queryClient.invalidateQueries({ queryKey: queryKeys.skills() })
                      } catch (err) { console.error('Move down failed:', err); alert('Move failed: ' + (err instanceof Error ? err.message : err)) }
                    }}
                  >
                    <SkillEntry domain={domain} />
                  </EditableItem>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">See Also</p>
        <div className="skill-nav-cards">
          <Link to="/files/skill/hackathons" className="skill-nav-card" data-interactive>
            <div className="skill-nav-card-title">HACKATHONS</div>
            <div className="skill-nav-card-stat">26 missions · 11 wins</div>
          </Link>
          <Link to="/files/skill/experience" className="skill-nav-card" data-interactive>
            <div className="skill-nav-card-title">RESUME</div>
            <div className="skill-nav-card-stat">6 roles · 3 years</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
