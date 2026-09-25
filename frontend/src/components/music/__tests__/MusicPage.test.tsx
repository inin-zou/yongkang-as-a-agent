import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MusicPage from '../../../pages/MusicPage'

vi.mock('../../../hooks/useAdminEdit', () => ({ useAdminEdit: () => ({ isAdmin: true, token: 'test-token' }) }))
vi.mock('../../../lib/auth', () => ({ useAuth: () => ({ user: null, githubUsername: '' }) }))
const player = vi.hoisted(() => ({ currentTrack: null, playing: false, currentTime: 0, duration: 0, play: vi.fn(), togglePlay: vi.fn(), seek: vi.fn() }))
vi.mock('../../../lib/musicPlayer', () => ({ useMusicPlayer: () => player }))

const track = { id: 'song', slug: 'song', name: 'Song', genre: 'R&B', original: 'original', notes: 'Production notes', fileUrl: '/song.mp3', sortOrder: 0 }
let clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients = []; vi.unstubAllGlobals(); vi.clearAllMocks() })

function mount(path = '/files/music') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  return {
    client,
    ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/files/music/:item?" element={<MusicPage />} />
    </Routes></MemoryRouter></QueryClientProvider>),
  }
}

it('preserves profile fields, save errors and direct cache updates in the extracted editor', async () => {
  let saveFails = true
  let profileReads = 0
  let saved: unknown
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url, 'http://localhost').pathname
    if (path === '/api/music-tracks') return Response.json([track])
    if (path === '/api/music') return Response.json({ artistName: 'API artist', genre: 'Lo-Fi', bio: '', status: '', location: '', platforms: { Bandcamp: 'https://example.com/music' } })
    if (path === '/api/pages/music') {
      profileReads++
      return Response.json({ artistName: 'Profile artist', genre: 'R&B', bio: 'Biography', status: 'Recording', location: 'Paris' })
    }
    if (path === '/api/admin/pages/music') {
      expect(init?.method).toBe('PUT')
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' })
      saved = JSON.parse(init?.body as string)
      return saveFails ? new Response('', { status: 500 }) : Response.json(saved)
    }
    throw new Error(`Unexpected request: ${url}`)
  }))
  const { client } = mount()
  expect(await screen.findByText('Profile artist — R&B')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'EDIT' }))
  expect(screen.getByLabelText('Artist Name')).toHaveValue('Profile artist')
  const changes = { 'Artist Name': 'Edited artist', Genre: 'Ambient', Bio: 'Edited biography', Status: 'On tour', Location: 'London' }
  for (const [label, value] of Object.entries(changes)) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
  expect(await screen.findByText('API error: 500')).toBeInTheDocument()
  expect(screen.getByLabelText('Artist Name')).toHaveValue('Edited artist')
  saveFails = false
  fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
  expect(await screen.findByText('Edited artist — Ambient')).toBeInTheDocument()
  expect(screen.getByText('Edited biography')).toBeInTheDocument()
  expect(screen.getByText('On tour · London')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Song' })).toHaveAttribute('href', '/files/music/song')
  expect(saved).toEqual({ artistName: 'Edited artist', genre: 'Ambient', bio: 'Edited biography', status: 'On tour', location: 'London' })
  expect(client.getQueryData(['pages', 'music'])).toEqual(saved)
  expect(profileReads).toBe(1)
})

it('keeps track detail playback, waveform requests, real stats and track editing', async () => {
  let saved: unknown
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    requests.push(url)
    const path = new URL(url, 'http://localhost').pathname
    if (path === '/api/music-tracks') return Response.json([track])
    if (path === '/song.mp3') return new Response(new Uint8Array())
    if (path.endsWith('/stats')) return Response.json({ likeCount: 9, commentCount: 1, userLiked: false })
    if (path.endsWith('/comments')) return Response.json([])
    if (path === '/api/admin/music-tracks/song') {
      saved = JSON.parse(init?.body as string)
      return Response.json(saved)
    }
    throw new Error(`Unexpected request: ${url}`)
  }))
  const { container } = mount('/files/music/song')
  expect(await screen.findByRole('heading', { name: 'Song' })).toBeInTheDocument()
  expect(await screen.findByText('9')).toBeInTheDocument()
  expect(screen.getByText('1 comment')).toBeInTheDocument()
  expect(screen.getByText('Production notes')).toBeInTheDocument()
  await waitFor(() => expect(container.querySelectorAll('.music-waveform-bar')).toHaveLength(100))
  expect(requests).toContain('/song.mp3')
  fireEvent.click(screen.getByRole('button', { name: 'Play' }))
  expect(player.play).toHaveBeenCalledWith(track, [track])
  fireEvent.click(screen.getByRole('button', { name: 'EDIT' }))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Edited song' } })
  fireEvent.click(screen.getByRole('button', { name: 'UPDATE' }))
  await waitFor(() => expect(saved).toEqual({ slug: 'song', name: 'Edited song', genre: 'R&B', original: 'original', notes: 'Production notes', fileUrl: '/song.mp3', sortOrder: 0 }))
  // The editor closes only after the track list refetch settles.
  await waitFor(() => expect(screen.queryByRole('button', { name: 'UPDATE' })).toBeNull(), { timeout: 5000 })
  expect(screen.getByText('Production notes')).toBeInTheDocument()
})

it('names the playing track in the tab on the music list', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = new URL(url, 'http://localhost').pathname
    if (path === '/api/music-tracks') return Response.json([track])
    return Response.json({})
  }))
  Object.assign(player, { currentTrack: track, playing: true })
  try {
    const { rerender } = mount()
    await waitFor(() => expect(document.title).toBe('Song — inhibitor'))
    Object.assign(player, { playing: false })
    rerender(<QueryClientProvider client={clients[0]}><MemoryRouter initialEntries={['/files/music']}><Routes>
      <Route path="/files/music/:item?" element={<MusicPage />} />
    </Routes></MemoryRouter></QueryClientProvider>)
    await waitFor(() => expect(document.title).toBe('Music — inhibitor'))
  } finally {
    Object.assign(player, { currentTrack: null, playing: false })
  }
})
