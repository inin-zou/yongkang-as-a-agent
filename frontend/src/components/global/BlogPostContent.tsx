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

  // Auto-group consecutive images into WeChat-style gallery
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    // Find all direct children that are image containers (p>img, figure>img, or img)
    // but NOT already inside an .img-gallery
    const children = Array.from(el.children) as HTMLElement[]
    let i = 0
    while (i < children.length) {
      const child = children[i]
      // Skip if already in a gallery
      if (child.classList.contains('img-gallery')) { i++; continue }

      // Check if this element is an image container
      const isImageEl = (node: HTMLElement): boolean => {
        if (node.tagName === 'IMG') return true
        if (node.tagName === 'FIGURE' && node.querySelector('img')) return true
        if (node.tagName === 'P' && node.children.length === 1 && node.children[0].tagName === 'IMG') return true
        return false
      }

      if (!isImageEl(child)) { i++; continue }

      // Collect consecutive image elements
      const group: HTMLElement[] = [child]
      let j = i + 1
      while (j < children.length && isImageEl(children[j]) && !children[j].classList.contains('img-gallery')) {
        group.push(children[j])
        j++
      }

      // Only auto-gallery if 2+ consecutive images
      if (group.length >= 2) {
        const gallery = document.createElement('div')
        const count = Math.min(group.length, 4)
        gallery.className = `img-gallery img-gallery--${count}`

        // Insert gallery before the first image in the group
        child.parentNode!.insertBefore(gallery, child)

        // Move images into gallery, wrapping bare imgs in figures
        for (const img of group) {
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

        // Refresh children array since DOM changed
        const newChildren = Array.from(el.children) as HTMLElement[]
        children.length = 0
        children.push(...newChildren)
        // Don't increment i — the gallery is now at position i
        i++
      } else {
        i++
      }
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
          darkMode: true,
          background: 'transparent',
          primaryColor: '#2a2a2e',
          primaryTextColor: '#EDEAE4',
          primaryBorderColor: '#555555',
          lineColor: '#707070',
          secondaryColor: '#333338',
          secondaryTextColor: '#EDEAE4',
          secondaryBorderColor: '#555555',
          tertiaryColor: '#3a3a3c',
          tertiaryTextColor: '#a8a8a8',
          tertiaryBorderColor: '#555555',
          noteBkgColor: '#2a2a2e',
          noteTextColor: '#a8a8a8',
          noteBorderColor: '#555555',
          actorBkg: '#2a2a2e',
          actorTextColor: '#EDEAE4',
          actorBorder: '#555555',
          actorLineColor: '#707070',
          signalColor: '#707070',
          signalTextColor: '#EDEAE4',
          labelBoxBkgColor: '#2a2a2e',
          labelBoxBorderColor: '#555555',
          labelTextColor: '#EDEAE4',
          loopTextColor: '#a8a8a8',
          activationBorderColor: '#707070',
          activationBkgColor: '#333338',
          sequenceNumberColor: '#EDEAE4',
          edgeLabelBackground: '#2a2a2e',
          clusterBkg: 'rgba(255,255,255,0.04)',
          clusterBorder: '#555555',
          titleColor: '#EDEAE4',
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
        <div className="blog-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="blog-lightbox-img" />
          <button className="blog-lightbox-close" aria-label="Close">×</button>
        </div>,
        document.body
      )}
    </>
  )
}
