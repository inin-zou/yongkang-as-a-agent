import type { ReactNode } from 'react'
import '../../styles/admin.css'

interface EditableItemProps {
  isEditMode: boolean
  onEdit: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  children: ReactNode
}

export default function EditableItem({ isEditMode, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast, children }: EditableItemProps) {
  if (!isEditMode) {
    return <>{children}</>
  }

  return (
    <div className="editable-item">
      {children}
      <div className="editable-item-actions">
        {onMoveUp && (
          <button type="button" className="editable-item-btn editable-item-btn-move" onClick={onMoveUp} disabled={isFirst} title="Move up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </button>
        )}
        {onMoveDown && (
          <button type="button" className="editable-item-btn editable-item-btn-move" onClick={onMoveDown} disabled={isLast} title="Move down">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
        )}
        <button type="button" className="editable-item-btn editable-item-btn-edit" onClick={onEdit} title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </button>
        <button type="button" className="editable-item-btn editable-item-btn-delete" onClick={onDelete} title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
