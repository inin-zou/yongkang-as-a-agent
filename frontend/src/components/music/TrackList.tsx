import { Link } from 'react-router-dom'
import { useMusicPlayer } from '../../lib/musicPlayer'
import type { MusicTrack } from '../../types/index'
import formatTime from './formatTime'

/* ===== Artist Overview (default view) ===== */
export default function TrackList({ tracks }: { tracks: MusicTrack[] }) {
  const { play, togglePlay, currentTrack, playing, duration } = useMusicPlayer()
  return <section className="soul-section" aria-label="Tracks">
    <h2>Tracks</h2>
    {tracks.map(track => {
      const active = currentTrack?.slug === track.slug
      return <div className="document-track-row" key={track.slug}>
        <div><h3><Link to={`/files/music/${track.slug}`}>{track.name}</Link></h3><p className="soul-mono document-muted">{track.genre}{active && duration > 0 ? ` · ${formatTime(duration)}` : ''}</p></div>
        <button type="button" className="document-play" aria-label={`${active && playing ? 'Pause' : 'Play'} ${track.name}`} onClick={() => active ? togglePlay() : play(track, tracks)}>{active && playing ? 'Pause' : 'Play'}{active && playing ? ' Ⅱ' : ' ▷'}</button>
      </div>
    })}
  </section>
}
