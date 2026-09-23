import { createContext, useContext } from 'react'
import type { MusicTrack } from '../types'

// Context and hook live apart from MusicPlayerProvider so that file only exports components (fast refresh).
export type RepeatMode = 'off' | 'all' | 'one'

export interface MusicPlayerState {
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

export const MusicPlayerContext = createContext<MusicPlayerState | undefined>(undefined)

export function useMusicPlayer(): MusicPlayerState {
  const ctx = useContext(MusicPlayerContext)
  if (!ctx) throw new Error('useMusicPlayer must be used within a MusicPlayerProvider')
  return ctx
}
