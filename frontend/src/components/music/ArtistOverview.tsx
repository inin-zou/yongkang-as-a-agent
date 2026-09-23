import ArtistProfileEditor from './ArtistProfileEditor'
import { queryKeys } from '../../lib/queryKeys'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMusic, fetchPage, updatePage, createMusicTrack } from '../../lib/api'
import { useAdminEdit } from '../../hooks/useAdminEdit'
import AdminBar from '../admin/AdminBar'
import TrackEditor from '../admin/TrackEditor'
import type { MusicTrack } from '../../types/index'
import TrackList from './TrackList'

export default function ArtistOverview({ tracks }: { tracks: MusicTrack[] }) {
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const [addingTrack, setAddingTrack] = useState(false)
  const queryClient = useQueryClient()

  const { data: music, isLoading, error } = useQuery({
    queryKey: queryKeys.music(),
    queryFn: fetchMusic,
  })

  const { data: musicProfile } = useQuery({
    queryKey: queryKeys.page('music'),
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
      queryClient.setQueryData(queryKeys.page('music'), updated)
      setIsEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTrack(data: { slug: string; name: string; genre: string; original: string; notes: string; fileUrl: string; sortOrder: number }) {
    await createMusicTrack(token, data)
    await queryClient.invalidateQueries({ queryKey: queryKeys.musicTracks() })
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
        <h1>Music</h1>
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
      <h1>Music</h1>
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
          <ArtistProfileEditor
            editArtistName={editArtistName}
            editGenre={editGenre}
            editBio={editBio}
            editStatus={editStatus}
            editLocation={editLocation}
            saveError={saveError}
            setEditArtistName={setEditArtistName}
            setEditGenre={setEditGenre}
            setEditBio={setEditBio}
            setEditStatus={setEditStatus}
            setEditLocation={setEditLocation}
          />
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

            <div style={{ clear: 'both' }} />

            <TrackList tracks={tracks} />
            <section className="music-platforms" aria-labelledby="music-platforms-heading">
              {(status || location) && (
                <p className="music-status">{[status, location].filter(Boolean).join(' · ')}</p>
              )}
              <h2 id="music-platforms-heading">Platforms</h2>
              <div className="music-platform-links">
                {Object.entries(platforms).map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-interactive
                  >
                    {name} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
