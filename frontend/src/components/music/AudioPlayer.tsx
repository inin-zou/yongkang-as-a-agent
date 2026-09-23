import { useRef, useState, useEffect } from 'react'
import { useMusicPlayer } from '../../lib/musicPlayer'
import type { MusicTrack } from '../../types/index'
import formatTime from './formatTime'

const BAR_COUNT = 100

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

export default function AudioPlayer({ track, allTracks }: { track: MusicTrack; allTracks: MusicTrack[] }) {
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
