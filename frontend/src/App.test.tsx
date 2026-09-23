import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('./lib/AuthContext', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('./lib/MusicPlayerContext', () => ({ MusicPlayerProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('./components/intro/IntroLab', () => ({ default: () => <h1>Journey intro</h1> }))

afterEach(cleanup)
it('routes the entry and the lab alias to the intro', async () => {
  window.history.replaceState(null, '', '/')
  const { default: App } = await import('./App')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Journey intro' })).toBeInTheDocument()
  await act(async () => {
    window.history.pushState(null, '', '/lab/intro')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  expect(await screen.findByRole('heading', { name: 'Journey intro' })).toBeInTheDocument()
})
