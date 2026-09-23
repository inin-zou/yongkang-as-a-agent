import { queryKeys } from '../../lib/queryKeys'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateMusicTrack, deleteMusicTrack } from '../../lib/api'
import { useAdminEdit } from '../../hooks/useAdminEdit'
import AdminBar from '../admin/AdminBar'
import TrackEditor from '../admin/TrackEditor'
import PostInteractions from '../global/PostInteractions'
import type { MusicTrack } from '../../types/index'
import AudioPlayer from './AudioPlayer'

/* ===== Track Detail View ===== */
export default function TrackView({ track, allTracks }: { track: MusicTrack; allTracks: MusicTrack[] }) {
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  async function handleSaveTrack(data: { slug: string; name: string; genre: string; original: string; notes: string; fileUrl: string; sortOrder: number }) {
    if (track.id) {
      await updateMusicTrack(token, track.id, data)
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.musicTracks() })
    setIsEditing(false)
  }

  async function handleDeleteTrack() {
    if (!track.id) return
    if (!window.confirm(`Delete track "${track.name}"?`)) return
    await deleteMusicTrack(token, track.id)
    await queryClient.invalidateQueries({ queryKey: queryKeys.musicTracks() })
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
