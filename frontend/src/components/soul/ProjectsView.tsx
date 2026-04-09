import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProjectStatuses, createProjectStatus, updateProjectStatus, deleteProjectStatus } from '../../lib/api'
import { useAdminEdit } from '../../hooks/useAdminEdit'
import AdminBar from '../admin/AdminBar'
import EditableItem from '../admin/EditableItem'
import AsciiTitle from '../global/AsciiTitle'
import type { ProjectStatus } from '../../types'
import '../../styles/skill.css'
import '../../styles/admin.css'

const STATUS_OPTIONS = ['ACTIVE', 'PLANNING', 'ON HOLD', 'SHIPPED'] as const

export default function ProjectsView() {
  const { isAdmin, token } = useAdminEdit()
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectStatus | null>(null)
  const [creating, setCreating] = useState(false)

  // Form state for create/edit
  const [formName, setFormName] = useState('')
  const [formStatus, setFormStatus] = useState('ACTIVE')
  const [formDescription, setFormDescription] = useState('')
  const [formNextStep, setFormNextStep] = useState('')
  const [formLinks, setFormLinks] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)

  const { data: projects, isLoading } = useQuery({
    queryKey: ['project-statuses'],
    queryFn: fetchProjectStatuses,
  })

  function resetForm() {
    setFormName('')
    setFormStatus('ACTIVE')
    setFormDescription('')
    setFormNextStep('')
    setFormLinks('')
    setFormSortOrder(projects?.length ?? 0)
  }

  function startEdit(p: ProjectStatus) {
    setEditingProject(p)
    setCreating(false)
    setFormName(p.name)
    setFormStatus(p.status)
    setFormDescription(p.description)
    setFormNextStep(p.nextStep ?? '')
    setFormLinks(p.links ?? '')
    setFormSortOrder(p.sortOrder)
  }

  function startCreate() {
    setCreating(true)
    setEditingProject(null)
    resetForm()
  }

  async function handleSaveNew() {
    await createProjectStatus(token, {
      name: formName,
      status: formStatus,
      description: formDescription,
      nextStep: formNextStep,
      links: formLinks,
      sortOrder: formSortOrder,
    })
    queryClient.invalidateQueries({ queryKey: ['project-statuses'] })
    setCreating(false)
    resetForm()
  }

  async function handleSaveEdit() {
    if (!editingProject?.id) return
    await updateProjectStatus(token, editingProject.id, {
      name: formName,
      status: formStatus,
      description: formDescription,
      nextStep: formNextStep,
      links: formLinks,
      sortOrder: formSortOrder,
    })
    queryClient.invalidateQueries({ queryKey: ['project-statuses'] })
    setEditingProject(null)
  }

  function renderForm(onSave: () => void, onCancel: () => void) {
    return (
      <div className="admin-editor" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <label htmlFor="ps-name" className="memory-feedback-label">Name</label>
          <input
            id="ps-name"
            type="text"
            className="memory-feedback-input"
            placeholder="Project name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ps-status" className="memory-feedback-label">Status</label>
          <select
            id="ps-status"
            className="memory-feedback-input"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ps-desc" className="memory-feedback-label">Description</label>
          <textarea
            id="ps-desc"
            className="memory-feedback-input"
            placeholder="What is this project about?"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <label htmlFor="ps-next" className="memory-feedback-label">Next Step</label>
          <input
            id="ps-next"
            type="text"
            className="memory-feedback-input"
            placeholder="What's next?"
            value={formNextStep}
            onChange={(e) => setFormNextStep(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ps-links" className="memory-feedback-label">Links (comma-separated)</label>
          <input
            id="ps-links"
            type="text"
            className="memory-feedback-input"
            placeholder="https://github.com/..."
            value={formLinks}
            onChange={(e) => setFormLinks(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <button type="button" className="admin-bar-btn admin-bar-btn-save" onClick={onSave}>SAVE</button>
          <button type="button" className="admin-bar-btn admin-bar-btn-done" onClick={onCancel}>CANCEL</button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading projects...
        </p>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">Agent runtime status</div>
      <AsciiTitle name="projects" />

      <div className="editor-content">
        {isAdmin && (
          <AdminBar
            isEditing={isEditMode}
            onToggleEdit={() => {
              setIsEditMode(!isEditMode)
              setEditingProject(null)
              setCreating(false)
            }}
            onAdd={isEditMode ? startCreate : undefined}
          />
        )}

        {creating && renderForm(handleSaveNew, () => setCreating(false))}

        <div className="cli-block">
          <div className="cli-prompt">$ agent --status</div>
          <div className="cli-output">
            <div className="cli-status-header">
              <span className="cli-status-pid">PID</span>
              <span className="cli-status-state">STATUS</span>
              <span className="cli-status-name">PROJECT</span>
            </div>
            {projects?.map((p, i) => (
              <div key={p.id ?? i}>
                {isEditMode && editingProject?.id === p.id && p.id ? (
                  renderForm(handleSaveEdit, () => setEditingProject(null))
                ) : (
                  <EditableItem
                    isEditMode={isEditMode}
                    onEdit={() => startEdit(p)}
                    onDelete={async () => {
                      if (!confirm(`Delete "${p.name}"?`)) return
                      await deleteProjectStatus(token, p.id!)
                      queryClient.invalidateQueries({ queryKey: ['project-statuses'] })
                    }}
                    isFirst={i === 0}
                    isLast={i === (projects?.length ?? 0) - 1}
                    onMoveUp={async () => {
                      try {
                        if (i === 0 || !projects) return
                        const prev = projects[i - 1]
                        await Promise.all([
                          updateProjectStatus(token, p.id!, {
                            name: p.name, status: p.status, description: p.description,
                            nextStep: p.nextStep ?? '', links: p.links ?? '', sortOrder: prev.sortOrder,
                          }),
                          updateProjectStatus(token, prev.id!, {
                            name: prev.name, status: prev.status, description: prev.description,
                            nextStep: prev.nextStep ?? '', links: prev.links ?? '', sortOrder: p.sortOrder,
                          }),
                        ])
                        queryClient.invalidateQueries({ queryKey: ['project-statuses'] })
                      } catch (err) {
                        console.error('Move up failed:', err)
                        alert('Move failed: ' + (err instanceof Error ? err.message : err))
                      }
                    }}
                    onMoveDown={async () => {
                      try {
                        if (!projects || i >= projects.length - 1) return
                        const next = projects[i + 1]
                        await Promise.all([
                          updateProjectStatus(token, p.id!, {
                            name: p.name, status: p.status, description: p.description,
                            nextStep: p.nextStep ?? '', links: p.links ?? '', sortOrder: next.sortOrder,
                          }),
                          updateProjectStatus(token, next.id!, {
                            name: next.name, status: next.status, description: next.description,
                            nextStep: next.nextStep ?? '', links: next.links ?? '', sortOrder: p.sortOrder,
                          }),
                        ])
                        queryClient.invalidateQueries({ queryKey: ['project-statuses'] })
                      } catch (err) {
                        console.error('Move down failed:', err)
                        alert('Move failed: ' + (err instanceof Error ? err.message : err))
                      }
                    }}
                  >
                    <div className="cli-status-row">
                      <span className="cli-status-pid">{String(i + 1).padStart(3, '0')}</span>
                      <span className={`cli-status-state cli-status-${p.status.toLowerCase().replace(' ', '-')}`}>
                        {p.status}
                      </span>
                      <div className="cli-status-info">
                        <div className="cli-status-name">{p.name}</div>
                        <div className="cli-status-desc">{'\u2192'} {p.description}</div>
                        {p.nextStep && <div className="cli-status-next">{'\u2192'} Next: {p.nextStep}</div>}
                      </div>
                    </div>
                  </EditableItem>
                )}
              </div>
            ))}
            {(!projects || projects.length === 0) && (
              <div style={{ color: 'var(--color-ink-faint)', fontStyle: 'italic', padding: 'var(--space-sm) 0' }}>
                No active projects
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
