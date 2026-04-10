import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { MusicTrack } from '../types'

type RepeatMode = 'off' | 'all' | 'one'

interface MusicPlayerState {
  currentTrack: MusicTrack | null
  playlist: MusicTrack[]
  playlistIndex: number
  playing: boolean
  currentTime: number
  duration: number
  repeatMode: RepeatMode
  // actions
  play: (track: MusicTrack, allTracks: MusicTrack[]) => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  setRepeatMode: (mode: RepeatMode) => void
  audioRef: React.RefObject<HTMLAudioElement | null>
}

const MusicPlayerContext = createContext<MusicPlayerState | undefined>(undefined)

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null)
  const [playlist, setPlaylist] = useState<MusicTrack[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')

  const play = useCallback((track: MusicTrack, allTracks: MusicTrack[]) => {
    const idx = allTracks.findIndex((t) => t.slug === track.slug)
    setPlaylist(allTracks)
    setPlaylistIndex(idx === -1 ? 0 : idx)
    setCurrentTrack(track)

    const audio = audioRef.current
    if (audio) {
      audio.src = track.fileUrl
      audio.play().catch(() => {
        /* autoplay may be blocked */
      })
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [])

  const next = useCallback(() => {
    if (playlist.length === 0) return

    if (repeatMode === 'one') {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
      return
    }

    const nextIndex = playlistIndex + 1
    if (nextIndex >= playlist.length) {
      if (repeatMode === 'all') {
        const track = playlist[0]
        setPlaylistIndex(0)
        setCurrentTrack(track)
        const audio = audioRef.current
        if (audio) {
          audio.src = track.fileUrl
          audio.play().catch(() => {})
        }
      } else {
        // repeat off — stop playback
        setPlaying(false)
        const audio = audioRef.current
        if (audio) audio.pause()
      }
    } else {
      const track = playlist[nextIndex]
      setPlaylistIndex(nextIndex)
      setCurrentTrack(track)
      const audio = audioRef.current
      if (audio) {
        audio.src = track.fileUrl
        audio.play().catch(() => {})
      }
    }
  }, [playlist, playlistIndex, repeatMode])

  const prev = useCallback(() => {
    if (playlist.length === 0) return

    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }

    const prevIndex = playlistIndex - 1
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        const track = playlist[playlist.length - 1]
        setPlaylistIndex(playlist.length - 1)
        setCurrentTrack(track)
        if (audio) {
          audio.src = track.fileUrl
          audio.play().catch(() => {})
        }
      } else {
        // at start, just restart current
        if (audio) audio.currentTime = 0
      }
    } else {
      const track = playlist[prevIndex]
      setPlaylistIndex(prevIndex)
      setCurrentTrack(track)
      if (audio) {
        audio.src = track.fileUrl
        audio.play().catch(() => {})
      }
    }
  }, [playlist, playlistIndex, repeatMode])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = time
  }, [])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => next()
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [next])

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        playlist,
        playlistIndex,
        playing,
        currentTime,
        duration,
        repeatMode,
        play,
        togglePlay,
        next,
        prev,
        seek,
        setRepeatMode,
        audioRef,
      }}
    >
      {children}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />
    </MusicPlayerContext.Provider>
  )
}

export function useMusicPlayer(): MusicPlayerState {
  const ctx = useContext(MusicPlayerContext)
  if (!ctx) throw new Error('useMusicPlayer must be used within a MusicPlayerProvider')
  return ctx
}
