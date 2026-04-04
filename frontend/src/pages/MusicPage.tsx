import { useRef, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMusic } from '../lib/api'
import AsciiTitle from '../components/global/AsciiTitle'
import PostInteractions from '../components/global/PostInteractions'
import '../styles/music.css'
import '../styles/memory.css'

/* ===== Track data ===== */
const STORAGE_BASE = 'https://ktdvafynhgszkmrgmeyk.supabase.co/storage/v1/object/public/music'

const TRACKS: Record<string, {
  name: string
  genre: string
  original: string
  notes: string
  file: string
}> = {
  'pimmies-dilemma': {
    name: "PIMMIE'S DILEMMA",
    genre: 'Alternative RnB',
    original: 'Pimmie, PARTYNEXTDOOR & Drake',
    notes: 'A cover of the standout track from $ome $exy $ongs 4 U. Stripped back, rebuilt with just a voice and a late-night atmosphere.',
    file: `${STORAGE_BASE}/PIMMIE'S%20DILEMMA.mp3`,
  },
  'soft-spot': {
    name: 'Soft Spot',
    genre: 'Lo-Fi RnB',
    original: 'keshi',
    notes: 'A quiet cover of keshi\'s Soft Spot. Recorded in one take, keeping the vulnerability raw and unpolished.',
    file: `${STORAGE_BASE}/Soft%20Spot.mp3`,
  },
  'dream': {
    name: 'Dream',
    genre: 'Lo-Fi RnB',
    original: 'keshi',
    notes: 'keshi\'s Dream, reimagined with layered vocals and a slower, more introspective arrangement.',
    file: `${STORAGE_BASE}/Dream.mp3`,
  },
}

/* ===== Extract real waveform from audio ===== */
async function extractWaveform(url: string, barCount: number): Promise<number[]> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()

  const channelData = audioBuffer.getChannelData(0)
  const samplesPerBar = Math.floor(channelData.length / barCount)
  const bars: number[] = []

  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar
    const end = start + samplesPerBar
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += Math.abs(channelData[j])
    }
    bars.push(sum / samplesPerBar)
  }

  // Normalize to 0-1
  const max = Math.max(...bars, 0.01)
  return bars.map(b => b / max)
}

/* ===== Format seconds to m:ss ===== */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ===== Icons ===== */
function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
    </svg>
  )
}

/* ===== Audio Player ===== */
const BAR_COUNT = 100

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bars, setBars] = useState<number[]>([])

  // Extract real waveform on mount
  useEffect(() => {
    extractWaveform(src, BAR_COUNT).then(setBars).catch(() => {
      // Fallback: flat bars if decode fails
      setBars(Array(BAR_COUNT).fill(0.3))
    })
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  function seekTo(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="music-player">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="music-waveform" ref={waveformRef} onClick={seekTo}>
        <div className="music-waveform-bars">
          {bars.map((amplitude, i) => {
            const barProgress = ((i + 0.5) / bars.length) * 100
            const height = Math.max(4, amplitude * 52)
            return (
              <div
                key={i}
                className={`music-waveform-bar${barProgress <= progress ? ' music-waveform-bar-active' : ''}`}
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
      </div>

      <div className="music-controls">
        <button className="music-play-btn" aria-label={playing ? 'Pause' : 'Play'} type="button" onClick={togglePlay}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="music-progress-wrapper">
          <div className="music-progress" onClick={seekTo} style={{ cursor: 'pointer' }}>
            <div className="music-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="music-time">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== Track Detail View ===== */
function TrackView({ trackId }: { trackId: string }) {
  const track = TRACKS[trackId]
  if (!track) {
    return (
      <div className="editor-page">
        <div className="editor-meta">Track not found</div>
        <h1 className="editor-title">Unknown Track</h1>
        <div className="editor-content">
          <p>This track does not exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">
        inhibitor — {track.genre}
      </div>
      <h1 className="editor-title">{track.name}</h1>
      <div className="editor-content">
        <div className="music-track-meta">
          <span>Original: {track.original}</span>
          <span>Genre: {track.genre}</span>
        </div>

        <AudioPlayer src={track.file} />

        <p className="music-track-notes">{track.notes}</p>

        <PostInteractions slug={`music-${trackId}`} />
      </div>
    </div>
  )
}

/* ===== Artist Overview (default view) ===== */
function ArtistOverview() {
  const { data: music, isLoading, error } = useQuery({
    queryKey: ['music'],
    queryFn: fetchMusic,
  })

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (error || !music) {
    return (
      <div className="editor-page">
        <div className="editor-meta">inhibitor — Alternative RnB / Lo-Fi</div>
        <AsciiTitle name="music" />
        <div className="editor-content">
          <p>Could not load artist data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">
        {music.artistName} — {music.genre}
      </div>
      <AsciiTitle name="music" />
      <div className="editor-content">
        <p>{music.bio}</p>

        <div className="editor-divider" />

        <p className="editor-label">Status</p>
        <p>{music.status}</p>

        <p className="editor-label">Location</p>
        <p>{music.location}</p>

        <p className="editor-label">Genre</p>
        <p>{music.genre}</p>

        <div className="editor-divider" />

        <p className="editor-label">Platforms</p>
        <div className="music-platform-links">
          {Object.entries(music.platforms).map(([name, url]) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              data-interactive
            >
              {name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ===== Main Page Component ===== */
export default function MusicPage() {
  const { item } = useParams<{ item?: string }>()

  if (!item) return <ArtistOverview />

  if (TRACKS[item]) return <TrackView trackId={item} />

  return <ArtistOverview />
}
