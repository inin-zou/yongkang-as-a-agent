import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SkillEditor from '../SkillEditor'
import type { SkillDomain } from '../../../types/index'

describe('SkillEditor', () => {
  const mockInitial: SkillDomain = {
    title: 'Backend',
    slug: 'backend',
    skills: ['Go', 'Python'],
    battleTested: ['Go'],
    sortOrder: 1,
  }

  it('renders empty form when no initial value', () => {
    render(<SkillEditor onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Slug')).toHaveValue('')
    expect(screen.getByLabelText(/Skills/)).toHaveValue('')
    expect(screen.getByLabelText(/Battle Tested/)).toHaveValue('')
    expect(screen.getByLabelText('Sort Order')).toHaveValue(0)
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('pre-fills form when initial value provided', () => {
    render(<SkillEditor initial={mockInitial} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Backend')
    expect(screen.getByLabelText('Slug')).toHaveValue('backend')
    expect(screen.getByLabelText(/Skills/)).toHaveValue('Go, Python')
    expect(screen.getByLabelText(/Battle Tested/)).toHaveValue('Go')
    expect(screen.getByLabelText('Sort Order')).toHaveValue(1)
    expect(screen.getByText('UPDATE')).toBeInTheDocument()
  })

  it('calls onSave with correct data on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<SkillEditor onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Frontend' } })
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'frontend' } })
    fireEvent.change(screen.getByLabelText(/Skills/), { target: { value: 'React, TypeScript' } })
    fireEvent.change(screen.getByLabelText(/Battle Tested/), { target: { value: 'React' } })
    fireEvent.change(screen.getByLabelText('Sort Order'), { target: { value: '2' } })

    fireEvent.click(screen.getByText('CREATE'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        title: 'Frontend',
        slug: 'frontend',
        skills: ['React', 'TypeScript'],
        battleTested: ['React'],
        sortOrder: 2,
      })
    })
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<SkillEditor onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error state on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<SkillEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('shows SAVING... while saving', async () => {
    // Create a promise that we control
    let resolvePromise: () => void
    const savePromise = new Promise<void>((resolve) => { resolvePromise = resolve })
    const onSave = vi.fn().mockReturnValue(savePromise)

    render(<SkillEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('SAVING...')).toBeInTheDocument()
    })

    resolvePromise!()
  })
})
