import { useEffect } from 'react'

// Client-side page heads for in-app navigation. The server renders the same
// titles and descriptions into the first HTML response (backend/pkg/service/seo.go);
// keep the two in step.
export const SITE_URL = 'https://yongkang.dev'
export const DEFAULT_TITLE = 'Yongkang Zou — AI Engineer'
export const DEFAULT_DESCRIPTION =
  'AI Engineer in Paris. My way of learning: BFS → DFS — try everything that interests me, then build solid projects real users depend on.'

export interface PageMeta {
  title: string
  description?: string
  /** Path without query or hash, e.g. /files/soul/graph. */
  path: string
  noindex?: boolean
}

export const pageTitle = (name: string) => `${name} — Yongkang Zou`

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Sets the document head for the current page; pass null to leave it to a child. */
export function usePageMeta(meta: PageMeta | null) {
  const title = meta?.title
  const description = meta?.description || DEFAULT_DESCRIPTION
  const path = meta?.path
  const noindex = meta?.noindex ?? false
  useEffect(() => {
    if (!title || !path) return
    const url = SITE_URL + path
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url
    const robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) setMeta('name', 'robots', 'noindex')
    else robots?.remove()
  }, [title, description, path, noindex])
}
