import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminBar from '../AdminBar'

// Default mock: admin user
vi.mock('../../../hooks/useAdminEdit', () => ({
  useAdminEdit: vi.fn(() => ({ isAdmin: true, token: 'test-token' })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAdminEdit } = await import('../../../hooks/useAdminEdit')
const mockedUseAdminEdit = vi.mocked(useAdminEdit)

describe('AdminBar', () => {
  beforeEach(() => {
    mockedUseAdminEdit.mockReturnValue({ isAdmin: true, token: 'test-token' })
  })

  it('renders nothing when user is not admin', () => {
    mockedUseAdminEdit.mockReturnValue({ isAdmin: false, token: '' })
    const { container } = render(
      <AdminBar isEditing={false} onToggleEdit={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows EDIT button when not editing', () => {
    render(<AdminBar isEditing={false} onToggleEdit={vi.fn()} />)
    expect(screen.getByText('EDIT')).toBeInTheDocument()
    expect(screen.queryByText('SAVE')).not.toBeInTheDocument()
    expect(screen.queryByText('CANCEL')).not.toBeInTheDocument()
  })

  it('shows SAVE, CANCEL, and + NEW buttons when editing', () => {
    render(
      <AdminBar
        isEditing={true}
        onToggleEdit={vi.fn()}
        onSave={vi.fn()}
        onAdd={vi.fn()}
      />
    )
    expect(screen.getByText('SAVE')).toBeInTheDocument()
    expect(screen.getByText('CANCEL')).toBeInTheDocument()
    expect(screen.getByText('+ NEW')).toBeInTheDocument()
  })

  it('EDIT button calls onToggleEdit', () => {
    const onToggleEdit = vi.fn()
    render(<AdminBar isEditing={false} onToggleEdit={onToggleEdit} />)
    fireEvent.click(screen.getByText('EDIT'))
    expect(onToggleEdit).toHaveBeenCalledTimes(1)
  })

  it('SAVE button calls onSave', () => {
    const onSave = vi.fn()
    render(
      <AdminBar isEditing={true} onToggleEdit={vi.fn()} onSave={onSave} />
    )
    fireEvent.click(screen.getByText('SAVE'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('CANCEL button calls onToggleEdit', () => {
    const onToggleEdit = vi.fn()
    render(
      <AdminBar isEditing={true} onToggleEdit={onToggleEdit} onSave={vi.fn()} />
    )
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onToggleEdit).toHaveBeenCalledTimes(1)
  })

  it('+ NEW button calls onAdd', () => {
    const onAdd = vi.fn()
    render(
      <AdminBar
        isEditing={true}
        onToggleEdit={vi.fn()}
        onSave={vi.fn()}
        onAdd={onAdd}
      />
    )
    fireEvent.click(screen.getByText('+ NEW'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('SAVE button shows "SAVING..." when saving prop is true', () => {
    render(
      <AdminBar
        isEditing={true}
        onToggleEdit={vi.fn()}
        onSave={vi.fn()}
        saving={true}
      />
    )
    expect(screen.getByText('SAVING...')).toBeInTheDocument()
    expect(screen.queryByText('SAVE')).not.toBeInTheDocument()
  })

  it('SAVE button is disabled when saving', () => {
    render(
      <AdminBar
        isEditing={true}
        onToggleEdit={vi.fn()}
        onSave={vi.fn()}
        saving={true}
      />
    )
    expect(screen.getByText('SAVING...')).toBeDisabled()
  })

  it('uses custom addLabel when provided', () => {
    render(
      <AdminBar
        isEditing={true}
        onToggleEdit={vi.fn()}
        onAdd={vi.fn()}
        addLabel="SKILL"
      />
    )
    expect(screen.getByText('+ SKILL')).toBeInTheDocument()
  })
})
