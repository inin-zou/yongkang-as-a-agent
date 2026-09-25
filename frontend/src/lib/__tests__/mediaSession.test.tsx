import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MusicPlayerProvider } from '../MusicPlayerContext'
import { useMusicPlayer } from '../musicPlayer'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function StartTrack() {
  const { play } = useMusicPlayer()
  const track = { slug: 'soft-spot', name: 'Soft Spot', genre: 'Lo-Fi RnB', original: 'keshi', notes: '', fileUrl: '/soft-spot.mp3' }
  return <button onClick={() => play(track, [track])}>Start</button>
}

it('names the playing track in the OS media controls', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const handlers = new Map<string, unknown>()
  const session = { metadata: null as unknown, playbackState: 'none', setActionHandler: (action: string, handler: unknown) => handlers.set(action, handler) }
  vi.stubGlobal('MediaMetadata', class { constructor(init: object) { Object.assign(this, init) } })
  Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true })

  render(<MusicPlayerProvider><StartTrack /></MusicPlayerProvider>)
  expect(session.metadata).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))

  expect(session.metadata).toMatchObject({ title: 'Soft Spot', artist: 'inhibitor' })
  for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']) expect(handlers.get(action)).toBeTypeOf('function')
  delete (navigator as { mediaSession?: unknown }).mediaSession
})
