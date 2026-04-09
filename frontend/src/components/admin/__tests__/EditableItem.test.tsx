import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditableItem from '../EditableItem'

describe('EditableItem', () => {
  it('shows only children when isEditMode is false', () => {
    render(
      <EditableItem isEditMode={false} onEdit={vi.fn()} onDelete={vi.fn()}>
        <div>Child Content</div>
      </EditableItem>
    )
    expect(screen.getByText('Child Content')).toBeInTheDocument()
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
  })

  it('shows edit and delete buttons when isEditMode is true', () => {
    render(
      <EditableItem isEditMode={true} onEdit={vi.fn()} onDelete={vi.fn()}>
        <div>Child Content</div>
      </EditableItem>
    )
    expect(screen.getByText('Child Content')).toBeInTheDocument()
    expect(screen.getByTitle('Edit')).toBeInTheDocument()
    expect(screen.getByTitle('Delete')).toBeInTheDocument()
  })

  it('edit button calls onEdit', () => {
    const onEdit = vi.fn()
    render(
      <EditableItem isEditMode={true} onEdit={onEdit} onDelete={vi.fn()}>
        <div>Content</div>
      </EditableItem>
    )
    fireEvent.click(screen.getByTitle('Edit'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('delete button calls onDelete', () => {
    const onDelete = vi.fn()
    render(
      <EditableItem isEditMode={true} onEdit={vi.fn()} onDelete={onDelete}>
        <div>Content</div>
      </EditableItem>
    )
    fireEvent.click(screen.getByTitle('Delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('move up button calls onMoveUp', () => {
    const onMoveUp = vi.fn()
    render(
      <EditableItem
        isEditMode={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={onMoveUp}
        onMoveDown={vi.fn()}
      >
        <div>Content</div>
      </EditableItem>
    )
    fireEvent.click(screen.getByTitle('Move up'))
    expect(onMoveUp).toHaveBeenCalledTimes(1)
  })

  it('move down button calls onMoveDown', () => {
    const onMoveDown = vi.fn()
    render(
      <EditableItem
        isEditMode={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={onMoveDown}
      >
        <div>Content</div>
      </EditableItem>
    )
    fireEvent.click(screen.getByTitle('Move down'))
    expect(onMoveDown).toHaveBeenCalledTimes(1)
  })

  it('move up button is disabled when isFirst is true', () => {
    render(
      <EditableItem
        isEditMode={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        isFirst={true}
      >
        <div>Content</div>
      </EditableItem>
    )
    expect(screen.getByTitle('Move up')).toBeDisabled()
  })

  it('move down button is disabled when isLast is true', () => {
    render(
      <EditableItem
        isEditMode={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        isLast={true}
      >
        <div>Content</div>
      </EditableItem>
    )
    expect(screen.getByTitle('Move down')).toBeDisabled()
  })

  it('move buttons do not render when onMoveUp/onMoveDown not provided', () => {
    render(
      <EditableItem isEditMode={true} onEdit={vi.fn()} onDelete={vi.fn()}>
        <div>Content</div>
      </EditableItem>
    )
    expect(screen.queryByTitle('Move up')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Move down')).not.toBeInTheDocument()
  })
})
