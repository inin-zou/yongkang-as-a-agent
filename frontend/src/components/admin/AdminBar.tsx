import { useAdminEdit } from '../../hooks/useAdminEdit'
import '../../styles/admin.css'

interface AdminBarProps {
  isEditing: boolean
  onToggleEdit: () => void
  onSave?: () => void
  saving?: boolean
  onAdd?: () => void
  addLabel?: string
}

export default function AdminBar({ isEditing, onToggleEdit, onSave, saving, onAdd, addLabel }: AdminBarProps) {
  const { isAdmin } = useAdminEdit()
  if (!isAdmin) return null

  return (
    <div className={`admin-bar ${isEditing ? 'admin-bar-active' : ''}`}>
      <div className="admin-bar-label">
        <span className="admin-bar-indicator" />
        {isEditing ? 'EDIT MODE' : 'ADMIN'}
      </div>
      <div className="admin-bar-actions">
        {isEditing && onAdd && (
          <button type="button" className="admin-bar-btn admin-bar-btn-add" onClick={onAdd}>
            + {addLabel ?? 'NEW'}
          </button>
        )}
        {isEditing && onSave && (
          <button
            type="button"
            className="admin-bar-btn admin-bar-btn-save"
            disabled={saving}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(); }}
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        )}
        <button
          type="button"
          className={`admin-bar-btn ${isEditing ? 'admin-bar-btn-done' : 'admin-bar-btn-edit'}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleEdit(); }}
        >
          {isEditing ? 'CANCEL' : 'EDIT'}
        </button>
      </div>
    </div>
  )
}
