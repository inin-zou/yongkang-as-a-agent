# Persistent Music Player Bar

## Summary

Add a global music player that persists across tab navigation within `/files/*`. Slim bar at the bottom of the app window shows when a track is playing. Full AudioPlayer with waveform stays on MusicPage track view.

## State Management

New `MusicPlayerContext` (pattern: AuthContext) wrapping App at top level.

**State:**
- `currentTrack: MusicTrack | null`
- `playlist: MusicTrack[]`, `playlistIndex: number`
- `playing: boolean`, `currentTime: number`, `duration: number`
- `repeatMode: 'off' | 'all' | 'one'`

**Actions:**
- `play(track, allTracks)` — starts track, queues everything after it in the list
- `next()`, `prev()` — navigate playlist, respect repeat mode
- `togglePlay()`, `seek(time)`, `setRepeatMode(mode)`

**Audio element:** Single `<audio>` owned by the provider, never unmounts. On `ended`, auto-advance to next track based on repeat mode.

## Player Bar UI

Slim bar (~40px) at bottom of `.app-window` in FileSystemLayout. Only renders when `currentTrack !== null`.

**Layout:** Left: prev/play-pause/next buttons. Center: progress bar (clickable seek) + time. Right: track name + genre + repeat toggle.

**Style:** Glass background (--glass-bg, --glass-border), --font-mono text, prismatic gradient on progress fill. Slide-up animation on appear.

**Visibility rules:**
- Hidden when no track has been played
- Hidden when on MusicPage track detail view (AudioPlayer is showing)
- Visible on all other /files/* pages when a track is playing/paused

## MusicPage Integration

Keep existing AudioPlayer component in TrackView. Modify it to:
- Use the global `<audio>` element from MusicPlayerContext instead of creating its own
- Read `playing`, `currentTime`, `duration` from context
- Call `togglePlay()`, `seek()` from context
- Keep waveform extraction (runs against the same audio src)

Track list: each track's play button calls `play(track, allTracksFromIndex)`. Currently-playing track gets a visual indicator.

## Component Placement

```
App.tsx
└── MusicPlayerProvider  ← wraps everything
    └── AuthProvider
        └── RouterProvider
            └── FileSystemLayout
                ├── TabNavigation
                ├── app-body (sidebar + editor)
                └── MusicPlayerBar  ← bottom of app-window
```

## Files

- **New:** `frontend/src/lib/MusicPlayerContext.tsx`
- **New:** `frontend/src/components/global/MusicPlayerBar.tsx`
- **New:** `frontend/src/styles/player.css`
- **Modify:** `frontend/src/App.tsx` — wrap with MusicPlayerProvider
- **Modify:** `frontend/src/components/global/FileSystemLayout.tsx` — render MusicPlayerBar at bottom
- **Modify:** `frontend/src/pages/MusicPage.tsx` — AudioPlayer reads from context, track list calls play()

## Out of Scope

- Shuffle mode (can add later)
- Volume control (browser native is fine)
- Keyboard shortcuts
