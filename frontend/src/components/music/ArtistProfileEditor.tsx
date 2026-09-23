type Props = {
  editArtistName: string
  editGenre: string
  editBio: string
  editStatus: string
  editLocation: string
  saveError: string
  setEditArtistName: (value: string) => void
  setEditGenre: (value: string) => void
  setEditBio: (value: string) => void
  setEditStatus: (value: string) => void
  setEditLocation: (value: string) => void
}

export default function ArtistProfileEditor({
  editArtistName,
  editGenre,
  editBio,
  editStatus,
  editLocation,
  saveError,
  setEditArtistName,
  setEditGenre,
  setEditBio,
  setEditStatus,
  setEditLocation,
}: Props) {
  return (
    <div className="admin-editor">
      {saveError && <div className="admin-error">{saveError}</div>}

      <div>
        <label htmlFor="music-artist" className="memory-feedback-label">Artist Name</label>
        <input
          id="music-artist"
          type="text"
          className="memory-feedback-input"
          value={editArtistName}
          onChange={(e) => setEditArtistName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="music-genre" className="memory-feedback-label">Genre</label>
        <input
          id="music-genre"
          type="text"
          className="memory-feedback-input"
          value={editGenre}
          onChange={(e) => setEditGenre(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="music-bio" className="memory-feedback-label">Bio</label>
        <textarea
          id="music-bio"
          className="memory-feedback-input"
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
          rows={4}
        />
      </div>

      <div>
        <label htmlFor="music-status" className="memory-feedback-label">Status</label>
        <input
          id="music-status"
          type="text"
          className="memory-feedback-input"
          value={editStatus}
          onChange={(e) => setEditStatus(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="music-location" className="memory-feedback-label">Location</label>
        <input
          id="music-location"
          type="text"
          className="memory-feedback-input"
          value={editLocation}
          onChange={(e) => setEditLocation(e.target.value)}
        />
      </div>

    </div>
  )
}
