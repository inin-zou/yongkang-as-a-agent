import { useCallback, useRef } from 'react'
import { useMusicPlayer } from '../../lib/MusicPlayerContext'
import '../../styles/player.css'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

type RepeatMode = 'off' | 'all' | 'one'

const REPEAT_CYCLE: RepeatMode[] = ['off', 'all', 'one']

export default function MusicPlayerBar() {
  const {
    currentTrack,
    playing,
    currentTime,
    duration,
    repeatMode,
    togglePlay,
    next,
    prev,
    seek,
    setRepeatMode,
  } = useMusicPlayer()

  const progressRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current
      if (!bar || !duration) return
      const rect = bar.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      seek(pct * duration)
    },
    [duration, seek],
  )

  const cycleRepeat = useCallback(() => {
    const idx = REPEAT_CYCLE.indexOf(repeatMode)
    const next = REPEAT_CYCLE[(idx + 1) % REPEAT_CYCLE.length]
    setRepeatMode(next)
  }, [repeatMode, setRepeatMode])

  if (!currentTrack) return null

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`music-player-bar ${currentTrack ? '' : 'music-player-bar--hidden'}`}>
      {/* Controls */}
      <div className="music-player-controls">
        <button
          className="music-player-btn"
          onClick={prev}
          aria-label="Previous track"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19,20 9,12 19,4" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>
        <button
          className={`music-player-btn ${playing ? 'music-player-btn--active' : ''}`}
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          type="button"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <button
          className="music-player-btn"
          onClick={next}
          aria-label="Next track"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5,4 15,12 5,20" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      {/* Progress */}
      <div className="music-player-progress">
        <span className="music-player-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div
          className="music-player-progress-bar"
          ref={progressRef}
          onClick={handleProgressClick}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
        >
          <div
            className="music-player-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Track info */}
      <div className="music-player-info">
        <div className="music-player-track-name">{currentTrack.name}</div>
        <div className="music-player-track-genre">{currentTrack.genre}</div>
      </div>

      {/* Repeat */}
      <button
        className={`music-player-repeat ${
          repeatMode === 'all'
            ? 'music-player-repeat--all'
            : repeatMode === 'one'
              ? 'music-player-repeat--one'
              : ''
        }`}
        onClick={cycleRepeat}
        aria-label={`Repeat: ${repeatMode}`}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17,1 21,5 17,9" />
          <path d="M3,11V9a4,4,0,0,1,4-4H21" />
          <polyline points="7,23 3,19 7,15" />
          <path d="M21,13v2a4,4,0,0,1-4,4H3" />
        </svg>
        {repeatMode !== 'off' && (
          <span className="music-player-repeat-label">
            {repeatMode === 'one' ? '1' : 'all'}
          </span>
        )}
      </button>
    </div>
  )
}
