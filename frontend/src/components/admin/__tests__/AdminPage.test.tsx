import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminPage from '../../../pages/AdminPage'

const auth = vi.hoisted(() => ({ user: { id: 'admin' } as { id: string } | null, loading: false, session: { access_token: 'test-token' }, loginWithGitHub: vi.fn() }))
vi.mock('../../../lib/auth', () => ({ useAuth: () => auth }))
vi.mock('../../../lib/supabase', () => ({ supabase: { storage: { from: vi.fn() } } }))

const post = { id: 'one', slug: 'first', title: 'First post', content: '<p>Original prose</p>', preview: 'Preview', category: 'technical', publishedAt: '2026-01-01' }
const track = { slug: 'song', name: 'Song', genre: 'R&B', original: 'true', notes: 'Notes', fileUrl: '/song.mp3', sortOrder: 0 }
let requests: { path: string; method: string; body: unknown }[]
let clients: QueryClient[] = []

beforeEach(() => {
  auth.user = { id: 'admin' }
  auth.loading = false
  requests = []
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    requests.push({ path: parsed.pathname, method, body })
    expect(parsed.searchParams.has('_t')).toBe(true)
    if (method !== 'GET') expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' })
    if (parsed.pathname === '/api/posts') return Response.json([post])
    if (parsed.pathname === '/api/music-tracks') return Response.json([{ id: 'song', ...track }])
    if (parsed.pathname === '/api/admin/feedback') return Response.json([{ id: 'note', name: 'Reader', message: 'Feedback message', createdAt: '2026-01-01' }])
    if (parsed.pathname === '/api/admin/notifications') return Response.json([{ id: 'notice', type: 'comment', message: 'New comment', postId: 'one', isRead: false, createdAt: new Date().toISOString() }])
    if (parsed.pathname === '/api/admin/generate-draft') return Response.json({ slug: 'generated', content: '<p>Generated prose</p>', preview: 'Generated preview' })
    if (parsed.pathname === '/api/admin/refine-draft') return Response.json({ slug: 'refined', content: 'Refined prose', preview: 'Refined preview' })
    return Response.json(body ?? {})
  }))
})
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients = []; vi.unstubAllGlobals(); vi.restoreAllMocks() })

function Destination() { return <p>{useLocation().pathname}</p> }
function mount(path = '/files/admin') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/files/admin/:item?" element={<AdminPage />} />
    <Route path="/files/memory/:category/:slug" element={<Destination />} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('extracted admin routes and forms', () => {
  it('preserves loading and login gates without fetching tab data', () => {
    auth.loading = true
    mount()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(requests).toEqual([])
    cleanup()
    auth.loading = false
    auth.user = null
    mount()
    expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }))
    expect(auth.loginWithGitHub).toHaveBeenCalled()
    expect(requests).toEqual([])
  })

  it('keeps unknown admin sections on posts and preserves AI generation, refinement and publishing', async () => {
    mount('/files/admin/unknown')
    expect(await screen.findByText('First post')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ NEW POST' }))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New title' } })
    fireEvent.change(screen.getByLabelText('Rough Idea'), { target: { value: 'A rough idea' } })
    fireEvent.click(screen.getByRole('button', { name: 'GENERATE WITH AI' }))
    expect(await screen.findByLabelText('Slug')).toHaveValue('generated')
    fireEvent.click(screen.getByRole('button', { name: 'REFINE WITH AI' }))
    await waitFor(() => expect(screen.getByLabelText('Slug')).toHaveValue('refined'))
    fireEvent.click(screen.getByRole('button', { name: 'PUBLISH' }))
    expect(await screen.findByRole('button', { name: '+ NEW POST' })).toBeInTheDocument()
    expect(requests).toContainEqual({ path: '/api/admin/generate-draft', method: 'POST', body: { title: 'New title', category: 'technical', roughIdea: 'A rough idea' } })
    expect(requests).toContainEqual({ path: '/api/admin/refine-draft', method: 'POST', body: { title: 'New title', category: 'technical', existingContent: 'Generated prose' } })
    expect(requests).toContainEqual({ path: '/api/admin/posts', method: 'POST', body: { title: 'New title', slug: 'refined', category: 'technical', content: '<p>Refined prose</p>', preview: 'Refined preview' } })
    expect(requests.filter(r => r.path === '/api/posts')).toHaveLength(2)
  })

  it('keeps existing post editing and markdown conversion', async () => {
    mount('/files/admin/posts')
    fireEvent.click(await screen.findByRole('button', { name: 'EDIT' }))
    expect(screen.getByLabelText('Title')).toHaveValue('First post')
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } })
    fireEvent.click(screen.getByRole('button', { name: 'UPDATE' }))
    expect(await screen.findByRole('button', { name: '+ NEW POST' })).toBeInTheDocument()
    expect(requests).toContainEqual({ path: '/api/admin/posts/one', method: 'PUT', body: { title: 'Updated title', slug: 'first', category: 'technical', content: '<p>Original prose</p>', preview: 'Preview' } })
  })

  it('edits music through the existing upload-capable admin form', async () => {
    mount('/files/admin/music')
    fireEvent.click(await screen.findByRole('button', { name: 'EDIT' }))
    expect(screen.getByLabelText('Track Name')).toHaveValue('Song')
    expect(screen.getByRole('button', { name: 'REPLACE FILE' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Track Name'), { target: { value: 'Updated song' } })
    fireEvent.click(screen.getByRole('button', { name: 'UPDATE' }))
    expect(await screen.findByRole('button', { name: '+ NEW TRACK' })).toBeInTheDocument()
    expect(requests).toContainEqual({ path: '/api/admin/music-tracks/song', method: 'PUT', body: { ...track, name: 'Updated song' } })
  })

  it('deletes feedback and refetches its tab', async () => {
    mount('/files/admin/feedback')
    expect(await screen.findByText('Feedback message')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'DELETE' }))
    await waitFor(() => expect(requests.filter(r => r.path === '/api/admin/feedback')).toHaveLength(2))
    expect(requests).toContainEqual({ path: '/api/admin/feedback/note', method: 'DELETE', body: undefined })
  })

  it('marks notifications read and preserves the destination URL', async () => {
    mount('/files/admin/notifications')
    fireEvent.click(await screen.findByRole('button', { name: 'MARK ALL READ' }))
    await waitFor(() => expect(requests.filter(r => r.path === '/api/admin/notifications')).toHaveLength(2))
    expect(requests).toContainEqual({ path: '/api/admin/notifications/read-all', method: 'PUT', body: undefined })
    fireEvent.click(screen.getByText('New comment'))
    expect(await screen.findByText('/files/memory/technical/first')).toBeInTheDocument()
    expect(requests).toContainEqual({ path: '/api/admin/notifications/notice/read', method: 'PUT', body: undefined })
  })
})
