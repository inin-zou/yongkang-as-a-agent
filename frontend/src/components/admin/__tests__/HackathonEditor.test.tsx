import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HackathonEditor from '../HackathonEditor'
import type { Hackathon } from '../../../types/index'

describe('HackathonEditor', () => {
  const mockInitial: Hackathon = {
    date: '2024.03',
    name: 'AI Hackathon',
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    isRemote: false,
    projectName: 'SmartBot',
    projectSlug: 'smart-bot',
    projectUrl: 'https://example.com',
    result: '1st Place',
    solo: true,
    domain: 'AI/ML',
  }

  it('renders empty form when no initial value', () => {
    render(<HackathonEditor onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Date')).toHaveValue('')
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('City')).toHaveValue('')
    expect(screen.getByLabelText('Country')).toHaveValue('')
    expect(screen.getByLabelText('Latitude')).toHaveValue(0)
    expect(screen.getByLabelText('Longitude')).toHaveValue(0)
    expect(screen.getByLabelText('Remote')).not.toBeChecked()
    expect(screen.getByLabelText('Project Name')).toHaveValue('')
    expect(screen.getByLabelText('Project Slug')).toHaveValue('')
    expect(screen.getByLabelText('Project URL')).toHaveValue('')
    expect(screen.getByLabelText('Result')).toHaveValue('')
    expect(screen.getByLabelText('Solo')).not.toBeChecked()
    expect(screen.getByLabelText('Domain')).toHaveValue('')
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('pre-fills form when initial value provided', () => {
    render(<HackathonEditor initial={mockInitial} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Date')).toHaveValue('2024.03')
    expect(screen.getByLabelText('Name')).toHaveValue('AI Hackathon')
    expect(screen.getByLabelText('City')).toHaveValue('Paris')
    expect(screen.getByLabelText('Country')).toHaveValue('France')
    expect(screen.getByLabelText('Latitude')).toHaveValue(48.8566)
    expect(screen.getByLabelText('Longitude')).toHaveValue(2.3522)
    expect(screen.getByLabelText('Remote')).not.toBeChecked()
    expect(screen.getByLabelText('Project Name')).toHaveValue('SmartBot')
    expect(screen.getByLabelText('Project Slug')).toHaveValue('smart-bot')
    expect(screen.getByLabelText('Project URL')).toHaveValue('https://example.com')
    expect(screen.getByLabelText('Result')).toHaveValue('1st Place')
    expect(screen.getByLabelText('Solo')).toBeChecked()
    expect(screen.getByLabelText('Domain')).toHaveValue('AI/ML')
    expect(screen.getByText('UPDATE')).toBeInTheDocument()
  })

  it('calls onSave with correct data on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<HackathonEditor onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025.01' } })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Web Summit' } })
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'WebApp' } })
    fireEvent.change(screen.getByLabelText('Domain'), { target: { value: 'Web' } })

    fireEvent.click(screen.getByText('CREATE'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        date: '2025.01',
        name: 'Web Summit',
        projectName: 'WebApp',
        domain: 'Web',
        isRemote: false,
        solo: false,
      }))
    })
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<HackathonEditor onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error state on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Timeout'))
    render(<HackathonEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument()
    })
  })

  it('shows SAVING... while saving', async () => {
    let resolvePromise: () => void
    const savePromise = new Promise<void>((resolve) => { resolvePromise = resolve })
    const onSave = vi.fn().mockReturnValue(savePromise)

    render(<HackathonEditor initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('SAVING...')).toBeInTheDocument()
    })

    resolvePromise!()
  })

  it('handles checkbox toggles correctly', () => {
    render(<HackathonEditor onSave={vi.fn()} onCancel={vi.fn()} />)

    const remoteCheckbox = screen.getByLabelText('Remote')
    const soloCheckbox = screen.getByLabelText('Solo')

    fireEvent.click(remoteCheckbox)
    expect(remoteCheckbox).toBeChecked()

    fireEvent.click(soloCheckbox)
    expect(soloCheckbox).toBeChecked()
  })
})
