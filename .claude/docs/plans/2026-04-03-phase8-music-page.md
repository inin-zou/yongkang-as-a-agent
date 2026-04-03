# Phase 8: MUSIC.md Page --- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MUSIC.md page with a functional music player, audio-reactive Temporal Anomaly visualizer, track list sidebar fetched from Supabase, artist profile panel with platform links, a vertical photo embed slot, and admin track upload.

**Architecture:** The MUSIC.md tab is one of the five `.md` file tabs in the file system shell (Phase 2). It uses the existing `FileSystemLayout` three-zone structure: sidebar (track list), main panel (visualizer + photo), and a right sub-panel (artist profile). Track metadata lives in the Supabase `tracks` table (Phase 6). Audio files live in Supabase Storage `music` bucket. Artist info comes from the existing `GET /api/music/artist` endpoint (currently `GET /api/music`, to be remapped). The mini player is scoped to the MUSIC.md panel, not global. The audio-reactive visualizer reuses Temporal Anomaly data ribbon geometry from the design reference, adapted to prismatic colors and driven by Web Audio API `AnalyserNode` frequency data.

**Tech Stack:** React 19, TypeScript 5, Three.js (Line geometry + BufferGeometry), Web Audio API (AudioContext + AnalyserNode), HTML5 Audio element, TanStack Query, CSS custom properties (existing theme tokens), Supabase Storage (file upload)

**Depends on:**
- Phase 2 (file system shell with `.md` tabs, sidebar, `FileSystemLayout`)
- Phase 6 (Supabase integration: `tracks` table, `music` Storage bucket, auth, `supabase_repo.go` CRUD, content service, JWT middleware, `useAuth` hook, `AuthProvider`)
- Existing: `GET /api/music` endpoint (JSON file-backed artist info), `backend/data/music.json`

**Reference docs:**
- `.claude/docs/UX-design.md` --- section 7 (MUSIC.md layout, audio-reactive ribbons, mini player, admin upload)
- `.claude/docs/architecture.md` --- `tracks` table schema, Supabase Storage buckets, API endpoints
- `.claude/docs/UI-implement-design.md` --- Temporal Anomaly reusable elements (data ribbons, particle system), prismatic color system, frosted glass, color tokens
- `.claude/docs/yongkang-profile.md` --- artist name "inhibitor", genre, status, platform links, NetEase ID
- `.claude/design-refs/3-temporal-anomaly.html` --- Three.js ribbon implementation (Line + BufferGeometry, sine/noise vertex animation, additive blending)

---

## File Structure (Phase 8 changes)

```
frontend/src/
  components/
    music/
      MusicPlayer.tsx              # NEW --- mini player bar (play/pause, progress, track name, duration)
      TrackList.tsx                 # NEW --- sidebar track list component (note-items, click to play)
      AudioVisualizer.tsx           # NEW --- Three.js canvas with audio-reactive Temporal Anomaly ribbons
      ArtistProfile.tsx             # NEW --- right panel: bio, genre, status, platform links
      ArtistPhoto.tsx               # NEW --- vertical photo embed with frosted glass overlay
      TrackUploadButton.tsx         # NEW --- admin-only upload button + modal/form
    navigation/
      sidebarConfig.ts             # MODIFY --- replace placeholder music sidebar items with dynamic fetch flag
  hooks/
    useAudioPlayer.ts              # NEW --- custom hook wrapping HTML5 Audio + Web Audio API AnalyserNode
    useTracks.ts                   # NEW --- TanStack Query hook for GET /api/music/tracks
    useArtist.ts                   # NEW --- TanStack Query hook for GET /api/music/artist
  pages/
    MusicPage.tsx                  # CREATE (or REWRITE placeholder) --- orchestrates all music sub-components
  lib/
    api.ts                         # MODIFY --- add fetchTracks, fetchArtist, uploadTrack, deleteTrack
  types/
    index.ts                       # MODIFY --- add Track type (if not already from Phase 6)
  styles/
    music.css                      # NEW --- music page-specific styles (player, visualizer container, artist panel)

backend/
  cmd/server/main.go               # MODIFY --- remap /api/music to /api/music/artist, add /api/music/tracks routes
  internal/handler/
    api.go                         # MODIFY --- rename HandleGetMusic -> HandleGetMusicArtist
    content.go                     # VERIFY --- HandleGetTracks, HandleCreateTrack, HandleDeleteTrack should exist from Phase 6
  internal/handler/
    upload.go                      # NEW --- HandleUploadTrackFile (multipart upload to Supabase Storage)
```

---

## Task 1: Backend --- Remap Music Routes and Add Upload Handler

**Files:**
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/internal/handler/api.go`
- Create: `backend/internal/handler/upload.go`

**Estimated time:** 5 minutes

### Step 1: Remove Phase 6 flat music routes and add subroute group

- [ ] **First, remove the flat music routes that Phase 6 added to `backend/cmd/server/main.go`:**
  - Remove `r.Get("/music", h.HandleGetMusic)` from the static data routes section
  - Remove `r.Get("/music/tracks", contentH.HandleGetTracks)` from the public content routes section
  - Remove `r.Post("/music/tracks", contentH.HandleCreateTrack)` from the admin routes section
  - Remove `r.Delete("/music/tracks/{id}", contentH.HandleDeleteTrack)` from the admin routes section
  - Also remove the Phase 6 comments about "Phase 8 moves this into r.Route" — those are no longer needed since this IS Phase 8.

- [ ] **Then, add the subroute group** that replaces all of the above. Change the section to a sub-route group:

```go
r.Route("/music", func(r chi.Router) {
    r.Get("/artist", h.HandleGetMusicArtist)          // existing JSON file-backed artist info
    r.Get("/tracks", contentHandler.HandleGetTracks)   // Supabase-backed track list (Phase 6)
    r.With(authMiddleware).Post("/tracks", contentHandler.HandleCreateTrack)   // admin-only
    r.With(authMiddleware).Delete("/tracks/{id}", contentHandler.HandleDeleteTrack) // admin-only
    r.With(authMiddleware).Post("/tracks/upload", uploadHandler.HandleUploadTrackFile) // admin-only, multipart
})
```

Note: `contentHandler` and `authMiddleware` should already exist from Phase 6. If they do not yet exist at implementation time, wire them following the Phase 6 plan patterns.

- [ ] In `backend/internal/handler/api.go`, rename `HandleGetMusic` to `HandleGetMusicArtist`. Update the function name and any doc comment. The body stays the same (calls `h.svc.GetMusic()` and returns JSON).

### Step 2: Create the file upload handler

- [ ] Create `backend/internal/handler/upload.go`:

```go
package handler

import (
    "fmt"
    "io"
    "net/http"
    "path/filepath"
    "strings"

    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/middleware"
)

// UploadHandler handles file uploads to Supabase Storage.
type UploadHandler struct {
    supabaseURL       string
    supabaseServiceKey string
}

// NewUploadHandler creates a new UploadHandler.
func NewUploadHandler(supabaseURL, supabaseServiceKey string) *UploadHandler {
    return &UploadHandler{
        supabaseURL:       supabaseURL,
        supabaseServiceKey: supabaseServiceKey,
    }
}

// HandleUploadTrackFile accepts a multipart file upload (.mp3 or .wav),
// uploads it to Supabase Storage "music" bucket, and returns the public URL.
func (h *UploadHandler) HandleUploadTrackFile(w http.ResponseWriter, r *http.Request) {
    // 1. Parse multipart form (max 50MB)
    // 2. Read the "file" field
    // 3. Validate extension is .mp3 or .wav
    // 4. Generate a storage path: "tracks/{timestamp}_{sanitized_filename}"
    // 5. Upload to Supabase Storage via REST API:
    //    POST {SUPABASE_URL}/storage/v1/object/music/{path}
    //    Headers: Authorization: Bearer {SERVICE_KEY}, Content-Type: audio/mpeg or audio/wav
    //    Body: file bytes
    // 6. Construct public URL: {SUPABASE_URL}/storage/v1/object/public/music/{path}
    // 7. Return JSON: { "audioUrl": "...", "filename": "..." }
}
```

Key implementation details:
- Max upload size: 50MB (`r.Body = http.MaxBytesReader(w, r.Body, 50<<20)`)
- Allowed extensions: `.mp3`, `.wav`
- Content-Type mapping: `.mp3` -> `audio/mpeg`, `.wav` -> `audio/wav`
- Storage path format: `tracks/{unix_timestamp}_{sanitized_filename}`
- Upload to Supabase Storage using the service role key (bypasses RLS)
- Return the public URL so the frontend can create the track record with it

### Step 3: Wire upload handler in main.go

- [ ] In `main.go`, initialize `UploadHandler` with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars, then register the route as shown in Step 1.

### Step 4: Commit

```bash
git add backend/cmd/server/main.go backend/internal/handler/api.go backend/internal/handler/upload.go
git commit -m "feat(backend): remap music routes, add track file upload handler"
```

---

## Task 2: Frontend --- Types and API Functions

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Estimated time:** 3 minutes

### Step 1: Add Track type (if not already present from Phase 6)

- [ ] In `frontend/src/types/index.ts`, add:

```typescript
export interface Track {
  id: string
  title: string
  audioUrl: string
  durationSeconds?: number
  trackOrder: number
  createdAt: string
}
```

Also verify the existing `Music` interface matches what `GET /api/music/artist` returns (it should --- it maps to `backend/data/music.json`).

### Step 2: Add API functions for tracks and artist

- [ ] In `frontend/src/lib/api.ts`, update the existing `fetchMusic` function and add track functions:

```typescript
// Rename the path to match the new route
export function fetchArtist(): Promise<Music> {
  return fetchJSON<Music>('/music/artist')
}

// Keep fetchMusic as an alias for backward compatibility, or remove if nothing else uses it
export const fetchMusic = fetchArtist

export function fetchTracks(): Promise<Track[]> {
  return fetchJSON<Track[]>('/music/tracks')
}

// Admin API calls use fetchAuthJSON — it handles the auth token internally
// from the Supabase session. No explicit token argument needed.

export function uploadTrackFile(file: File): Promise<{ audioUrl: string; filename: string }> {
  // Upload is multipart, so we use fetch directly but still get the token from Supabase session.
  // Import getSession from supabase.ts to get the current token.
  return (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE_URL}/music/tracks/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    return res.json()
  })()
}

export function createTrack(data: { title: string; audioUrl: string; durationSeconds?: number; trackOrder: number }): Promise<Track> {
  return fetchAuthJSON<Track>('/music/tracks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteTrack(id: string): Promise<void> {
  return fetchAuthJSON<void>(`/music/tracks/${id}`, { method: 'DELETE' })
}
```

### Step 3: Commit

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): add Track type and music API functions (tracks, artist, upload)"
```

---

## Task 3: Frontend --- TanStack Query Hooks

**Files:**
- Create: `frontend/src/hooks/useTracks.ts`
- Create: `frontend/src/hooks/useArtist.ts`

**Estimated time:** 2 minutes

### Step 1: Create useTracks hook

- [ ] Create `frontend/src/hooks/useTracks.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchTracks } from '../lib/api'

export function useTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: fetchTracks,
    staleTime: 5 * 60 * 1000, // 5 min --- track list rarely changes
  })
}
```

### Step 2: Create useArtist hook

- [ ] Create `frontend/src/hooks/useArtist.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchArtist } from '../lib/api'

export function useArtist() {
  return useQuery({
    queryKey: ['artist'],
    queryFn: fetchArtist,
    staleTime: 30 * 60 * 1000, // 30 min --- artist info is essentially static
  })
}
```

### Step 3: Commit

```bash
git add frontend/src/hooks/useTracks.ts frontend/src/hooks/useArtist.ts
git commit -m "feat(frontend): TanStack Query hooks for tracks and artist data"
```

---

## Task 4: Frontend --- Audio Player Hook (useAudioPlayer)

**Files:**
- Create: `frontend/src/hooks/useAudioPlayer.ts`

**Estimated time:** 5 minutes

This is the core audio engine. It wraps an HTML5 `<audio>` element and connects it to a Web Audio API `AnalyserNode` for frequency data extraction.

### Step 1: Create useAudioPlayer hook

- [ ] Create `frontend/src/hooks/useAudioPlayer.ts`:

The hook manages:
1. An `HTMLAudioElement` (created once via `useRef`)
2. An `AudioContext` + `AnalyserNode` (created on first play, to comply with browser autoplay policies)
3. A `MediaElementSourceNode` connecting the audio element to the analyser
4. State: `currentTrack: Track | null`, `isPlaying: boolean`, `currentTime: number`, `duration: number`
5. Exposed methods: `play(track: Track)`, `pause()`, `resume()`, `seek(time: number)`, `togglePlayPause()`
6. Exposed ref: `analyserRef` (for the visualizer to read frequency data)
7. A `frequencyData: Uint8Array` ref (pre-allocated, size = `analyser.frequencyBinCount`)

```typescript
import { useRef, useState, useCallback, useEffect } from 'react'
import type { Track } from '../types'

export interface AudioPlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
}

export interface AudioPlayerControls {
  play: (track: Track) => void
  pause: () => void
  resume: () => void
  seek: (time: number) => void
  togglePlayPause: () => void
}

export interface AudioPlayerAPI extends AudioPlayerState, AudioPlayerControls {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  frequencyDataRef: React.MutableRefObject<Uint8Array | null>
}

export function useAudioPlayer(): AudioPlayerAPI {
  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const frequencyDataRef = useRef<Uint8Array | null>(null)

  // --- State ---
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous' // required for AnalyserNode with cross-origin audio
    audio.preload = 'metadata'
    audioRef.current = audio

    // Update currentTime periodically
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audioContextRef.current?.close()
    }
  }, [])

  // Lazy-init AudioContext + AnalyserNode (must happen after user gesture)
  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current) return
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256 // 128 frequency bins --- enough for ribbon animation
    analyser.smoothingTimeConstant = 0.8

    const source = ctx.createMediaElementSource(audioRef.current!)
    source.connect(analyser)
    analyser.connect(ctx.destination)

    audioContextRef.current = ctx
    analyserRef.current = analyser
    sourceRef.current = source
    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount)
  }, [])

  const play = useCallback((track: Track) => {
    ensureAudioContext()
    const audio = audioRef.current!
    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl
      audio.load()
    }
    audio.play()
    setCurrentTrack(track)
    setIsPlaying(true)
    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [ensureAudioContext])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play()
    setIsPlaying(true)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause()
    else if (currentTrack) resume()
  }, [isPlaying, currentTrack, pause, resume])

  return {
    currentTrack, isPlaying, currentTime, duration,
    play, pause, resume, seek, togglePlayPause,
    analyserRef, frequencyDataRef,
  }
}
```

Key design decisions:
- `crossOrigin = 'anonymous'` is required on the `<audio>` element so the `MediaElementSourceNode` can read the audio stream. The Supabase Storage bucket must send appropriate CORS headers (public buckets do by default).
- `fftSize = 256` yields 128 frequency bins. This is sufficient for driving ribbon amplitudes (we map bins to ribbon layers). Higher values provide finer resolution but cost more CPU.
- `smoothingTimeConstant = 0.8` provides smooth transitions between frames, preventing jittery ribbon motion.
- The `AudioContext` is created lazily on first `play()` call to comply with browser autoplay policies (Chrome, Safari require a user gesture before creating an AudioContext).

### Step 2: Commit

```bash
git add frontend/src/hooks/useAudioPlayer.ts
git commit -m "feat(frontend): useAudioPlayer hook with Web Audio API AnalyserNode integration"
```

---

## Task 5: Frontend --- TrackList Sidebar Component

**Files:**
- Create: `frontend/src/components/music/TrackList.tsx`
- Modify: `frontend/src/components/navigation/sidebarConfig.ts`

**Estimated time:** 3 minutes

### Step 1: Create TrackList component

- [ ] Create `frontend/src/components/music/TrackList.tsx`:

This component renders inside the sidebar zone of `FileSystemLayout`. It replaces the static sidebar items for the MUSIC.md tab with dynamically fetched tracks.

```typescript
interface TrackListProps {
  tracks: Track[]
  currentTrackId: string | null
  isLoading: boolean
  onSelectTrack: (track: Track) => void
  isAdmin: boolean
  onUploadClick?: () => void
}
```

Structure:
- Sidebar header: `"TRACKS"` in uppercase mono font (matches sidebar-header pattern from Phase 2)
- For each track: render a `.note-item` (reuse the existing CSS class from `file-system.css`)
  - Left border indicator (active = `--color-highlight`)
  - Track title as the note label
  - Track order number or duration as the preview line
  - Click handler calls `onSelectTrack(track)`
  - Active state: `currentTrackId === track.id`
- Loading state: show 2-3 skeleton note-items (pulsing `--color-surface-1` background)
- Empty state: "No tracks yet" in `--color-ink-muted`
- If `isAdmin`: render an upload button at the bottom of the sidebar, styled as a note-item with `+ UPLOAD TRACK` label and a `--color-prism-teal` left border

### Step 2: Update sidebarConfig for MUSIC.md

- [ ] In `sidebarConfig.ts`, update the `music` tab config to indicate that its sidebar is dynamically rendered (not driven by static `sidebarItems`):

```typescript
{
  id: 'music',
  label: 'MUSIC.md',
  basePath: '/files/music',
  sidebarItems: [], // empty --- MusicPage renders its own sidebar via TrackList
  defaultItem: null,
  /** When true, the page component manages its own sidebar content */
  customSidebar: true,
}
```

If `FileSystemLayout` does not yet support `customSidebar`, add a check: when the active tab has `customSidebar: true`, render `children` in the sidebar zone instead of the default `<Sidebar />` component. The `MusicPage` will pass `<TrackList />` into this slot.

Alternatively (simpler approach): `MusicPage` can bypass `FileSystemLayout`'s built-in sidebar entirely by rendering a custom layout within the main panel area that includes its own left column. Choose whichever approach causes less disruption to the existing `FileSystemLayout` component. The key requirement is that the track list visually occupies the sidebar position.

### Step 3: Commit

```bash
git add frontend/src/components/music/TrackList.tsx frontend/src/components/navigation/sidebarConfig.ts
git commit -m "feat(frontend): TrackList sidebar component with dynamic track loading"
```

---

## Task 6: Frontend --- Mini Player Component

**Files:**
- Create: `frontend/src/components/music/MusicPlayer.tsx`
- Create: `frontend/src/styles/music.css`

**Estimated time:** 4 minutes

### Step 1: Create music.css

- [ ] Create `frontend/src/styles/music.css` with styles for the player, visualizer container, and artist panel:

```css
/* ===== MUSIC PAGE LAYOUT ===== */
.music-page {
  display: grid;
  grid-template-columns: 1fr 320px;    /* main area + artist profile */
  grid-template-rows: 1fr auto;        /* content area + mini player */
  height: 100%;
  overflow: hidden;
}

.music-main {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  overflow: hidden;
}

.music-artist-panel {
  grid-column: 2;
  grid-row: 1 / -1;                    /* spans both rows */
  border-left: 1px solid var(--color-grid);
  overflow-y: auto;
  padding: var(--space-lg);
  background: var(--color-void);
}

/* ===== MINI PLAYER ===== */
.mini-player {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--color-grid);
  background: var(--color-surface-0);
  height: 64px;
  min-height: 64px;
}

.mini-player__track-info {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.mini-player__title {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-player__time {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-ink-muted);
}

.mini-player__play-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-grid-major);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.mini-player__play-btn:hover {
  background: var(--color-surface-1);
  border-color: var(--color-prism-teal);
}

.mini-player__progress-container {
  flex: 1;
  height: 4px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  cursor: none;
  position: relative;
}

.mini-player__progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(
    90deg,
    var(--color-prism-pink),
    var(--color-prism-teal)
  );
  transition: width 0.1s linear;
}

/* ===== VISUALIZER CONTAINER ===== */
.visualizer-container {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.visualizer-container canvas {
  width: 100% !important;
  height: 100% !important;
}

/* ===== ARTIST PHOTO ===== */
.artist-photo-container {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;            /* vertical portrait */
  overflow: hidden;
  border-radius: var(--radius-subtle);
  margin-bottom: var(--space-lg);
}

.artist-photo-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-photo-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-surface-1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-faint);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ===== PLATFORM LINKS ===== */
.platform-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.platform-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: background 0.15s ease, border-color 0.15s ease;
  cursor: none;
}

.platform-link:hover {
  background: var(--color-surface-1);
  border-color: var(--color-prism-lavender);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .music-page {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto auto;
  }
  .music-artist-panel {
    grid-column: 1;
    grid-row: 3;
    border-left: none;
    border-top: 1px solid var(--color-grid);
  }
}
```

### Step 2: Create MusicPlayer component

- [ ] Create `frontend/src/components/music/MusicPlayer.tsx`:

```typescript
interface MusicPlayerProps {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
}
```

Structure:
- Outer `div.mini-player`
- Play/pause button: renders a play triangle SVG or pause bars SVG based on `isPlaying`. Uses Lucide icons (`Play`, `Pause`) or inline SVG.
- Track info: `div.mini-player__track-info` with title and `currentTime / duration` formatted as `M:SS / M:SS`
- Progress bar: `div.mini-player__progress-container` with inner `div.mini-player__progress-bar` whose `width` is `(currentTime / duration) * 100 + '%'`
- Click on progress bar: calculate the seek position from click x relative to container width, call `onSeek(newTime)`
- When no track is selected: show "Select a track" in muted text, disable play button

Helper function for time formatting:
```typescript
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
```

### Step 3: Import music.css

- [ ] In `frontend/src/index.css` (or wherever global CSS imports live), add:

```css
@import './styles/music.css';
```

### Step 4: Commit

```bash
git add frontend/src/components/music/MusicPlayer.tsx frontend/src/styles/music.css frontend/src/index.css
git commit -m "feat(frontend): mini player component with progress bar and theme-styled controls"
```

---

## Task 7: Frontend --- Audio-Reactive Visualizer (Temporal Anomaly Ribbons)

**Files:**
- Create: `frontend/src/components/music/AudioVisualizer.tsx`

**Estimated time:** 5 minutes

This is the centerpiece visual. It adapts the Temporal Anomaly data ribbon technique from `.claude/design-refs/3-temporal-anomaly.html` to respond to audio frequency data.

### Step 1: Create AudioVisualizer component

- [ ] Create `frontend/src/components/music/AudioVisualizer.tsx`:

```typescript
interface AudioVisualizerProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  frequencyDataRef: React.MutableRefObject<Uint8Array | null>
  isPlaying: boolean
}
```

Implementation approach:

1. **Three.js setup (in a `useEffect`):**
   - Create `Scene`, `OrthographicCamera` (matching Temporal Anomaly: frustumSize = 12, ortho projection), `WebGLRenderer` with `{ antialias: true, alpha: true }` (alpha so the void background shows through)
   - Mount the canvas to a container ref
   - Handle resize events

2. **Ribbon geometry (adapted from Temporal Anomaly):**
   - Create two layers of ribbons:
     - Core layer: 40-60 `THREE.Line` objects with `THREE.LineBasicMaterial`, prismatic pink (`--color-prism-pink` = `#ff6b9d`)
     - Shell layer: 60-80 `THREE.Line` objects, prismatic lavender (`#b388ff`)
   - Each line has a `BufferGeometry` with ~200 points (x spans the view width)
   - Material: `transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false` (same as Temporal Anomaly reference)

3. **Prismatic color palette (replacing Temporal Anomaly's red/purple/cyan):**
   - Core ribbons: cycle through `#ff6b9d` (pink), `#ff8a65` (coral)
   - Shell ribbons: cycle through `#4dd0e1` (teal), `#b388ff` (lavender), `#69f0ae` (mint)
   - Use additive blending so overlapping ribbons create iridescent color mixing

4. **Animation loop --- audio-reactive:**
   - On each frame, if `analyserRef.current` exists and `isPlaying`:
     - Call `analyserRef.current.getByteFrequencyData(frequencyDataRef.current!)`
     - The `frequencyData` array has 128 values (0-255), one per frequency bin
     - Map frequency bins to ribbon amplitude:
       - Bins 0-15 (bass) -> control the base amplitude envelope of all ribbons
       - Bins 16-63 (mids) -> control the carrier frequency multiplier
       - Bins 64-127 (highs) -> control the "noise injection" near the center (the anomaly zone from Temporal Anomaly)
     - Normalize each bin group to 0.0-1.0 by dividing by 255
   - When `isPlaying` is false or no analyser: use gentle ambient sine animation (same as Temporal Anomaly default --- the ribbons still flow, just not reacting to audio)

5. **Vertex update per frame (adapted from Temporal Anomaly `updateRibbons`):**

   ```
   For each ribbon line:
     For each vertex point j:
       x = (j / numPoints) * viewWidth - halfWidth    // spread across view
       envelope = sin(x * envFreq + elapsed * 0.2) * amp * bassMultiplier
       y = envelope * sin(x * carrierFreq * midMultiplier + phaseOffset + elapsed * speed)

       // Audio-reactive anomaly zone (center turbulence)
       distToCenter = abs(x)
       if distToCenter < 4.0:
         severity = (1 - distToCenter / 4.0) * highMultiplier
         noise = sin(x * 15 + elapsed * 10) * severity * 0.8
         y += noise

       positions[j*3] = x
       positions[j*3+1] = y
       positions[j*3+2] = cos(x + elapsed) * 0.5
   ```

   Where:
   - `bassMultiplier` = `0.5 + avgBass * 2.0` (range: 0.5 when silent, up to 2.5 at full bass)
   - `midMultiplier` = `0.8 + avgMids * 0.6` (range: 0.8 to 1.4)
   - `highMultiplier` = `avgHighs * 2.0` (range: 0 to 2.0)

6. **Optional particle system (from Temporal Anomaly):**
   - Add a `THREE.Points` system with 1000-2000 particles that rise from the center
   - Particle alpha and rise speed modulated by bass intensity
   - Uses the same shader approach as the reference: `ShaderMaterial` with `lifetime` attribute
   - Prismatic color: `#ffb3ba` (warm pink from Temporal Anomaly UI text, adapted)

7. **Cleanup:** dispose geometries, materials, renderer on unmount.

### Step 2: Commit

```bash
git add frontend/src/components/music/AudioVisualizer.tsx
git commit -m "feat(frontend): audio-reactive Temporal Anomaly ribbon visualizer with prismatic colors"
```

---

## Task 8: Frontend --- Artist Profile Panel

**Files:**
- Create: `frontend/src/components/music/ArtistProfile.tsx`
- Create: `frontend/src/components/music/ArtistPhoto.tsx`

**Estimated time:** 3 minutes

### Step 1: Create ArtistPhoto component

- [ ] Create `frontend/src/components/music/ArtistPhoto.tsx`:

```typescript
interface ArtistPhotoProps {
  imageUrl?: string   // provided later --- use placeholder for now
  artistName: string
}
```

Structure:
- `div.artist-photo-container` (3:4 aspect ratio, vertical orientation)
- If `imageUrl` is provided: render `<img>` with `object-fit: cover`
- If not: render `div.artist-photo-placeholder` with text "PHOTO COMING SOON" centered
- Optionally add a frosted glass overlay at the bottom with the artist name (using the `.glass-panel` pattern from UI-implement-design.md):
  ```
  position: absolute; bottom: 0; left: 0; right: 0;
  backdrop-filter: blur(var(--glass-blur));
  background: var(--glass-bg);
  border-top: 1px solid var(--glass-border);
  ```

### Step 2: Create ArtistProfile component

- [ ] Create `frontend/src/components/music/ArtistProfile.tsx`:

```typescript
interface ArtistProfileProps {
  artist: Music | undefined
  isLoading: boolean
}
```

Structure (inside `div.music-artist-panel`):
1. **Artist photo** --- `<ArtistPhoto artistName={artist.artistName} />` (no imageUrl yet)
2. **Artist name** --- `<h2>` with `font-family: var(--font-mono)`, `text-transform: uppercase`, `letter-spacing: 0.1em`, color `--color-ink`
3. **Genre tag** --- small pill/badge: `font-family: var(--font-mono)`, `font-size: 0.65rem`, `border: 1px solid var(--color-prism-lavender)`, `color: var(--color-prism-lavender)`, `border-radius: var(--radius-lg)`, `padding: 2px 10px`
4. **Status** --- `font-family: var(--font-mono)`, `font-size: 0.75rem`, `color: var(--color-ink-muted)`. Prefix with a small pulsing dot (CSS animation) in `--color-prism-mint` to indicate "Recording in progress"
5. **Bio** --- `<p>` with `font-family: var(--font-body)` (Inter), `font-size: 0.85rem`, `color: var(--color-ink)`, `line-height: 1.6`
6. **Texture divider** --- the repeated character pattern from Symmetry Breaking: `white-space: nowrap; overflow: hidden; letter-spacing: 1px; opacity: 0.2`, using repeated `|` characters
7. **Platform links** --- `div.platform-links` with one `a.platform-link` per platform:
   - Spotify: label "SPOTIFY", href from `artist.platforms.spotify`
   - Douyin: label "DOUYIN", href from `artist.platforms.douyin`
   - NetEase Music: label "NETEASE", href from `artist.platforms.netease`
   - Each link opens in `_blank` with `rel="noopener noreferrer"`
   - Optional: add a small external link icon (Lucide `ExternalLink`) after the label
8. **Loading state** --- skeleton blocks matching each section (pulsing `--color-surface-1`)

### Step 3: Commit

```bash
git add frontend/src/components/music/ArtistProfile.tsx frontend/src/components/music/ArtistPhoto.tsx
git commit -m "feat(frontend): artist profile panel with photo placeholder, bio, and platform links"
```

---

## Task 9: Frontend --- Track Upload (Admin Only)

**Files:**
- Create: `frontend/src/components/music/TrackUploadButton.tsx`

**Estimated time:** 4 minutes

### Step 1: Create TrackUploadButton component

- [ ] Create `frontend/src/components/music/TrackUploadButton.tsx`:

```typescript
interface TrackUploadButtonProps {
  onUploadComplete: () => void   // called after successful upload to refetch track list
}
```

This component is only rendered when `useAuth().isAdmin` is true.

Structure and flow:

1. **Button in sidebar** --- rendered at the bottom of `TrackList` when admin. Label: `"+ UPLOAD TRACK"`. Styled like a note-item with `--color-prism-teal` left border.

2. **On click** --- opens a modal/overlay form. The modal should use the frosted glass aesthetic:
   - `backdrop-filter: blur(20px)`, `background: var(--glass-bg)`, `border: 1px solid var(--glass-border)`
   - Sharp corners (consistent with Note App aesthetic)

3. **Upload form fields:**
   - **File input** --- accepts `.mp3, .wav` only. Styled as a drag-and-drop zone or a minimal file picker button. Label: `"SELECT AUDIO FILE"`.
   - **Track title** --- text input, required. Styled with mono font, `background: var(--color-surface-1)`, `border: 1px solid var(--color-grid)`, `color: var(--color-ink)`.
   - **Track order** --- number input, default = number of existing tracks + 1.
   - **Submit button** --- `"UPLOAD"`. Disabled until file and title are provided.

4. **Upload flow (on submit):**
   ```
   a. Set loading state, disable form
   b. Call uploadTrackFile(file) --- uploads file to Supabase Storage, returns { audioUrl }
      (no token argument — fetchAuthJSON handles auth internally from the Supabase session)
   c. Calculate duration: create a temporary Audio element, load the file as ObjectURL, read duration on 'loadedmetadata'
   d. Call createTrack({ title, audioUrl, durationSeconds: Math.round(duration), trackOrder })
      (no token argument — same reason as above)
   e. On success: close modal, call onUploadComplete() to trigger refetch
   f. On error: show error message in the form (red text, --color-prism-pink)
   ```

5. **Duration detection helper:**
   ```typescript
   function getAudioDuration(file: File): Promise<number> {
     return new Promise((resolve, reject) => {
       const audio = new Audio()
       audio.addEventListener('loadedmetadata', () => {
         resolve(audio.duration)
         URL.revokeObjectURL(audio.src)
       })
       audio.addEventListener('error', () => {
         reject(new Error('Could not read audio file'))
         URL.revokeObjectURL(audio.src)
       })
       audio.src = URL.createObjectURL(file)
     })
   }
   ```

### Step 2: Commit

```bash
git add frontend/src/components/music/TrackUploadButton.tsx
git commit -m "feat(frontend): admin track upload modal with file upload to Supabase Storage"
```

---

## Task 10: Frontend --- MusicPage Orchestrator

**Files:**
- Create or rewrite: `frontend/src/pages/MusicPage.tsx`

**Estimated time:** 5 minutes

### Step 1: Build MusicPage

- [ ] Create (or rewrite the placeholder) `frontend/src/pages/MusicPage.tsx`:

This is the top-level page component for the MUSIC.md tab. It wires together all sub-components and manages the audio player state.

```typescript
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useTracks } from '../hooks/useTracks'
import { useArtist } from '../hooks/useArtist'
import { useAuth } from '../hooks/useAuth'   // from Phase 6
import { TrackList } from '../components/music/TrackList'
import { MusicPlayer } from '../components/music/MusicPlayer'
import { AudioVisualizer } from '../components/music/AudioVisualizer'
import { ArtistProfile } from '../components/music/ArtistProfile'
```

Component structure:

```
MusicPage
  ├── (sidebar zone) TrackList
  │     └── TrackUploadButton (admin only)
  └── (content zone) div.music-page
        ├── div.music-main
        │     └── AudioVisualizer (background, z-index: 0)
        ├── MusicPlayer (bottom bar within .music-page grid)
        └── ArtistProfile (right column)
```

Key wiring:

1. **Audio player state** --- `const player = useAudioPlayer()`. Pass its props down:
   - `TrackList` receives `currentTrackId: player.currentTrack?.id`, `onSelectTrack: player.play`
   - `MusicPlayer` receives `currentTrack`, `isPlaying`, `currentTime`, `duration`, `onTogglePlayPause`, `onSeek`
   - `AudioVisualizer` receives `analyserRef`, `frequencyDataRef`, `isPlaying`

2. **Track data** --- `const { data: tracks, isLoading: tracksLoading, refetch: refetchTracks } = useTracks()`
   - Pass `tracks ?? []` and `tracksLoading` to `TrackList`
   - Pass `refetchTracks` to `TrackUploadButton` as `onUploadComplete`

3. **Artist data** --- `const { data: artist, isLoading: artistLoading } = useArtist()`
   - Pass to `ArtistProfile`

4. **Auth** --- `const { isAdmin } = useAuth()`
   - Pass to `TrackList` to conditionally show upload button

5. **Sidebar integration** --- The `MusicPage` needs to render `TrackList` in the sidebar position. Based on the approach chosen in Task 5 Step 2:
   - **Option A (custom sidebar slot):** If `FileSystemLayout` supports `customSidebar`, render `TrackList` as the sidebar child.
   - **Option B (self-contained layout):** If `MusicPage` manages its own layout, wrap everything in a flex container with `TrackList` on the left (280px, matching sidebar width) and `div.music-page` filling the rest.

### Step 2: Register routes

- [ ] Ensure `App.tsx` routes the MUSIC.md tab to `MusicPage`. This should already exist from Phase 2 as a placeholder route (`/files/music` -> `MusicPage`). Verify it imports and renders the real component.

### Step 3: Commit

```bash
git add frontend/src/pages/MusicPage.tsx frontend/src/App.tsx
git commit -m "feat(frontend): MusicPage orchestrator wiring audio player, visualizer, track list, and artist profile"
```

---

## Task 11: Integration Testing and Polish

**Files:**
- Various touch-ups across previously created files

**Estimated time:** 5 minutes

### Step 1: End-to-end manual test

- [ ] Start backend: `cd backend && go run cmd/server/main.go`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Navigate to `/files/music`
- [ ] Verify: track list loads in sidebar (or shows empty state if no tracks in Supabase yet)
- [ ] Verify: artist profile panel shows on the right with bio, genre, status, platform links
- [ ] Verify: platform links open correct URLs in new tabs
- [ ] Verify: photo placeholder shows "PHOTO COMING SOON"
- [ ] Verify: visualizer canvas renders with ambient ribbon animation (no audio yet)
- [ ] Verify: mini player shows "Select a track" when no track selected

### Step 2: Test with audio (requires at least one track in Supabase)

- [ ] Log in as admin (if auth flow is implemented from Phase 6)
- [ ] Upload a .mp3 or .wav file via the upload button
- [ ] Verify: file uploads to Supabase Storage, track appears in sidebar
- [ ] Click the track in the sidebar
- [ ] Verify: audio plays, mini player shows track name, progress bar moves, play/pause toggles work
- [ ] Verify: visualizer ribbons react to audio frequencies (bass makes ribbons wider, highs add center turbulence)
- [ ] Seek by clicking on the progress bar --- verify playback jumps to correct position
- [ ] Verify: when track ends, `isPlaying` resets to false, ribbons return to ambient mode

### Step 3: Cross-browser check

- [ ] Test in Chrome (primary)
- [ ] Test in Safari (verify `-webkit-backdrop-filter`, `AudioContext` creation on user gesture)
- [ ] Test in Firefox (verify Web Audio API works with `crossOrigin = 'anonymous'`)

### Step 4: Responsive check

- [ ] Resize to tablet width (~768px): artist panel should stack below the main area
- [ ] Resize to mobile width (~375px): single column layout, sidebar becomes a collapsible drawer or top selector

### Step 5: Performance check

- [ ] Verify `requestAnimationFrame` loop runs smoothly at 60fps with visualizer active
- [ ] Check that Three.js renderer disposes properly on navigation away from MUSIC.md tab
- [ ] Verify no memory leaks: navigate to MUSIC.md, play audio, navigate away, navigate back. Audio should stop, no orphaned AudioContext instances.

### Step 6: Commit any fixes

```bash
git add -A
git commit -m "fix(frontend): integration fixes and polish for MUSIC.md page"
```

---

## Verification Checklist

Before marking Phase 8 complete, verify every item:

- [ ] `GET /api/music/artist` returns artist JSON (remapped from `/api/music`)
- [ ] `GET /api/music/tracks` returns track list from Supabase (empty array if no tracks)
- [ ] `POST /api/music/tracks/upload` accepts multipart .mp3/.wav and stores in Supabase Storage (admin auth required)
- [ ] `POST /api/music/tracks` creates a track record in Supabase (admin auth required)
- [ ] `DELETE /api/music/tracks/{id}` deletes a track (admin auth required)
- [ ] Track list sidebar renders dynamically from API data
- [ ] Clicking a track starts audio playback
- [ ] Mini player shows: track title, current time / duration, play/pause button, progress bar
- [ ] Clicking progress bar seeks to the correct position
- [ ] AudioVisualizer renders Temporal Anomaly-style ribbons in prismatic colors
- [ ] Ribbons react to audio frequency data when music is playing
- [ ] Ribbons fall back to ambient sine animation when paused or no audio
- [ ] Artist profile panel shows: name, genre, status, bio, platform links (Spotify, Douyin, NetEase)
- [ ] Platform links open in new tabs with correct URLs
- [ ] Vertical photo slot renders placeholder ("PHOTO COMING SOON")
- [ ] Admin upload button appears only when authenticated
- [ ] Upload flow: select file -> enter title -> upload -> track appears in list
- [ ] Music page respects existing theme tokens (colors, fonts, spacing, borders)
- [ ] No console errors or warnings
- [ ] Three.js cleanup on unmount (no memory leaks)
- [ ] Responsive layout works at mobile and tablet breakpoints
