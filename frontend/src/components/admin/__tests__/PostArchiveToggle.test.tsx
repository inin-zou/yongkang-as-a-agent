import { queryKeys } from '../../../lib/queryKeys'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import PostArchiveToggle from '../PostArchiveToggle'
import { fetchBlogPost, fetchBlogPosts } from '../../../lib/api'
import type { BlogPost } from '../../../types'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const initial: BlogPost = { id: 'one', slug: 'first', title: 'First', content: '<p>Prose</p>', preview: '', category: 'technical', publishedAt: '2026-01-01', archived: false }

function Harness() {
  const { data } = useQuery({ queryKey: queryKeys.adminPosts(), queryFn: fetchBlogPosts })
  const publicPosts = useQuery({ queryKey: queryKeys.posts(), queryFn: fetchBlogPosts })
  const direct = useQuery({ queryKey: queryKeys.post('first'), queryFn: () => fetchBlogPost('first') })
  return <>{data && <PostArchiveToggle post={data[0]} token="test-token" />}
    <p>Public: {String(publicPosts.data?.[0].archived)}</p>
    <p>Direct: {String(direct.data?.archived)}</p>
  </>
}

describe('archive toggle', () => {
  it('archives and unarchives, refreshing admin, public and direct post data', async () => {
    let stored = { ...initial }
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain('?_t=')
      if (init?.method === 'PUT') {
        expect(url).toContain('/api/admin/posts/one/archive?')
        expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' })
        const body = JSON.parse(init.body as string)
        // Archive-only payload: content and dates are never resent.
        expect(Object.keys(body)).toEqual(['archived'])
        stored = { ...stored, ...body }
      }
      return { ok: true, json: async () => url.includes('/posts?') ? [{ ...stored }] : { ...stored } }
    }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))
    expect(await screen.findByText('Public: true')).toBeInTheDocument()
    expect(await screen.findByText('Direct: true')).toBeInTheDocument()
    const unarchive = await screen.findByRole('button', { name: 'Unarchive' })
    await waitFor(() => expect(unarchive).toBeEnabled())
    fireEvent.click(unarchive)
    expect(await screen.findByText('Public: false')).toBeInTheDocument()
    expect(await screen.findByText('Direct: false')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('shows failures without changing archive state and allows retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    const client = new QueryClient()
    render(<QueryClientProvider client={client}><PostArchiveToggle post={initial} token="test-token" /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update archive status')
    expect(screen.getByRole('button', { name: 'Archive' })).toBeEnabled()
  })
})
