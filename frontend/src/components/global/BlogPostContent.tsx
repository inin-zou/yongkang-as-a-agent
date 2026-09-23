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

  // Auto-group images after a "Photos" heading into WeChat-style gallery
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const children = Array.from(el.children) as HTMLElement[]

    // Helper: is this element a "Photos" heading?
    const isPhotosHeading = (node: HTMLElement): boolean => {
      const tag = node.tagName
      if (tag !== 'H2' && tag !== 'H3' && tag !== 'P') return false
      const text = node.textContent?.trim().toLowerCase() ?? ''
      return text === 'photos'
    }

    // Helper: is this element an image container?
    const isImageEl = (node: HTMLElement): boolean => {
      if (node.tagName === 'IMG') return true
      if (node.tagName === 'FIGURE' && node.querySelector('img')) return true
      if (node.tagName === 'P' && node.children.length === 1 && node.children[0].tagName === 'IMG') return true
      return false
    }

    // Find each "Photos" heading and collect images that follow it
    for (let i = 0; i < children.length; i++) {
      if (!isPhotosHeading(children[i])) continue

      // Collect consecutive image elements after the heading
      const photos: HTMLElement[] = []
      let j = i + 1
      while (j < children.length && isImageEl(children[j]) && !children[j].classList.contains('img-gallery')) {
        photos.push(children[j])
        j++
      }

      if (photos.length === 0) continue

      // Turn the heading into the gallery label
      const heading = children[i]
      const label = document.createElement('p')
      label.className = 'img-gallery-label'
      label.textContent = 'Photos'
      heading.replaceWith(label)

      // Create gallery container
      const gallery = document.createElement('div')
      const count = Math.min(photos.length, 4)
      gallery.className = `img-gallery img-gallery--${count}`

      // Insert gallery after the label
      label.after(gallery)

      // Move images into gallery, wrapping bare imgs in figures
      for (const img of photos) {
        let figure: HTMLElement
        if (img.tagName === 'FIGURE') {
          figure = img
        } else if (img.tagName === 'P' && img.children[0]?.tagName === 'IMG') {
          figure = document.createElement('figure')
          figure.appendChild(img.children[0])
          img.remove()
        } else {
          figure = document.createElement('figure')
          figure.appendChild(img)
        }
        gallery.appendChild(figure)
      }

      // Refresh children array since DOM changed, restart scan
      children.length = 0
      children.push(...Array.from(el.children) as HTMLElement[])
      i = -1 // restart (will increment to 0)
    }
  }, [html])

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
        theme: 'base',
        themeVariables: {
          darkMode: false,
          background: 'transparent',
          primaryColor: '#f2f1ec',
          primaryTextColor: '#242421',
          primaryBorderColor: '#deddd6',
          lineColor: '#68675f',
          secondaryColor: '#faf9f6',
          secondaryTextColor: '#242421',
          secondaryBorderColor: '#deddd6',
          tertiaryColor: '#f2f1ec',
          tertiaryTextColor: '#68675f',
          tertiaryBorderColor: '#deddd6',
          noteBkgColor: '#f2f1ec',
          noteTextColor: '#68675f',
          noteBorderColor: '#deddd6',
          actorBkg: '#f2f1ec',
          actorTextColor: '#242421',
          actorBorder: '#deddd6',
          actorLineColor: '#68675f',
          signalColor: '#68675f',
          signalTextColor: '#242421',
          labelBoxBkgColor: '#f2f1ec',
          labelBoxBorderColor: '#deddd6',
          labelTextColor: '#242421',
          loopTextColor: '#68675f',
          activationBorderColor: '#68675f',
          activationBkgColor: '#faf9f6',
          sequenceNumberColor: '#242421',
          edgeLabelBackground: '#f2f1ec',
          clusterBkg: '#faf9f6',
          clusterBorder: '#deddd6',
          titleColor: '#242421',
          fontFamily: 'monospace',
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
        <div className="document-layout blog-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="blog-lightbox-img" />
          <button className="blog-lightbox-close" aria-label="Close">×</button>
        </div>,
        document.body
      )}
    </>
  )
}
