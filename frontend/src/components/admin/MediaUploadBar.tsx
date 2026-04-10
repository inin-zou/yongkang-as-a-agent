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

  return (
    <div className={`media-upload-bar ${compact ? 'media-upload-bar--compact' : ''}`}>
      <div className="media-upload-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.heic,.heif"
          multiple
          onChange={onUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="admin-bar-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'UPLOADING...' : '📷 UPLOAD'}
        </button>
        {mediaUrls.length > 0 && (
          <span className="media-upload-count">
            {mediaUrls.length} file{mediaUrls.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {mediaUrls.length > 0 && (
        <div className="media-upload-grid">
          {mediaUrls.map((url, i) => (
            <div key={i} className="media-upload-chip">
              <div className="media-upload-chip-preview">
                {url.match(/\.(mp4|webm|mov)/i) ? (
                  <video src={url} />
                ) : (
                  <img src={url} alt="" />
                )}
              </div>
              <span className="media-upload-chip-name">
                {url.match(/\.(gif|png|jpg|jpeg|webp|mp4|webm|mov)/i)?.[0]?.toUpperCase() || 'FILE'}
              </span>
              <button
                type="button"
                className="media-upload-chip-remove"
                onClick={() => onRemove(i)}
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
