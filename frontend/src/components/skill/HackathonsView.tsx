import { useQuery } from '@tanstack/react-query'
import { fetchHackathons } from '../../lib/api'
import AsciiTitle from '../global/AsciiTitle'
import HackathonMap from './HackathonMap'
import type { Hackathon } from '../../types'
import '../../styles/skill.css'

/* ===== CLI Stats Block ===== */
function CliStats({ hackathons }: { hackathons: Hackathon[] }) {
  const wins = hackathons.filter(h => h.result).length
  const solo = hackathons.filter(h => h.solo).length
  const funded = hackathons.filter(h => h.result?.toLowerCase().includes('funding') || h.result?.toLowerCase().includes('eur')).length
  const countries = new Set(hackathons.filter(h => !h.isRemote && h.country).map(h => h.country)).size

  return (
    <div className="cli-block">
      <div className="cli-prompt">$ agent --stats hackathons</div>
      <div className="cli-output">
        <div className="cli-box">
          <span className="cli-stat">MISSIONS: <strong>{hackathons.length}</strong></span>
          <span className="cli-divider">│</span>
          <span className="cli-stat">WINS: <strong>{wins}</strong></span>
          <span className="cli-divider">│</span>
          <span className="cli-stat">SOLO: <strong>{solo}</strong></span>
          <span className="cli-divider">│</span>
          <span className="cli-stat">COUNTRIES: <strong>{countries}</strong></span>
          <span className="cli-divider">│</span>
          <span className="cli-stat">FUNDED: <strong>{funded}</strong></span>
        </div>
      </div>
    </div>
  )
}

/* ===== Domain Mind Map (text-based tree) ===== */
function DomainTree({ hackathons }: { hackathons: Hackathon[] }) {
  // Group hackathons by domain
  const domains = new Map<string, string[]>()
  for (const h of hackathons) {
    const list = domains.get(h.domain) || []
    list.push(h.projectName)
    domains.set(h.domain, list)
  }

  return (
    <div className="cli-block">
      <div className="cli-prompt">$ agent --tree domains</div>
      <div className="cli-output cli-tree">
        <div className="cli-tree-root">AI Engineering</div>
        {Array.from(domains.entries()).map(([domain, projects], i, arr) => {
          const isLast = i === arr.length - 1
          const branch = isLast ? '└── ' : '├── '
          const indent = isLast ? '    ' : '│   '
          return (
            <div key={domain}>
              <span className="cli-tree-branch">{branch}</span>
              <span className="cli-tree-domain">{domain}</span>
              {projects.map((proj, j) => {
                const pBranch = j === projects.length - 1 ? '└── ' : '├── '
                return (
                  <div key={j} className="cli-tree-project">
                    <span className="cli-tree-indent">{indent}</span>
                    <span className="cli-tree-branch">{pBranch}</span>
                    <span>{proj}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===== Terminal Timeline ===== */
function HackathonTimeline({ hackathons }: { hackathons: Hackathon[] }) {
  return (
    <div className="cli-block">
      <div className="cli-prompt">$ agent --log hackathons --reverse</div>
      <div className="cli-output">
        {hackathons.map((h, i) => {
          const hasWin = !!h.result
          const trophy = hasWin ? '🏆' : '  '
          const projectUrl = h.projectUrl || undefined

          return (
            <div key={i} className={`cli-log-line ${hasWin ? 'cli-log-win' : 'cli-log-default'}`}>
              <span className="cli-log-date">[{h.date}]</span>
              <span className="cli-log-trophy">{trophy}</span>
              <span className="cli-log-name">{h.name}</span>
              <span className="cli-log-arrow">→</span>
              {projectUrl ? (
                <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="cli-log-project">
                  {h.projectName}
                </a>
              ) : (
                <span className="cli-log-project">{h.projectName}</span>
              )}
              {h.result && <span className="cli-log-result">{h.result}</span>}
              {h.solo && <span className="cli-log-solo">(solo)</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===== Main View ===== */
export default function HackathonsView() {
  const { data: hackathons, isLoading } = useQuery({
    queryKey: ['hackathons'],
    queryFn: fetchHackathons,
  })

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading hackathons...
        </p>
      </div>
    )
  }

  const all = hackathons || []

  return (
    <div className="editor-page">
      <div className="editor-meta">24 missions. 9 wins. Always shipping.</div>
      <AsciiTitle name="hackathons" />
      <div className="editor-content">
        <CliStats hackathons={all} />

        <div className="editor-divider" />

        <p className="editor-label">Domains</p>
        <DomainTree hackathons={all} />

        <div className="editor-divider" />

        <p className="editor-label">Map</p>
        <HackathonMap hackathons={all} />

        <div className="editor-divider" />

        <p className="editor-label">Timeline</p>
        <HackathonTimeline hackathons={all} />
      </div>
    </div>
  )
}
