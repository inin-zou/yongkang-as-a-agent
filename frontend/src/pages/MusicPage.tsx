import { queryKeys } from '../lib/queryKeys'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMusicTracks } from '../lib/api'
import ArtistOverview from '../components/music/ArtistOverview'
import TrackView from '../components/music/TrackView'
import { usePageMeta } from '../lib/seo'
import '../styles/music.css'
import '../styles/memory.css'

/* ===== Main Page Component ===== */
export default function MusicPage() {
  const { item } = useParams<{ item?: string }>()

  const { data: tracks } = useQuery({
    queryKey: queryKeys.musicTracks(),
    queryFn: fetchMusicTracks,
  })

  const currentTrack = item ? tracks?.find(t => t.slug === item) : undefined
  usePageMeta(currentTrack
    ? { title: `${currentTrack.name} — inhibitor`, description: `${currentTrack.genre ? `${currentTrack.genre}. ` : ''}A track by inhibitor (Yongkang Zou).`, path: `/files/music/${currentTrack.slug}` }
    : { title: 'Music — inhibitor', description: 'inhibitor: alternative RnB and lo-fi, written and sung by Yongkang Zou.', path: '/files/music' })

  if (!item) return <ArtistOverview tracks={tracks ?? []} />

  if (currentTrack) return <TrackView track={currentTrack} allTracks={tracks ?? []} />

  // Fallback: if tracks haven't loaded yet, show loading
  if (!tracks) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading...
        </p>
      </div>
    )
  }

  return <ArtistOverview tracks={tracks ?? []} />
}
