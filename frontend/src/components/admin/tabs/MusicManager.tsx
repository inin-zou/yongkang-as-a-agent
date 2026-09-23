import { queryKeys } from '../../../lib/queryKeys'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { fetchMusicTracks, createMusicTrack, updateMusicTrack, deleteMusicTrack } from '../../../lib/api'
import type { MusicTrack } from '../../../types/index'
import MusicTrackEditor from '../MusicTrackEditor'

/* ─── Music manager tab ─── */

export default function MusicManager() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: tracks, isLoading } = useQuery({
    queryKey: queryKeys.adminMusicTracks(),
    queryFn: fetchMusicTracks,
    enabled: !!token,
  })

  async function handleDelete(track: MusicTrack) {
    if (!track.id || !confirm(`Delete "${track.name}"?`)) return
    await deleteMusicTrack(token, track.id)
    queryClient.invalidateQueries({ queryKey: queryKeys.adminMusicTracks() })
    queryClient.invalidateQueries({ queryKey: queryKeys.musicTracks() })
  }

  if (mode === 'create' || (mode === 'edit' && editingTrack)) {
    return (
      <MusicTrackEditor
        initial={editingTrack ?? undefined}
        uploading={uploading}
        setUploading={setUploading}
        onSave={async (data) => {
          if (editingTrack?.id) {
            await updateMusicTrack(token, editingTrack.id, data)
          } else {
            await createMusicTrack(token, data)
          }
          queryClient.invalidateQueries({ queryKey: queryKeys.adminMusicTracks() })
          queryClient.invalidateQueries({ queryKey: queryKeys.musicTracks() })
          setMode('list')
          setEditingTrack(null)
        }}
        onCancel={() => { setMode('list'); setEditingTrack(null) }}
      />
    )
  }

  if (isLoading) return <p className="admin-empty">Loading tracks...</p>

  return (
    <>
      <button
        className="admin-btn admin-bar-btn-add"
        onClick={() => setMode('create')}
        style={{ marginBottom: 'var(--space-md)' }}
      >
        + NEW TRACK
      </button>

      {!tracks || tracks.length === 0 ? (
        <p className="admin-empty">No tracks yet. Upload your first one.</p>
      ) : (
        tracks.map((track) => (
          <div key={track.id} className="admin-post-item">
            <div className="admin-post-info">
              <div className="admin-post-title">{track.name}</div>
              <div className="admin-post-slug">{track.genre} — {track.original === 'true' || track.original === 'original' ? 'Original' : 'Cover'}</div>
            </div>
            <div className="admin-actions">
              <button className="admin-btn" onClick={() => { setEditingTrack(track); setMode('edit') }}>
                EDIT
              </button>
              <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(track)}>
                DELETE
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}
