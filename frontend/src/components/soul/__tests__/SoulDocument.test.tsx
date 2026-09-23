import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FileSystemLayout from '../../global/FileSystemLayout'
import Layout from '../../global/Layout'
import SoulPage from '../../../pages/SoulPage'
import { useAdminEdit } from '../../../hooks/useAdminEdit'
import { fetchProjectStatuses, updatePage } from '../../../lib/api'

vi.mock('../../../hooks/useAdminEdit', () => ({ useAdminEdit: vi.fn(() => ({ isAdmin: false, token: '' })) }))
vi.mock('../../../lib/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../global/AuthButton', () => ({ default: () => null }))
vi.mock('../../global/MusicPlayerBar', () => ({ default: () => <div data-testid="player" /> }))
vi.mock('../../global/PrismaticBackground', () => ({ default: () => <div data-testid="old-background" /> }))
vi.mock('../../global/NoiseOverlay', () => ({ default: () => <div data-testid="old-noise" /> }))
vi.mock('../../../lib/api', () => ({
  fetchPage: vi.fn(async () => ({ subtitle: 'AI Engineer · Paris', bio: ['A saved biography.', 'A second paragraph.'], currently: 'Building something real.', customField: 'preserve me' })),
  fetchProjects: vi.fn(async () => [{ slug: 'real-project', title: 'Real project', description: 'An API description.', tags: ['Audio'], category: 'side', date: '2026-04-01', codeUrl: 'https://github.com/example/project' }]),
  fetchBlogPosts: vi.fn(async () => [
    { id: 'older', slug: 'older', title: 'Older writing', category: 'technical', publishedAt: '2026-01-01' },
    { id: 'newer', slug: 'newer', title: 'Latest writing', category: 'research', publishedAt: '2026-04-20' },
  ]),
  fetchMusicTracks: vi.fn(async () => []),
  fetchViews: vi.fn(async () => ({ views: 0 })),
  fetchProjectStatuses: vi.fn(async () => []),
  createProjectStatus: vi.fn(), updateProjectStatus: vi.fn(), deleteProjectStatus: vi.fn(),
  updatePage: vi.fn(async (_token, _id, data) => data),
}))

function mount(path: string, soul = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/files/:tab" element={<Layout><FileSystemLayout /></Layout>}>
      <Route index element={soul ? <SoulPage /> : <p>Existing page</p>} />
      <Route path=":item" element={soul ? <SoulPage /> : <p>Existing page</p>} />
      <Route path=":item/:sub" element={<p>Existing post</p>} />
    </Route></Routes>
  </MemoryRouter></QueryClientProvider>)
}

afterEach(cleanup)
beforeEach(() => { vi.mocked(useAdminEdit).mockReturnValue({ isAdmin: false, token: '' }); vi.clearAllMocks(); window.scrollTo = vi.fn() })

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
    fireEvent.click(screen.getByRole('link', { name: 'README' }))
    expect(container.querySelector('.document-layout')).toBeInTheDocument()
    expect(screen.getByTestId('player')).toBeInTheDocument()
    expect(screen.queryByTestId('old-background')).not.toBeInTheDocument()
  })
  it('starts each SOUL destination at the top', () => {
    mount('/files/soul')
    vi.mocked(window.scrollTo).mockClear()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Directory' })).getByRole('link', { name: 'JOURNEY' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })
  it.each([['soul', 'README'], ['soul/journey', 'JOURNEY'], ['soul/projects', 'Selected projects'], ['soul/in-progress', 'In progress'], ['skill', 'Skills'], ['skill/resume', 'Resume'], ['skill/hackathons', 'Hackathons'], ['contact', 'Contact'], ['memory', 'Writing'], ['memory/guestbook', 'Guestbook'], ['music', 'MUSIC.md']])('marks only the current directory entry at %s', (segment, label) => {
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
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Directory' })).getByRole('link', { name: 'JOURNEY' }))
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
    expect(screen.getByRole('link', { name: 'Journey: Nanjing to Paris' })).toHaveAttribute('href', '/files/soul/journey')
  })
  it('presents projects as a minimal list and preserves the full edit form', async () => {
    vi.mocked(useAdminEdit).mockReturnValue({ isAdmin: true, token: '' })
    vi.mocked(fetchProjectStatuses).mockResolvedValueOnce([{ id: 'project', name: 'Editable project', status: 'ACTIVE', description: 'Description', nextStep: 'Release', links: '', sortOrder: 7 }])
    const { container } = mount('/files/soul/projects', true)
    await screen.findByText('Editable project')
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
    expect(screen.getByText('Next: Release')).toBeInTheDocument()
    expect(container.querySelector('.cli-block, .cli-status-row')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'EDIT' }))
    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByLabelText('Description')).toHaveValue('Description')
    expect(screen.getByLabelText('Status')).toHaveValue('ACTIVE')
    expect(screen.getByLabelText('Next Step')).toHaveValue('Release')
  })
  it('renders saved copy and latest writing first', async () => {
    mount('/files/soul', true)
    expect(await screen.findByText('A saved biography.')).toBeInTheDocument()
    const posts = screen.getAllByRole('link', { name: /Latest writing|Older writing/ })
    expect(posts.map(post => post.textContent)).toEqual(['Latest writing', 'Older writing'])
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
  it('renders JOURNEY and the story link', () => {
    mount('/files/soul/journey', true)
    expect(screen.getByRole('heading', { name: 'Still becoming.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Watch the story →' })).toHaveAttribute('href', '/lab/intro')
  })
})
