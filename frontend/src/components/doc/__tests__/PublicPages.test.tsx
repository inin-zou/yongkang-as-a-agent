import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MusicPage from '../../../pages/MusicPage'
import MusicPlayerBar from '../../global/MusicPlayerBar'
import ContactPage from '../../../pages/ContactPage'
import { submitContact, fetchBlogPost } from '../../../lib/api'
import MemoryPage from '../../../pages/MemoryPage'
import SkillsView from '../../skill/SkillsView'
import ResumeView from '../../skill/ResumeView'
import HackathonsView from '../../skill/HackathonsView'

vi.mock('../../../hooks/useAdminEdit', () => ({ useAdminEdit: () => ({ isAdmin: false, token: '' }) }))
const player = vi.hoisted(() => ({ currentTrack: { slug: 'song', name: 'A song', genre: 'R&B' }, playing: true, currentTime: 10, duration: 120, repeatMode: 'off', play: vi.fn(), togglePlay: vi.fn(), next: vi.fn(), prev: vi.fn(), seek: vi.fn(), setRepeatMode: vi.fn() }))
vi.mock('../../../lib/musicPlayer', () => ({ useMusicPlayer: () => player }))
vi.mock('../../../lib/auth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../../lib/api', () => ({
  fetchBlogPosts: vi.fn(async () => [
    { id: 'one', slug: 'first', title: '🥉First post', category: 'technical', tags: ['Agents', 'Tauri'], result: '3rd place, solo', publishedAt: '2026-01-01' },
    { id: 'archived', slug: 'old', title: 'Archived writing', category: 'old-category', archived: true, publishedAt: '2026-03-01' },
    { id: 'two', slug: 'second', title: 'Second post', category: 'research', publishedAt: '2026-02-01' },
  ]),
  fetchBlogPost: vi.fn(async () => ({ id: 'one', slug: 'first', title: 'First post', category: 'technical', publishedAt: '2026-01-01', content: '<p>Rendered post prose.</p><figure><img src="/photo.jpg" alt="Sample" /></figure>' })),
  fetchPostStats: vi.fn(async () => ({ likeCount: 0, commentCount: 0, userLiked: false })),
  fetchPostComments: vi.fn(async () => []),
  fetchGuestbook: vi.fn(async () => []),
  submitContact: vi.fn(async () => ({ message: 'Message sent successfully.' })),
  fetchMusic: vi.fn(async () => ({ artistName: 'inhibitor', bio: 'Music biography', platforms: {} })),
  fetchMusicTracks: vi.fn(async () => [{ slug: 'song', name: 'A song', genre: 'R&B', fileUrl: '/song.mp3' }, { slug: 'other', name: 'Another song', genre: 'Lo-Fi', fileUrl: '/other.mp3' }]),
  fetchPage: vi.fn(async () => ({})),
  fetchSkills: vi.fn(async () => [{ title: 'Engineering', skills: ['Go', 'React'], battleTested: ['Project'] }]),
  fetchExperience: vi.fn(async () => [{ role: 'Engineer', company: 'Example', startDate: '2025-01', location: 'Paris', highlights: ['Built a system'], skillAssembled: 'Software' }]),
  fetchHackathons: vi.fn(async () => [{ date: '2026-01', name: 'Example event', city: 'Paris', projectName: 'Example project', domain: 'AI', result: 'Winner' }]),
}))

afterEach(cleanup)
function mount(element: React.ReactNode, path = '/files/skill') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path="/files/:tab/:item?/:sub?" element={element} /></Routes></MemoryRouter></QueryClientProvider>)
}

describe('paper archive pages', () => {
  it('shows domain names and tools as a quiet line', async () => {
    const { container } = mount(<SkillsView />)
    expect(await screen.findByRole('heading', { name: 'Engineering' })).toBeInTheDocument()
    expect(screen.getByText('Go · React')).toBeInTheDocument()
    expect(container.querySelector('.cli-prompt')).toBeNull()
    expect(screen.getByText('29 missions · 14 wins')).toBeInTheDocument()
  })
  it('shows role and company together with experience bullets', async () => {
    mount(<ResumeView />)
    expect(await screen.findByRole('heading', { name: 'Engineer — Example' })).toBeInTheDocument()
    expect(screen.getByText('Built a system')).toBeInTheDocument()
    expect(screen.getByText('Education')).toBeInTheDocument()
  })
  it('groups hackathons by year and retains the curated counts', async () => {
    const { container } = mount(<HackathonsView />)
    expect(await screen.findByRole('heading', { name: '2026' })).toBeInTheDocument()
    expect(within(container.querySelector('.document-year') as HTMLElement).getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('29 missions. 14 wins. Always shipping.')).toBeInTheDocument()
    expect(container.querySelector('.cli-prompt')).toBeNull()
  })
})


describe('paper writing pages', () => {
  it('puts archived posts only in a collapsed archive and hides their categories', async () => {
    const { container } = mount(<MemoryPage />, '/files/memory')
    await screen.findByRole('link', { name: 'First post' })
    const archive = container.querySelector('details.dir-archive')
    expect(archive).not.toBeNull()
    expect(archive).not.toHaveAttribute('open')
    expect(within(archive as HTMLElement).getByText('Archived writing').closest('a')).toHaveAttribute('href', '/files/memory/old-category/old')
    expect(within(screen.getByRole('navigation', { name: 'Writing categories' })).queryByText('old-category')).not.toBeInTheDocument()
    expect(container.querySelectorAll('article')).toHaveLength(2)
  })
  it('shows metadata under the title and omits category when filtered', async () => {
    const { container } = mount(<MemoryPage />, '/files/memory')
    await screen.findByRole('link', { name: 'First post' })
    expect(screen.getByText('technical · Agents, Tauri · 3rd place, solo')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'technical' }))
    expect(await screen.findByText('Agents, Tauri · 3rd place, solo')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'research' }))
    await screen.findByRole('link', { name: 'Second post' })
    expect(container.querySelector('.memory-index-meta')).toBeNull()
  })
  it('keeps archived direct links readable with a quiet marker', async () => {
    vi.mocked(fetchBlogPost).mockResolvedValueOnce({ id: 'archived', slug: 'old', title: 'Archived writing', category: 'technical', archived: true, publishedAt: '2026-01-01', preview: '', content: '<p>Preserved prose.</p>' })
    mount(<MemoryPage />, '/files/memory/technical/old')
    expect(await screen.findByText('Preserved prose.')).toBeInTheDocument()
    expect(screen.getByText('archived')).toBeInTheDocument()
  })
  it('filters writing through category links and returns to all posts', async () => {
    mount(<MemoryPage />, '/files/memory')
    expect(await screen.findByRole('link', { name: 'First post' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Writing categories' })).getByRole('link', { name: 'research' }))
    expect(await screen.findByRole('link', { name: 'Second post' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'First post' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'research' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('link', { name: 'All' }))
    expect(await screen.findByRole('link', { name: 'First post' })).toBeInTheDocument()
  })
  it('renders post HTML through BlogPostContent and retains the lightbox', async () => {
    const { container } = mount(<MemoryPage />, '/files/memory/technical/first')
    expect(await screen.findByText('Rendered post prose.')).toBeInTheDocument()
    expect(container.querySelector('.blog-post-content')).toBeInTheDocument()
    expect(container.querySelector('.post-interactions')).toBeInTheDocument()
    fireEvent.click(screen.getByAltText('Sample'))
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
  it('resolves the guestbook route rather than fetching a post', async () => {
    mount(<MemoryPage />, '/files/memory/guestbook')
    expect(await screen.findByRole('heading', { name: 'Guestbook' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with GitHub to leave a note' })).toBeInTheDocument()
  })
})


describe('paper contact page', () => {
  it('shows links and submits the existing form with live status feedback', async () => {
    mount(<ContactPage />, '/files/contact')
    expect(await screen.findByRole('link', { name: 'CV ↗' })).toHaveAttribute('href', '/files/skill/cv')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Visitor' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'SEND' }))
    expect(await screen.findByText('Message sent successfully.')).toBeInTheDocument()
    expect(document.getElementById('contact-status')).toHaveAttribute('aria-live', 'polite')
    expect(submitContact).toHaveBeenCalledWith({ name: 'Visitor', email: 'visitor@example.com', message: 'Hello', website: '' })
  })
})


describe('paper music', () => {
  it('links track titles and plays from the existing queue', async () => {
    mount(<MusicPage />, '/files/music')
    expect(await screen.findByRole('link', { name: 'A song' })).toHaveAttribute('href', '/files/music/song')
    fireEvent.click(screen.getByRole('button', { name: 'Play Another song' }))
    expect(player.play).toHaveBeenCalledWith(expect.objectContaining({ slug: 'other' }), expect.arrayContaining([expect.objectContaining({ slug: 'song' })]))
    fireEvent.click(screen.getByRole('button', { name: 'Pause A song' }))
    expect(player.togglePlay).toHaveBeenCalled()
  })
  it('keeps time, transport and repeat controls in the persistent bar', () => {
    mount(<MusicPlayerBar />)
    expect(screen.getByText('0:10 / 2:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }))
    expect(player.next).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Repeat: off' }))
    expect(player.setRepeatMode).toHaveBeenCalledWith('all')
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument()
  })
})
