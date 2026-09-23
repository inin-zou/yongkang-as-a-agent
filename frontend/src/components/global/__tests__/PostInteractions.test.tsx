import { queryKeys } from '../../../lib/queryKeys'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PostInteractions from '../PostInteractions'

vi.mock('../../../lib/auth', () => ({ useAuth: () => ({ user: null, githubUsername: '' }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it.each([400, 401, 403, 404, 429])('does not retry music stats on %s, shows zero, and accepts later real stats', async status => {
  let recovered = false
  let statsRequests = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/stats?')) {
      statsRequests++
      return recovered
        ? new Response(JSON.stringify({ likeCount: 7, commentCount: 2, userLiked: true }))
        : new Response('', { status, statusText: 'Client Error' })
    }
    return new Response('[]')
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  render(<QueryClientProvider client={client}><PostInteractions slug="music-song" /></QueryClientProvider>)
  await waitFor(() => expect(client.getQueryState(['post-stats', 'music-song', ''])?.status).toBe('error'))
  expect(statsRequests).toBe(1)
  expect(screen.getByText('0')).toBeInTheDocument()
  expect(screen.getByText('0 comments')).toBeInTheDocument()
  recovered = true
  await client.invalidateQueries({ queryKey: queryKeys.postStats('music-song') })
  expect(await screen.findByText('7')).toBeInTheDocument()
  expect(screen.getByText('2 comments')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Unlike' })).toBeInTheDocument()
  client.clear()
})

it.each(['server', 'network', 'ordinary-post'] as const)('preserves retries for %s failures', async failure => {
  let attempts = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!url.includes('/stats?')) return new Response('[]')
    attempts++
    if (failure === 'network') throw new TypeError('Failed to fetch')
    return new Response('', { status: failure === 'server' ? 503 : 404 })
  }))
  const slug = failure === 'ordinary-post' ? 'post' : 'music-song'
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  render(<QueryClientProvider client={client}><PostInteractions slug={slug} /></QueryClientProvider>)
  await waitFor(() => expect(client.getQueryState(['post-stats', slug, ''])?.status).toBe('error'))
  expect(attempts).toBe(4)
  client.clear()
})
