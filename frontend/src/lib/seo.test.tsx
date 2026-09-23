import { render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { DEFAULT_DESCRIPTION, usePageMeta, type PageMeta } from './seo'

function Page({ meta }: { meta: PageMeta | null }) {
  usePageMeta(meta)
  return null
}

const head = (selector: string, attr = 'content') => document.head.querySelector(selector)?.getAttribute(attr)

afterEach(() => { document.head.innerHTML = ''; document.title = '' })

it('writes title, description, canonical and social tags for the page', () => {
  render(<Page meta={{ title: 'CV — Yongkang Zou', description: 'The CV.', path: '/files/skill/cv' }} />)
  expect(document.title).toBe('CV — Yongkang Zou')
  expect(head('meta[name="description"]')).toBe('The CV.')
  expect(head('meta[property="og:title"]')).toBe('CV — Yongkang Zou')
  expect(head('meta[property="og:url"]')).toBe('https://yongkang.dev/files/skill/cv')
  expect(head('meta[name="twitter:description"]')).toBe('The CV.')
  expect(head('link[rel="canonical"]', 'href')).toBe('https://yongkang.dev/files/skill/cv')
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
})

it('falls back to the site description and toggles noindex', () => {
  const { rerender } = render(<Page meta={{ title: 'Admin', path: '/files/admin', noindex: true }} />)
  expect(head('meta[name="description"]')).toBe(DEFAULT_DESCRIPTION)
  expect(head('meta[name="robots"]')).toBe('noindex')
  rerender(<Page meta={{ title: 'Soul', path: '/files/soul' }} />)
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
})

it('leaves the head alone when given null', () => {
  document.title = 'Set by a child'
  render(<Page meta={null} />)
  expect(document.title).toBe('Set by a child')
})
