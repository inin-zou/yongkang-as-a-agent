import { useState, lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPage, updatePage } from '../lib/api'
import { useAdminEdit } from '../hooks/useAdminEdit'
import AdminBar from '../components/admin/AdminBar'
import ProjectsView from '../components/soul/ProjectsView'
import '../styles/skill.css'

const KnowledgeGraph = lazy(() => import('../components/soul/KnowledgeGraph'))

const ASCII_NAME = `███████╗ ██████╗ ██╗   ██╗
╚══███╔╝██╔═══██╗██║   ██║
  ███╔╝ ██║   ██║██║   ██║
 ███╔╝  ██║   ██║██║   ██║
███████╗╚██████╔╝╚██████╔╝
╚══════╝ ╚═════╝  ╚═════╝

██╗   ██╗ ██████╗ ███╗   ██╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗
╚██╗ ██╔╝██╔═══██╗████╗  ██║██╔════╝ ██║ ██╔╝██╔══██╗████╗  ██║██╔════╝
 ╚████╔╝ ██║   ██║██╔██╗ ██║██║  ███╗█████╔╝ ███████║██╔██╗ ██║██║  ███╗
  ╚██╔╝  ██║   ██║██║╚██╗██║██║   ██║██╔═██╗ ██╔══██║██║╚██╗██║██║   ██║
   ██║   ╚██████╔╝██║ ╚████║╚██████╔╝██║  ██╗██║  ██║██║ ╚████║╚██████╔╝
   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝`

const DEFAULT_DOMAIN_TREE = `AI Engineering
├── Spatial Intelligence & 3D
├── Music & Audio AI
├── LLM Infrastructure
├── Healthcare & Biotech
├── Quantum Computing
├── Emotion & Vision AI
├── Geospatial ML
└── Creative AI & Content`

const DEFAULT_BIO = [
  'Part engineer, part artist. Building across RAG, multi-agent systems, 3D spatial intelligence, and music AI.',
  'Not assembling API wrappers. Exploring where cutting-edge tech takes us next.',
]

const DEFAULT_STATS = { hackathons: 24, wins: 9, domains: '8+', languages: 3 }

export default function SoulPage() {
  const { item } = useParams<{ item?: string }>()

  if (item === 'projects') {
    return <ProjectsView />
  }

  if (item === 'graph') {
    return <Suspense fallback={null}><KnowledgeGraph /></Suspense>
  }

  return <SoulReadme />
}

function SoulReadme() {
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: pageData } = useQuery({
    queryKey: ['pages', 'soul'],
    queryFn: () => fetchPage('soul'),
  })

  // Data with fallbacks
  const subtitle = (pageData?.subtitle as string) ?? 'AI Engineer · Paris, France'
  const bio = (pageData?.bio as string[]) ?? DEFAULT_BIO
  const domains = (pageData?.domains as string) ?? DEFAULT_DOMAIN_TREE
  const stats = (pageData?.stats as Record<string, unknown>) ?? DEFAULT_STATS
  const speed = (pageData?.speed as string) ?? 'Full demo in < 20 hours avg'
  const languages = (pageData?.languages as string) ?? 'Chinese (native) · French (DALF C2) · English (IELTS 7.0)'

  // Edit form state
  const [editSubtitle, setEditSubtitle] = useState('')
  const [editBio0, setEditBio0] = useState('')
  const [editBio1, setEditBio1] = useState('')
  const [editDomains, setEditDomains] = useState('')
  const [editHackathons, setEditHackathons] = useState(0)
  const [editWins, setEditWins] = useState(0)
  const [editDomainsCount, setEditDomainsCount] = useState('')
  const [editLangCount, setEditLangCount] = useState(0)
  const [editSpeed, setEditSpeed] = useState('')
  const [editLanguages, setEditLanguages] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleEditing() {
    if (isEditing) {
      setIsEditing(false)
      setError('')
    } else {
      setEditSubtitle(subtitle)
      setEditBio0(bio[0] ?? '')
      setEditBio1(bio[1] ?? '')
      setEditDomains(domains)
      setEditHackathons(Number(stats.hackathons) || 0)
      setEditWins(Number(stats.wins) || 0)
      setEditDomainsCount(String(stats.domains ?? ''))
      setEditLangCount(Number(stats.languages) || 0)
      setEditSpeed(speed)
      setEditLanguages(languages)
      setIsEditing(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const updated = await updatePage(token, 'soul', {
        subtitle: editSubtitle,
        bio: [editBio0, editBio1],
        domains: editDomains,
        stats: {
          hackathons: editHackathons,
          wins: editWins,
          domains: editDomainsCount,
          languages: editLangCount,
        },
        speed: editSpeed,
        languages: editLanguages,
      })
      queryClient.setQueryData(['pages', 'soul'], updated)
      setIsEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">Last updated — April 2026</div>

      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'clamp(0.28rem, 0.75vw, 0.5rem)',
        lineHeight: 1.15,
        color: 'var(--color-ink)',
        margin: '0 0 var(--space-sm) 0',
        overflow: 'hidden',
      }}>
        {ASCII_NAME}
      </pre>

      <div className="editor-content">
        {isAdmin && (
          <AdminBar
            isEditing={isEditing}
            onToggleEdit={toggleEditing}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {isEditing ? (
          <div className="admin-editor">
            {error && <div className="admin-error">{error}</div>}

            <div>
              <label htmlFor="soul-subtitle" className="memory-feedback-label">Subtitle</label>
              <input
                id="soul-subtitle"
                type="text"
                className="memory-feedback-input"
                placeholder="AI Engineer · Paris, France"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="soul-bio-0" className="memory-feedback-label">Bio (paragraph 1)</label>
              <textarea
                id="soul-bio-0"
                className="memory-feedback-input"
                value={editBio0}
                onChange={(e) => setEditBio0(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <label htmlFor="soul-bio-1" className="memory-feedback-label">Bio (paragraph 2)</label>
              <textarea
                id="soul-bio-1"
                className="memory-feedback-input"
                value={editBio1}
                onChange={(e) => setEditBio1(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <label htmlFor="soul-domains" className="memory-feedback-label">Domains (tree text)</label>
              <textarea
                id="soul-domains"
                className="memory-feedback-input"
                value={editDomains}
                onChange={(e) => setEditDomains(e.target.value)}
                rows={10}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              <div>
                <label htmlFor="soul-hackathons" className="memory-feedback-label">Hackathons</label>
                <input
                  id="soul-hackathons"
                  type="number"
                  className="memory-feedback-input"
                  value={editHackathons}
                  onChange={(e) => setEditHackathons(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="soul-wins" className="memory-feedback-label">Wins</label>
                <input
                  id="soul-wins"
                  type="number"
                  className="memory-feedback-input"
                  value={editWins}
                  onChange={(e) => setEditWins(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="soul-domains-count" className="memory-feedback-label">Domains</label>
                <input
                  id="soul-domains-count"
                  type="text"
                  className="memory-feedback-input"
                  value={editDomainsCount}
                  onChange={(e) => setEditDomainsCount(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="soul-lang-count" className="memory-feedback-label">Languages</label>
                <input
                  id="soul-lang-count"
                  type="number"
                  className="memory-feedback-input"
                  value={editLangCount}
                  onChange={(e) => setEditLangCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label htmlFor="soul-speed" className="memory-feedback-label">Speed</label>
              <input
                id="soul-speed"
                type="text"
                className="memory-feedback-input"
                value={editSpeed}
                onChange={(e) => setEditSpeed(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="soul-languages" className="memory-feedback-label">Languages</label>
              <input
                id="soul-languages"
                type="text"
                className="memory-feedback-input"
                value={editLanguages}
                onChange={(e) => setEditLanguages(e.target.value)}
              />
            </div>

          </div>
        ) : (
          <>
            <p className="editor-subtitle">{subtitle}</p>

            <p style={{ whiteSpace: 'pre-line' }}>{bio[0]}</p>
            <p style={{ whiteSpace: 'pre-line' }}>{bio[1]}</p>

            <div className="editor-divider" />

            <p className="editor-label">Domains</p>
            <div className="cli-block" style={{ marginBottom: 'var(--space-md)' }}>
              <div className="cli-prompt">$ agent --tree domains</div>
              <div className="cli-output cli-tree">
                <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
                  {domains}
                </pre>
              </div>
            </div>

            <div className="editor-divider" />

            <p className="editor-label">Stats</p>
            <div className="cli-block">
              <div className="cli-prompt">$ agent --stats</div>
              <div className="cli-output" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                <span><strong style={{ color: 'var(--color-ink)' }}>{String(stats.hackathons)}</strong> hackathons</span>
                <span>|</span>
                <span><strong style={{ color: 'var(--color-ink)' }}>{String(stats.wins)}</strong> wins</span>
                <span>|</span>
                <span><strong style={{ color: 'var(--color-ink)' }}>{String(stats.domains)}</strong> domains</span>
                <span>|</span>
                <span><strong style={{ color: 'var(--color-ink)' }}>{String(stats.languages)}</strong> languages</span>
              </div>
            </div>

            <div className="cli-block" style={{ marginTop: 'var(--space-sm)' }}>
              <div className="cli-prompt">$ agent --info</div>
              <div className="cli-output">
                <div>SPEED    {speed}</div>
                <div>LANGUAGE {languages}</div>
              </div>
            </div>

            <div className="editor-divider" />

            <p className="editor-label">See Also</p>
            <div className="editor-links">
              <Link to="/files/skill" data-interactive>SKILL.md</Link>
              <Link to="/files/memory" data-interactive>MEMORY.md</Link>
              <Link to="/files/contact" data-interactive>CONTACT.md</Link>
              <Link to="/files/music" data-interactive>MUSIC.md</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
