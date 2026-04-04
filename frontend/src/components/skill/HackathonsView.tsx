import { useQuery } from '@tanstack/react-query'
import { fetchHackathons } from '../../lib/api'
import HackathonMap from './HackathonMap'
import type { Hackathon } from '../../types'
import '../../styles/skill.css'

function HackathonListItem({ hackathon }: { hackathon: Hackathon }) {
  return (
    <div className="hackathon-list-item">
      <div>
        <span className="hackathon-list-name">{hackathon.name}</span>
        <span className="hackathon-list-project"> — {hackathon.projectName}</span>
        {hackathon.result && (
          <span className="hackathon-list-result"> · {hackathon.result}</span>
        )}
      </div>
      <span className="hackathon-list-date">{hackathon.date}</span>
    </div>
  )
}

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
  const inPerson = all.filter(h => !h.isRemote)
  const remote = all.filter(h => h.isRemote)
  const wins = all.filter(h => h.result)
  const countries = new Set(inPerson.map(h => h.country).filter(Boolean))

  return (
    <div className="editor-page">
      <div className="editor-meta">Global hackathon footprint</div>
      <h1 className="editor-title">Hackathons</h1>
      <div className="editor-content">
        <div className="hackathon-stats">
          <span><strong>{all.length}</strong> hackathons</span>
          <span><strong>{wins.length}</strong> wins</span>
          <span><strong>{countries.size}</strong> countries</span>
        </div>

        <HackathonMap hackathons={all} />

        {remote.length > 0 && (
          <>
            <div className="editor-divider" />
            <p className="editor-label">Remote</p>
            {remote.map((h, i) => (
              <HackathonListItem key={i} hackathon={h} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
