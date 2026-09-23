import { queryKeys } from '../lib/queryKeys'
import { useState, lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPage, updatePage } from '../lib/api'
import { useAdminEdit } from '../hooks/useAdminEdit'
import AdminBar from '../components/admin/AdminBar'
import SoulReadmeContent from '../components/soul/SoulReadmeContent'
import { DEFAULT_TITLE, pageTitle, usePageMeta } from '../lib/seo'
import '../styles/skill.css'

const KnowledgeGraph = lazy(() => import('../components/soul/KnowledgeGraph'))
const ContributionGraph = lazy(() => import('../components/soul/ContributionGraph'))

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
  'AI Engineer. My way of learning: BFS -> DFS',
  "BFS: I try everything that interests me, don't want to become boring.\nDFS: building solid projects that real users depend on.",
]

const DEFAULT_STATS = { hackathons: 24, wins: 9, domains: '8+', languages: 3 }

export default function SoulPage() {
  const { item } = useParams<{ item?: string }>()
  usePageMeta(
    item === 'graph' ? { title: pageTitle('KnowledgeGraph'), description: "A force-directed map of the skills, tools, companies and hackathons behind Yongkang Zou's work.", path: '/files/soul/graph' }
    : item === 'commits' ? { title: pageTitle('Commits'), description: "Yongkang Zou's GitHub contribution activity.", path: '/files/soul/commits' }
    : { title: DEFAULT_TITLE, path: '/files/soul' },
  )

  if (item === 'projects') return <Navigate to="/files/soul#work" replace />
  if (item === 'in-progress' || item === 'journey') return <Navigate to="/files/soul" replace />

  if (item === 'graph') {
    return <Suspense fallback={null}><KnowledgeGraph /></Suspense>
  }

  if (item === 'commits') {
    return <Suspense fallback={null}><ContributionGraph /></Suspense>
  }


  return <SoulReadme />
}

function SoulReadme() {
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: pageData } = useQuery({
    queryKey: queryKeys.page('soul'),
    queryFn: () => fetchPage('soul'),
  })

  // Data with fallbacks
  const subtitle = (pageData?.subtitle as string) ?? ''
  const bio = (pageData?.bio as string[]) ?? DEFAULT_BIO
  const domains = (pageData?.domains as string) ?? DEFAULT_DOMAIN_TREE
  const stats = (pageData?.stats as Record<string, unknown>) ?? DEFAULT_STATS
  const speed = (pageData?.speed as string) ?? 'Full demo in < 20 hours avg'
  const languages = (pageData?.languages as string) ?? 'Chinese (native) · French (DALF C2) · English (IELTS 7.0)'

  const currently = (pageData?.currently as string) ?? 'Agent Runtime · Context Engineering · Agent Eval'

  // Edit form state
  const [editCurrently, setEditCurrently] = useState('')
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
      setEditCurrently(currently)
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
        ...pageData,
        currently: editCurrently,
        subtitle: editSubtitle,
        bio: [editBio0, editBio1, ...bio.slice(2)],
        domains: editDomains,
        stats: {
          ...stats,
          hackathons: editHackathons,
          wins: editWins,
          domains: editDomainsCount,
          languages: editLangCount,
        },
        speed: editSpeed,
        languages: editLanguages,
      })
      queryClient.setQueryData(queryKeys.page('soul'), updated)
      setIsEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="soul-readme">
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
                placeholder="Optional one-line subtitle"
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
              <label htmlFor="soul-currently" className="memory-feedback-label">Currently</label>
              <textarea id="soul-currently" className="memory-feedback-input" value={editCurrently} onChange={e => setEditCurrently(e.target.value)} rows={2} />
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
          <SoulReadmeContent bio={bio} currently={currently} />
        )}
    </article>
  )
}
