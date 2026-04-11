import { useRef, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMusic, fetchMusicTracks, fetchPage, updatePage, createMusicTrack, updateMusicTrack, deleteMusicTrack } from '../lib/api'
import { useAdminEdit } from '../hooks/useAdminEdit'
import { useMusicPlayer } from '../lib/MusicPlayerContext'
import AdminBar from '../components/admin/AdminBar'
import TrackEditor from '../components/admin/TrackEditor'
import AsciiTitle from '../components/global/AsciiTitle'
import PostInteractions from '../components/global/PostInteractions'
import type { MusicTrack } from '../types/index'
import '../styles/music.css'
import '../styles/memory.css'

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

/* ===== Audio Player (reads from global MusicPlayerContext) ===== */
const BAR_COUNT = 100

function AudioPlayer({ track, allTracks }: { track: MusicTrack; allTracks: MusicTrack[] }) {
  const { currentTrack, playing, currentTime, duration, togglePlay, seek, play } = useMusicPlayer()
  const waveformRef = useRef<HTMLDivElement>(null)
  const [bars, setBars] = useState<number[]>([])

  const isThisTrack = currentTrack?.slug === track.slug

  // Extract real waveform on mount
  useEffect(() => {
    extractWaveform(track.fileUrl, BAR_COUNT).then(setBars).catch(() => {
      setBars(Array(BAR_COUNT).fill(0.3))
    })
  }, [track.fileUrl])

  // Start playing this track if not already
  function handlePlay() {
    if (!isThisTrack) {
      play(track, allTracks)
    } else {
      togglePlay()
    }
  }

  function seekTo(e: React.MouseEvent<HTMLDivElement>) {
    if (!isThisTrack || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }

  const thisPlaying = isThisTrack && playing
  const thisTime = isThisTrack ? currentTime : 0
  const thisDuration = isThisTrack ? duration : 0
  const progress = thisDuration > 0 ? (thisTime / thisDuration) * 100 : 0

  return (
    <div className="music-player">
      <div className="music-waveform" ref={waveformRef} onClick={seekTo} style={{ cursor: isThisTrack ? 'pointer' : 'default' }}>
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
        <button className="music-play-btn" aria-label={thisPlaying ? 'Pause' : 'Play'} type="button" onClick={handlePlay}>
          {thisPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="music-progress-wrapper">
          <div className="music-progress" onClick={seekTo} style={{ cursor: isThisTrack ? 'pointer' : 'default' }}>
            <div className="music-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="music-time">
            <span>{formatTime(thisTime)}</span>
            <span>{thisDuration > 0 ? formatTime(thisDuration) : '--:--'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== Track Detail View ===== */
function TrackView({ track, allTracks }: { track: MusicTrack; allTracks: MusicTrack[] }) {
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  async function handleSaveTrack(data: { slug: string; name: string; genre: string; original: string; notes: string; fileUrl: string; sortOrder: number }) {
    if (track.id) {
      await updateMusicTrack(token, track.id, data)
    }
    await queryClient.invalidateQueries({ queryKey: ['music-tracks'] })
    setIsEditing(false)
  }

  async function handleDeleteTrack() {
    if (!track.id) return
    if (!window.confirm(`Delete track "${track.name}"?`)) return
    await deleteMusicTrack(token, track.id)
    await queryClient.invalidateQueries({ queryKey: ['music-tracks'] })
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">
        inhibitor — {track.genre}
      </div>
      <h1 className="editor-title">{track.name}</h1>
      <div className="editor-content">
        {isAdmin && (
          <AdminBar
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing(!isEditing)}
          />
        )}

        {isEditing ? (
          <div>
            <TrackEditor
              initial={track}
              onSave={handleSaveTrack}
              onCancel={() => setIsEditing(false)}
            />
            {track.id && (
              <button
                type="button"
                className="admin-btn"
                style={{ marginTop: 'var(--space-sm)', color: '#e55' }}
                onClick={handleDeleteTrack}
              >
                DELETE TRACK
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="music-track-meta">
              <span>Original: {track.original}</span>
              <span>Genre: {track.genre}</span>
            </div>

            <AudioPlayer track={track} allTracks={allTracks} />

            <p className="music-track-notes">{track.notes}</p>

            <PostInteractions slug={`music-${track.slug}`} />
          </>
        )}
      </div>
    </div>
  )
}

/* ===== Artist Overview (default view) ===== */
function ArtistOverview() {
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const [addingTrack, setAddingTrack] = useState(false)
  const queryClient = useQueryClient()

  const { data: music, isLoading, error } = useQuery({
    queryKey: ['music'],
    queryFn: fetchMusic,
  })

  const { data: musicProfile } = useQuery({
    queryKey: ['pages', 'music'],
    queryFn: () => fetchPage('music'),
  })

  // Edit form state for overview
  const [editArtistName, setEditArtistName] = useState('')
  const [editGenre, setEditGenre] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Merge page data with music API data, page data takes priority
  const artistName = (musicProfile?.artistName as string) ?? music?.artistName ?? 'inhibitor'
  const genre = (musicProfile?.genre as string) ?? music?.genre ?? 'Alternative RnB / Lo-Fi'
  const bio = (musicProfile?.bio as string) ?? music?.bio ?? ''
  const status = (musicProfile?.status as string) ?? music?.status ?? ''
  const location = (musicProfile?.location as string) ?? music?.location ?? ''
  const platforms = music?.platforms ?? {}

  function toggleEditing() {
    if (isEditing) {
      setIsEditing(false)
      setSaveError('')
    } else {
      setEditArtistName(artistName)
      setEditGenre(genre)
      setEditBio(bio)
      setEditStatus(status)
      setEditLocation(location)
      setIsEditing(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updatePage(token, 'music', {
        artistName: editArtistName,
        genre: editGenre,
        bio: editBio,
        status: editStatus,
        location: editLocation,
      })
      queryClient.setQueryData(['pages', 'music'], updated)
      setIsEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTrack(data: { slug: string; name: string; genre: string; original: string; notes: string; fileUrl: string; sortOrder: number }) {
    await createMusicTrack(token, data)
    await queryClient.invalidateQueries({ queryKey: ['music-tracks'] })
    setAddingTrack(false)
  }

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (error && !musicProfile) {
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
        {artistName} — {genre}
      </div>
      <AsciiTitle name="music" />
      <div className="editor-content">
        {isAdmin && (
          <AdminBar
            isEditing={isEditing}
            onToggleEdit={toggleEditing}
            onSave={handleSave}
            saving={saving}
            onAdd={() => setAddingTrack(true)}
            addLabel="NEW TRACK"
          />
        )}

        {addingTrack && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
              New Track
            </h3>
            <TrackEditor
              onSave={handleCreateTrack}
              onCancel={() => setAddingTrack(false)}
            />
          </div>
        )}

        {isEditing ? (
          <div className="admin-editor">
            {saveError && <div className="admin-error">{saveError}</div>}

            <div>
              <label htmlFor="music-artist" className="memory-feedback-label">Artist Name</label>
              <input
                id="music-artist"
                type="text"
                className="memory-feedback-input"
                value={editArtistName}
                onChange={(e) => setEditArtistName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="music-genre" className="memory-feedback-label">Genre</label>
              <input
                id="music-genre"
                type="text"
                className="memory-feedback-input"
                value={editGenre}
                onChange={(e) => setEditGenre(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="music-bio" className="memory-feedback-label">Bio</label>
              <textarea
                id="music-bio"
                className="memory-feedback-input"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="music-status" className="memory-feedback-label">Status</label>
              <input
                id="music-status"
                type="text"
                className="memory-feedback-input"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="music-location" className="memory-feedback-label">Location</label>
              <input
                id="music-location"
                type="text"
                className="memory-feedback-input"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

          </div>
        ) : (
          <>
            <img
              src="/artist-photo.jpg"
              alt="inhibitor"
              style={{
                float: 'right',
                width: 140,
                borderRadius: 'var(--radius-sm)',
                marginLeft: 'var(--space-md)',
                marginBottom: 'var(--space-sm)',
                opacity: 0.85,
              }}
            />
            {(() => {
              // Split bio into timeline lines (with dates/colons) and description
              const lines = (bio || '').split('\n').filter(Boolean)
              const timeline: string[] = []
              const desc: string[] = []
              let pastTimeline = false
              for (const line of lines) {
                if (!pastTimeline && /^\d{4}/.test(line.trim())) {
                  timeline.push(line.trim())
                } else {
                  pastTimeline = true
                  desc.push(line.trim())
                }
              }
              return (
                <>
                  {timeline.length > 0 && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-ink-muted)',
                      lineHeight: 1.8,
                      marginBottom: 'var(--space-sm)',
                    }}>
                      {timeline.map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  )}
                  {desc.length > 0 && (
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.95rem',
                      lineHeight: 1.7,
                      color: 'var(--color-ink)',
                      fontStyle: 'normal',
                    }}>
                      {desc.join(' ')}
                    </p>
                  )}
                </>
              )
            })()}

            <div className="editor-divider" style={{ clear: 'both' }} />

            <p className="editor-label">Status</p>
            <p>{status}</p>

            <p className="editor-label">Location</p>
            <p>{location}</p>

            <p className="editor-label">Genre</p>
            <p>{genre}</p>

            <div className="editor-divider" />

            <p className="editor-label">Platforms</p>
            <div className="music-platform-links">
              {Object.entries(platforms).map(([name, url]) => (
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
          </>
        )}
      </div>
    </div>
  )
}

/* ===== Main Page Component ===== */
export default function MusicPage() {
  const { item } = useParams<{ item?: string }>()

  const { data: tracks } = useQuery({
    queryKey: ['music-tracks'],
    queryFn: fetchMusicTracks,
  })

  if (!item) return <ArtistOverview />

  const currentTrack = tracks?.find(t => t.slug === item)

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

  return <ArtistOverview />
}
