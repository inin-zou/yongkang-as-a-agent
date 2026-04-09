import { useRef } from 'react'
import '../../styles/admin.css'

interface MediaUploadBarProps {
  mediaUrls: string[]
  uploading: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  compact?: boolean
}

export default function MediaUploadBar({ mediaUrls, uploading, onUpload, onRemove, compact }: MediaUploadBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const thumbHeight = compact ? 60 : 80

  return (
    <div className="media-upload-bar">
      {mediaUrls.length > 0 && (
        <div className="media-upload-thumbs">
          {mediaUrls.map((url, i) => (
            <div key={i} className="media-upload-thumb">
              {url.match(/\.(mp4|webm|mov)/i) ? (
                <video src={url} style={{ height: thumbHeight, borderRadius: 6, border: '1px solid var(--glass-border)' }} />
              ) : (
                <img src={url} alt="" style={{ height: thumbHeight, borderRadius: 6, border: '1px solid var(--glass-border)' }} />
              )}
              <button
                type="button"
                className="media-upload-remove"
                onClick={() => onRemove(i)}
                aria-label="Remove media"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="media-upload-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={onUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="admin-bar-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={compact ? { fontSize: '0.65rem' } : undefined}
        >
          {uploading ? 'UPLOADING...' : compact ? '\ud83d\udcf7 ADD MEDIA' : '\ud83d\udcf7 UPLOAD'}
        </button>
        {mediaUrls.length > 0 && (
          <span className="media-upload-count">
            {mediaUrls.length} file{mediaUrls.length > 1 ? 's' : ''} attached
          </span>
        )}
      </div>
    </div>
  )
}
