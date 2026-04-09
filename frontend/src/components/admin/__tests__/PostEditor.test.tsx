import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PostEditor from '../PostEditor'
import type { BlogPost } from '../../../types/index'

describe('PostEditor', () => {
  const mockInitial: BlogPost = {
    id: 'post-1',
    slug: 'hello-world',
    title: 'Hello World',
    content: 'This is my first post.',
    preview: 'A brief intro',
    category: 'technical',
    publishedAt: '2024-01-01',
  }

  it('renders empty form when no initial value', () => {
    render(<PostEditor token="test-token" onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Slug')).toHaveValue('')
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Preview')).toHaveValue('')
    expect(screen.getByLabelText('Content (Markdown)')).toHaveValue('')
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('pre-fills form when initial value provided', () => {
    render(<PostEditor token="test-token" initial={mockInitial} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Slug')).toHaveValue('hello-world')
    expect(screen.getByLabelText('Title')).toHaveValue('Hello World')
    expect(screen.getByLabelText('Preview')).toHaveValue('A brief intro')
    expect(screen.getByLabelText('Content (Markdown)')).toHaveValue('This is my first post.')
    expect(screen.getByText('UPDATE')).toBeInTheDocument()
  })

  it('calls onSave with correct data on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<PostEditor token="test-token" onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'my-post' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My Post' } })
    fireEvent.change(screen.getByLabelText('Preview'), { target: { value: 'Quick preview' } })
    fireEvent.change(screen.getByLabelText('Content (Markdown)'), { target: { value: 'Full content here.' } })

    fireEvent.click(screen.getByText('CREATE'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'my-post',
          title: 'My Post',
          preview: 'Quick preview',
          category: 'technical',
        })
      )
      // content is converted from markdown to HTML
      expect(onSave.mock.calls[0][0].content).toContain('Full content here.')
    })
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<PostEditor token="test-token" onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error state on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Forbidden'))
    render(<PostEditor token="test-token" initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument()
    })
  })

  it('shows SAVING... while saving', async () => {
    let resolvePromise: () => void
    const savePromise = new Promise<void>((resolve) => { resolvePromise = resolve })
    const onSave = vi.fn().mockReturnValue(savePromise)

    render(<PostEditor token="test-token" initial={mockInitial} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('UPDATE'))

    await waitFor(() => {
      expect(screen.getByText('SAVING...')).toBeInTheDocument()
    })

    resolvePromise!()
  })
})
