import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface BlogPostContentProps {
  html: string
}

export default function BlogPostContent({ html }: BlogPostContentProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG' && target.closest('.blog-post-content')) {
      const src = (target as HTMLImageElement).src
      if (src) setLightboxSrc(src)
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!lightboxSrc) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxSrc])

  // Render mermaid diagrams after content mounts
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const mermaidBlocks = el.querySelectorAll('pre.mermaid')
    if (mermaidBlocks.length === 0) return

    // Dynamic import so mermaid only loads when a post has diagrams
    import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#b388ff',
          primaryTextColor: '#EDEAE4',
          primaryBorderColor: '#555',
          lineColor: '#707070',
          secondaryColor: '#4dd0e1',
          tertiaryColor: '#3a3a3c',
        },
      })
      mermaid.run({ nodes: mermaidBlocks as NodeListOf<HTMLElement> })
    })
  }, [html])

  return (
    <>
      <div
        ref={contentRef}
        className="editor-content blog-post-content"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />

      {lightboxSrc && createPortal(
        <div className="blog-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="blog-lightbox-img" />
          <button className="blog-lightbox-close" aria-label="Close">×</button>
        </div>,
        document.body
      )}
    </>
  )
}
