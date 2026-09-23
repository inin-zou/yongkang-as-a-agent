import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FileSystemLayout from '../../global/FileSystemLayout'
import Layout from '../../global/Layout'
import SoulPage from '../../../pages/SoulPage'
import { useAdminEdit } from '../../../hooks/useAdminEdit'
import { updatePage } from '../../../lib/api'

const player = vi.hoisted(() => ({ currentTrack: null as { slug: string } | null, playing: false, currentTime: 0, duration: 0, play: vi.fn(), togglePlay: vi.fn() }))
vi.mock('../../../lib/MusicPlayerContext', () => ({ useMusicPlayer: () => player }))
vi.mock('../../../hooks/useAdminEdit', () => ({ useAdminEdit: vi.fn(() => ({ isAdmin: false, token: '' })) }))
vi.mock('../../../lib/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../global/AuthButton', () => ({ default: () => null }))
vi.mock('../../global/MusicPlayerBar', () => ({ default: () => <div data-testid="player" /> }))
vi.mock('../../global/PrismaticBackground', () => ({ default: () => <div data-testid="old-background" /> }))
vi.mock('../../global/NoiseOverlay', () => ({ default: () => <div data-testid="old-noise" /> }))
vi.mock('../../../lib/api', () => ({
  fetchPage: vi.fn(async () => ({ subtitle: 'AI Engineer · Paris', bio: ['A saved biography.', 'A second paragraph.'], currently: 'Building something real.', customField: 'preserve me' })),
  fetchBlogPosts: vi.fn(async () => [
    { id: 'oldest', slug: 'oldest', title: 'Oldest writing', category: 'technical', content: '', preview: '', publishedAt: '2024-01-01' },
    { id: 'third', slug: 'third', title: 'Third writing', category: 'technical', content: '', preview: '', publishedAt: '2025-01-01' },
    { id: 'older', slug: 'older', title: 'Older writing', category: 'technical', content: '', preview: '', publishedAt: '2026-01-01' },
    { id: 'newer', slug: 'newer', title: 'Latest writing', category: 'research', content: '', publishedAt: '2026-04-20', preview: 'A writing preview.' },
  ]),
  fetchMusicTracks: vi.fn(async () => [{ slug: 'light', name: 'Light', genre: 'Lo-fi', original: 'Original', notes: '', fileUrl: '/light.mp3' }]),
  fetchViews: vi.fn(async () => ({ views: 0 })),
  updatePage: vi.fn(async (_token, _id, data) => data),
}))

function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.hash}</output> }

function mount(path: string, soul = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <Location /><Routes><Route path="/files/:tab" element={<Layout><FileSystemLayout /></Layout>}>
      <Route index element={soul ? <SoulPage /> : <p>Existing page</p>} />
      <Route path=":item" element={soul ? <SoulPage /> : <p>Existing page</p>} />
      <Route path=":item/:sub" element={<p>Existing post</p>} />
    </Route></Routes>
  </MemoryRouter></QueryClientProvider>)
}

afterEach(cleanup)
beforeEach(() => { vi.mocked(useAdminEdit).mockReturnValue({ isAdmin: false, token: '' }); vi.clearAllMocks(); window.scrollTo = vi.fn(); Element.prototype.scrollIntoView = vi.fn(); player.currentTrack = null; player.playing = false })

describe('SOUL document boundary', () => {
  it('uses the open document shell for SOUL', () => {
    const { container } = mount('/files/soul')
    expect(container.querySelector('.document-layout')).toBeInTheDocument()
    expect(screen.getByTestId('player')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Scroll down' })).not.toBeInTheDocument()
    expect(container.querySelector('.app-window')).not.toBeInTheDocument()
    expect(screen.queryByTestId('old-background')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'my story ↗' })).toHaveAttribute('href', '/')
  })
  it.each(['skill', 'memory', 'contact', 'music', 'admin'])('uses the document for %s', tab => {
    const { container } = mount(`/files/${tab}`)
    expect(container.querySelector('.app-window')).not.toBeInTheDocument()
    expect(container.querySelector('.document-layout')).toBeInTheDocument()
    expect(screen.getByTestId('player')).toBeInTheDocument()
    expect(screen.queryByTestId('old-background')).not.toBeInTheDocument()
  })
  it('keeps the shared shell when leaving SOUL', () => {
    const { container } = mount('/files/soul')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'music' }))
    expect(container.querySelector('.document-layout')).toBeInTheDocument()
    expect(screen.getByTestId('player')).toBeInTheDocument()
    expect(container.querySelector('.app-window')).not.toBeInTheDocument()
    expect(screen.queryByTestId('old-background')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'SOUL.md' }))
    expect(container.querySelector('.document-layout')).toBeInTheDocument()
    expect(screen.getByTestId('player')).toBeInTheDocument()
    expect(screen.queryByTestId('old-background')).not.toBeInTheDocument()
  })
  it('starts each SOUL destination at the top', () => {
    mount('/files/soul')
    vi.mocked(window.scrollTo).mockClear()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Directory' })).getByRole('link', { name: 'MUSIC.md' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })
  it.each([['soul', 'SOUL.md'], ['skill', 'Skills'], ['skill/experience', 'Experience'], ['skill/hackathons', 'Hackathons'], ['contact', 'Contact'], ['memory', 'Writing'], ['memory/guestbook', 'Guestbook'], ['music', 'MUSIC.md']])('marks only the current directory entry at %s', (segment, label) => {
    mount(`/files/${segment}`)
    const directory = screen.getByRole('navigation', { name: 'Directory' })
    expect(within(directory).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    expect(directory.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
  })
  it('marks a post category active in the directory', async () => {
    mount('/files/memory/research/newer')
    const directory = screen.getByRole('navigation', { name: 'Directory' })
    expect(await within(directory).findByRole('link', { name: 'research' })).toHaveAttribute('aria-current', 'page')
    expect(directory.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
  })
  it('opens Index and resets its disclosure after navigation', () => {
    const { container } = mount('/files/soul')
    // jsdom uses desktop CSS; exercise the disclosure without claiming viewport QA.
    const toggle = container.querySelector<HTMLButtonElement>('.soul-index-toggle')!
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Directory' })).getByRole('link', { name: 'MUSIC.md' }))
    expect(container.querySelector('.soul-index-toggle')).toHaveAttribute('aria-expanded', 'false')
  })
  it('exposes archive destinations with a keyboard-native disclosure', () => {
    mount('/files/soul')
    expect(screen.getByText('+ MORE / ARCHIVE').closest('details')).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('+ MORE / ARCHIVE'))
    expect(screen.getByText('+ MORE / ARCHIVE').closest('details')).toHaveAttribute('open')
    expect(screen.getByRole('link', { name: 'Graph' })).toHaveAttribute('href', '/files/soul/graph')
  })
})

describe('SOUL pages', () => {
  it('shows the three hand-picked selected works without redundant decoration', async () => {
    const { container } = mount('/files/soul', true)
    expect(await screen.findByRole('link', { name: 'Codex Privacy HUD' })).toHaveAttribute('href', 'https://github.com/inin-zou/codex-privacy-hud')
    expect(screen.getByRole('link', { name: 'Clio' })).toHaveAttribute('href', 'https://github.com/inin-zou/Clio')
    expect(screen.getByRole('link', { name: 'KernelGen' })).toHaveAttribute('href', 'https://github.com/inin-zou/kernelgen-challenge')
    expect(container.querySelectorAll('.soul-project-row')).toHaveLength(3)
    expect(screen.queryByText('View project ↗')).not.toBeInTheDocument()
    expect(container.querySelector('.soul-accent-rule, .soul-section-index, .soul-eyebrow, .soul-journey-rail')).not.toBeInTheDocument()
    for (const id of ['hero', 'work', 'writing', 'background', 'music']) expect(container.querySelector('#' + id)).toBeInTheDocument()
    for (const [name, href] of [['Epiminds', 'https://epiminds.com/'], ['Mozart AI', 'https://mozartai.com/']]) {
      for (const link of screen.getAllByRole('link', { name })) {
        expect(link).toHaveAttribute('href', href)
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noreferrer')
      }
    }
    expect(screen.queryByRole('link', { name: 'JOURNEY' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'In progress' })).not.toBeInTheDocument()
  })
  it('renders saved copy and latest writing first', async () => {
    mount('/files/soul', true)
    expect(await screen.findByText('A saved biography.')).toBeInTheDocument()
    const posts = screen.getAllByRole('link', { name: /Latest writing|Older writing|Third writing/ })
    expect(posts.map(post => post.textContent)).toEqual(['Latest writing', 'Older writing', 'Third writing'])
    expect(screen.queryByText('Oldest writing')).not.toBeInTheDocument()
    expect(screen.getByText('A writing preview.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Older writing' }).closest('article')).toHaveTextContent('technical')
    expect(posts[0]).toHaveAttribute('href', '/files/memory/research/newer')
    expect(screen.queryByRole('button', { name: 'EDIT' })).not.toBeInTheDocument()
  })
  it('keeps admin editing and saves new copy without dropping existing fields', async () => {
    vi.mocked(useAdminEdit).mockReturnValue({ isAdmin: true, token: '' })
    mount('/files/soul', true)
    await screen.findByText('A saved biography.')
    fireEvent.click(screen.getByRole('button', { name: 'EDIT' }))
    fireEvent.change(screen.getByLabelText('Bio (paragraph 1)'), { target: { value: 'Updated lead.' } })
    fireEvent.change(screen.getByLabelText('Currently'), { target: { value: 'New experiments.' } })
    expect(screen.getByLabelText('Domains (tree text)')).toBeInTheDocument()
    expect(screen.getByLabelText('Speed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(await screen.findByText('Updated lead.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('New experiments.')).toBeInTheDocument()
    expect(updatePage).toHaveBeenCalledWith('', 'soul', expect.objectContaining({ customField: 'preserve me', bio: ['Updated lead.', 'A second paragraph.'] }))
  })
  it.each([['journey', '/files/soul'], ['in-progress', '/files/soul'], ['projects', '/files/soul#work']])('redirects %s', async (item, destination) => {
    mount('/files/soul/' + item, true)
    await screen.findByText('A saved biography.')
    expect(screen.getByTestId('location').textContent).toBe(destination)
    expect(screen.getByRole('heading', { name: 'Yongkang Zou' })).toBeInTheDocument()
  })
  it('scrolls hash links including repeated clicks on the same section', async () => {
    mount('/files/soul', true)
    await screen.findByText('A saved biography.')
    const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }))
    fireEvent.click(nav.getByRole('link', { name: 'work' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/files/soul#work')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    vi.mocked(Element.prototype.scrollIntoView).mockClear()
    fireEvent.click(nav.getByRole('link', { name: 'work' }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    fireEvent.click(nav.getByRole('link', { name: 'about' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/files/soul#background')
  })
  it('plays the featured track through the global player', async () => {
    mount('/files/soul', true)
    fireEvent.click(await screen.findByRole('button', { name: 'Play Light' }))
    expect(player.play).toHaveBeenCalledWith(expect.objectContaining({ slug: 'light' }), [expect.objectContaining({ slug: 'light' })])
  })
  it('pauses the featured track when it is already playing', async () => {
    player.currentTrack = { slug: 'light' }
    player.playing = true
    mount('/files/soul', true)
    fireEvent.click(await screen.findByRole('button', { name: 'Pause Light' }))
    expect(player.togglePlay).toHaveBeenCalledOnce()
    expect(player.play).not.toHaveBeenCalled()
  })
})
