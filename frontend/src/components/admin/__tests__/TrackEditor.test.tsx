import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TrackEditor from '../TrackEditor'
import type { MusicTrack } from '../../../types/index'

describe('TrackEditor', () => {
  const mockInitial: MusicTrack = {
    id: 'track-1',
    slug: 'soft-spot',
    name: 'Soft Spot',
    genre: 'R&B',
    original: 'Original Artist',
    notes: 'A smooth track',
    fileUrl: 'https://example.com/soft-spot.wav',
    sortOrder: 1,
  }

  it('renders empty form when no initial value', () => {
    render(<TrackEditor onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Slug')).toHaveValue('')
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Genre')).toHaveValue('')
    expect(screen.getByLabelText('Original')).toHaveValue('')
    expect(screen.getByLabelText('Notes')).toHaveValue('')
    expect(screen.getByLabelText('File URL')).toHaveValue('')
    expect(screen.getByLabelText('Sort Order')).toHaveValue(0)
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('pre-fills form when initial value provided', () => {
    render(<TrackEditor initial={mockInitial} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Slug')).toHaveValue('soft-spot')
    expect(screen.getByLabelText('Name')).toHaveValue('Soft Spot')
    expect(screen.getByLabelText('Genre')).toHaveValue('R&B')
    expect(screen.getByLabelText('Original')).toHaveValue('Original Artist')
    expect(screen.getByLabelText('Notes')).toHaveValue('A smooth track')
    expect(screen.getByLabelText('File URL')).toHaveValue('https://example.com/soft-spot.wav')
    expect(screen.getByLabelText('Sort Order')).toHaveValue(1)
    expect(screen.getByText('UPDATE')).toBeInTheDocument()
  })

  it('calls onSave with correct data on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<TrackEditor onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'dream' } })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dream' } })
    fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'Pop' } })
    fireEvent.change(screen.getByLabelText('Original'), { target: { value: 'Artist X' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Dreamy vibes' } })
    fireEvent.change(screen.getByLabelText('File URL'), { target: { value: 'https://example.com/dream.wav' } })
    fireEvent.change(screen.getByLabelText('Sort Order'), { target: { value: '3' } })

    fireEvent.click(screen.getByText('CREATE'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        slug: 'dream',
        name: 'Dream',
        genre: 'Pop',
        original: 'Artist X',
        notes: 'Dreamy vibes',
        fileUrl: 'https://example.com/dream.wav',
        sortOrder: 3,
      })
    })
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<TrackEditor onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error state on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Upload failed'))
    render(<TrackEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('shows SAVING... while saving', async () => {
    let resolvePromise: () => void
    const savePromise = new Promise<void>((resolve) => { resolvePromise = resolve })
    const onSave = vi.fn().mockReturnValue(savePromise)

    render(<TrackEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('SAVING...')).toBeInTheDocument()
    })

    resolvePromise!()
  })
})
