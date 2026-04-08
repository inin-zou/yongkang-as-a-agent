import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSkills, createSkill, updateSkill, deleteSkill } from '../../lib/api'
import { useAdminEdit } from '../../hooks/useAdminEdit'
import AdminBar from '../admin/AdminBar'
import EditableItem from '../admin/EditableItem'
import SkillEditor from '../admin/SkillEditor'
import AsciiTitle from '../global/AsciiTitle'
import type { SkillDomain } from '../../types'
import '../../styles/skill.css'

function SkillEntry({ domain }: { domain: SkillDomain }) {
  return (
    <div className="cli-skill-entry">
      <div className="cli-skill-slug">{domain.slug}</div>
      <div className="cli-skill-tags">
        {(domain.skills || []).map((s) => (
          <span key={s} className="cli-skill-tag">{s}</span>
        ))}
        {domain.subcategories?.map((sub) =>
          sub.skills.map((s) => (
            <span key={s} className="cli-skill-tag">{s}</span>
          ))
        )}
      </div>
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

  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  })

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
      <div className="editor-meta">Agent skill manifest — {skills?.length || 0} domains, 24 missions</div>
      <AsciiTitle name="skills" />

      {isAdmin && (
        <AdminBar
          isEditing={isEditMode}
          onToggleEdit={() => { setIsEditMode(!isEditMode); setEditingSkill(null); setCreating(false) }}
          onAdd={isEditMode ? () => { setCreating(true); setEditingSkill(null) } : undefined}
        />
      )}

      {creating && (
        <SkillEditor
          onSave={async (data) => {
            await createSkill(token, data)
            queryClient.invalidateQueries({ queryKey: ['skills'] })
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="editor-content">
        <p>
          Creative technologist assembling skills across domains. From enterprise RAG pipelines
          at <Link to="/files/skill/resume" className="skill-inline-link">Societe Generale</Link> to
          multi-agent orchestration at <Link to="/files/skill/resume" className="skill-inline-link">Misogi Labs</Link>,
          from 3D spatial intelligence to music AI at <Link to="/files/skill/resume" className="skill-inline-link">Mozart AI</Link>.
          Tested across <Link to="/files/skill/hackathons" className="skill-inline-link">24 hackathons</Link> with
          9 wins — every domain shift adds a new capability to the stack.
        </p>

        <div className="editor-divider" />

        <p className="editor-label">Domains</p>
        <div className="cli-block">
          <div className="cli-prompt">$ agent --list skills</div>
          <div className="cli-output">
            {skills?.map((domain, i) => (
              <div key={domain.title}>
                {isEditMode && editingSkill?.id === domain.id && domain.id ? (
                  <SkillEditor
                    initial={domain}
                    onSave={async (data) => {
                      await updateSkill(token, domain.id!, data)
                      queryClient.invalidateQueries({ queryKey: ['skills'] })
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
                      queryClient.invalidateQueries({ queryKey: ['skills'] })
                    }}
                  >
                    <SkillEntry domain={domain} />
                  </EditableItem>
                )}
                {i < (skills.length - 1) && <div className="cli-skill-divider" />}
              </div>
            ))}
          </div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">See Also</p>
        <div className="skill-nav-cards">
          <Link to="/files/skill/hackathons" className="skill-nav-card" data-interactive>
            <div className="skill-nav-card-title">HACKATHONS</div>
            <div className="skill-nav-card-stat">24 missions · 9 wins</div>
            <div className="skill-nav-card-link">→ View journey</div>
          </Link>
          <Link to="/files/skill/resume" className="skill-nav-card" data-interactive>
            <div className="skill-nav-card-title">RESUME</div>
            <div className="skill-nav-card-stat">6 roles · 3 years</div>
            <div className="skill-nav-card-link">→ View experience</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
