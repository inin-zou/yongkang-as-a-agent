import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DocumentLayout from '../../doc/DocumentLayout'
import { MusicPlayerProvider } from '../../../lib/MusicPlayerContext'
import { useMusicPlayer } from '../../../lib/musicPlayer'

vi.mock('../../../lib/auth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../global/AuthButton', () => ({ default: () => null }))
vi.mock('../../../lib/api', () => ({ fetchBlogPosts: vi.fn(async () => []) }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function StartTrack() {
  const { play } = useMusicPlayer()
  const track = { slug: 'song', name: 'Persistent song', genre: 'R&B', original: 'true', notes: '', fileUrl: '/song.mp3' }
  return <button onClick={() => play(track, [track])}>Start track</button>
}
it('keeps the same audio and player when navigating between public tabs', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const { container } = render(<QueryClientProvider client={new QueryClient()}><MusicPlayerProvider><MemoryRouter initialEntries={['/files/music']}>
    <Routes><Route path="/files/:tab" element={<DocumentLayout />}><Route index element={<StartTrack />} /></Route></Routes>
  </MemoryRouter></MusicPlayerProvider></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Start track' }))
  const audio = container.querySelector('audio')
  const bar = container.querySelector('.music-player-bar')
  expect(screen.getByText('Persistent song')).toBeInTheDocument()
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Directory' })).getByRole('link', { name: 'Contact' }))
  expect(container.querySelector('audio')).toBe(audio)
  expect(container.querySelector('.music-player-bar')).toBe(bar)
  expect(screen.getByText('Persistent song')).toBeInTheDocument()
  expect(play).toHaveBeenCalledTimes(1)
})
