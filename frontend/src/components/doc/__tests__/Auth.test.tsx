import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuthButton from '../../global/AuthButton'
import AdminPage from '../../../pages/AdminPage'

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false, loginWithGitHub: vi.fn(), logout: vi.fn(), githubUsername: 'visitor', githubAvatar: '/avatar.jpg', session: null }))
vi.mock('../../../lib/auth', () => ({ useAuth: () => auth }))
vi.mock('../../../lib/api', () => ({ fetchUnreadCount: vi.fn(async () => ({ count: 0 })) }))
afterEach(() => { cleanup(); auth.user = null })
function mount(node: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
}
it('keeps the public sign-in action', () => {
  mount(<AuthButton />)
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(auth.loginWithGitHub).toHaveBeenCalled()
})
it('opens the account disclosure and preserves sign out', () => {
  auth.user = { id: 'visitor' }
  mount(<AuthButton />)
  const trigger = screen.getByRole('button', { name: /@visitor/ })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(auth.logout).toHaveBeenCalled()
})
it('keeps the unauthenticated admin login view', () => {
  mount(<AdminPage />)
  expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeInTheDocument()
})
