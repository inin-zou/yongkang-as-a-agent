import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DraftCreator from '../DraftCreator'
import { createBlogPost, updateBlogPost } from '../../../lib/api'
import type { BlogPost } from '../../../types'

vi.mock('../../../lib/auth', () => ({ useAuth: () => ({ session: { access_token: 'test-token' } }) }))
vi.mock('../../../lib/api', () => ({
  createBlogPost: vi.fn().mockResolvedValue({}),
  updateBlogPost: vi.fn().mockResolvedValue({}),
}))

function mount(initial?: BlogPost) {
  return render(<QueryClientProvider client={new QueryClient()}>
    <DraftCreator onDone={vi.fn()} initial={initial} />
  </QueryClientProvider>)
}

describe('DraftCreator metadata', () => {
  it('retains metadata through draft creation and sends it on publish', async () => {
    mount()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New post' } })
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'Agents, Tauri' } })
    fireEvent.change(screen.getByLabelText('Result'), { target: { value: '€87K early funding' } })
    fireEvent.click(screen.getByText('SKIP AI'))
    expect(screen.getByLabelText('Tags')).toHaveValue('Agents, Tauri')
    expect(screen.getByLabelText('Result')).toHaveValue('€87K early funding')
    fireEvent.click(screen.getByText('PUBLISH'))
    await waitFor(() => expect(createBlogPost).toHaveBeenCalledWith('test-token', expect.objectContaining({
      tags: ['Agents', 'Tauri'], result: '€87K early funding',
    })))
  })

  it('pre-fills metadata and sends empty strings to clear it on update', async () => {
    mount({ id: 'one', slug: 'post', title: 'Post', preview: '', content: '', category: 'technical',
      publishedAt: '2026-01-01', tags: ['Quantum Computing'], result: 'Winner' })
    expect(screen.getByLabelText('Tags')).toHaveValue('Quantum Computing')
    expect(screen.getByLabelText('Result')).toHaveValue('Winner')
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Result'), { target: { value: '' } })
    fireEvent.click(screen.getByText('UPDATE'))
    await waitFor(() => expect(updateBlogPost).toHaveBeenCalledWith('test-token', 'one', expect.objectContaining({
      tags: [], result: '',
    })))
  })
})
