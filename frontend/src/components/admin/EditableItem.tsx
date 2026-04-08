import type { ReactNode } from 'react'

interface EditableItemProps {
  isEditMode: boolean
  onEdit: () => void
  onDelete: () => void
  children: ReactNode
}

export default function EditableItem({ isEditMode, onEdit, onDelete, children }: EditableItemProps) {
  if (!isEditMode) {
    return <>{children}</>
  }

  return (
    <div className="editable-item">
      <div className="editable-item-actions">
        <button type="button" className="editable-item-btn editable-item-btn-edit" onClick={onEdit}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </button>
        <button type="button" className="editable-item-btn editable-item-btn-delete" onClick={onDelete}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
