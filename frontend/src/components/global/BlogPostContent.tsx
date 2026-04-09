import { useState, useCallback } from 'react'

interface BlogPostContentProps {
  html: string
}

export default function BlogPostContent({ html }: BlogPostContentProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG' && target.closest('.blog-post-content')) {
      const src = (target as HTMLImageElement).src
      if (src) setLightboxSrc(src)
    }
  }, [])

  return (
    <>
      <div
        className="editor-content blog-post-content"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />

      {lightboxSrc && (
        <div className="blog-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="blog-lightbox-img" />
          <button className="blog-lightbox-close" aria-label="Close">×</button>
        </div>
      )}
    </>
  )
}
