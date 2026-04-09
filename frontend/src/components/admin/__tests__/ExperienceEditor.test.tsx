import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExperienceEditor from '../ExperienceEditor'
import type { Experience } from '../../../types/index'

describe('ExperienceEditor', () => {
  const mockInitial: Experience = {
    role: 'AI Engineer',
    company: 'TechCorp',
    location: 'Paris',
    startDate: '2024-01',
    endDate: '2025-03',
    skillAssembled: 'Built ML pipelines',
    highlights: ['Led team of 5', 'Shipped 3 products'],
    note: 'Great experience',
    sortOrder: 1,
  }

  it('renders empty form when no initial value', () => {
    render(<ExperienceEditor onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Role')).toHaveValue('')
    expect(screen.getByLabelText('Company')).toHaveValue('')
    expect(screen.getByLabelText('Location')).toHaveValue('')
    expect(screen.getByLabelText('Start Date')).toHaveValue('')
    expect(screen.getByLabelText('End Date')).toHaveValue('')
    expect(screen.getByLabelText('Skill Assembled')).toHaveValue('')
    expect(screen.getByLabelText(/Highlights/)).toHaveValue('')
    expect(screen.getByLabelText('Note')).toHaveValue('')
    expect(screen.getByLabelText('Sort Order')).toHaveValue(0)
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('pre-fills form when initial value provided', () => {
    render(<ExperienceEditor initial={mockInitial} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Role')).toHaveValue('AI Engineer')
    expect(screen.getByLabelText('Company')).toHaveValue('TechCorp')
    expect(screen.getByLabelText('Location')).toHaveValue('Paris')
    expect(screen.getByLabelText('Start Date')).toHaveValue('2024-01')
    expect(screen.getByLabelText('End Date')).toHaveValue('2025-03')
    expect(screen.getByLabelText('Skill Assembled')).toHaveValue('Built ML pipelines')
    expect(screen.getByLabelText(/Highlights/)).toHaveValue('Led team of 5\nShipped 3 products')
    expect(screen.getByLabelText('Note')).toHaveValue('Great experience')
    expect(screen.getByLabelText('Sort Order')).toHaveValue(1)
    expect(screen.getByText('UPDATE')).toBeInTheDocument()
  })

  it('calls onSave with correct data on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<ExperienceEditor onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Senior Dev' } })
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'London' } })
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2023-06' } })
    fireEvent.change(screen.getByLabelText('Skill Assembled'), { target: { value: 'Full stack dev' } })
    fireEvent.change(screen.getByLabelText(/Highlights/), { target: { value: 'Built APIs\nDeployed services' } })

    fireEvent.click(screen.getByText('CREATE'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        role: 'Senior Dev',
        company: 'Acme',
        location: 'London',
        startDate: '2023-06',
        endDate: undefined,
        skillAssembled: 'Full stack dev',
        highlights: ['Built APIs', 'Deployed services'],
        note: undefined,
        sortOrder: 0,
      })
    })
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<ExperienceEditor onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error state on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Server error'))
    render(<ExperienceEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows SAVING... while saving', async () => {
    let resolvePromise: () => void
    const savePromise = new Promise<void>((resolve) => { resolvePromise = resolve })
    const onSave = vi.fn().mockReturnValue(savePromise)

    render(<ExperienceEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('SAVING...')).toBeInTheDocument()
    })

    resolvePromise!()
  })
})
