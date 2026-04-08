import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/AuthContext'
import { fetchUnreadCount } from '../../lib/api'

const ADMIN_GITHUB_USERNAME = 'yongkangzou'

export default function AuthButton() {
  const { user, loading, loginWithGitHub, logout, githubUsername, githubAvatar, session } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isAdmin = githubUsername === ADMIN_GITHUB_USERNAME
  const token = session?.access_token ?? ''

  const { data: unread } = useQuery({
    queryKey: ['admin-unread'],
    queryFn: () => fetchUnreadCount(token),
    enabled: isAdmin && !!token,
    refetchInterval: 30_000,
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (loading) return null

  if (!user) {
    return (
      <button className="auth-button auth-signin" onClick={loginWithGitHub}>
        Sign in
      </button>
    )
  }

  const badgeCount = unread?.count ?? 0

  return (
    <div className="auth-button" ref={ref}>
      <button className="auth-trigger" onClick={() => setOpen(!open)}>
        <span className="auth-avatar-wrapper">
          <img src={githubAvatar} alt={githubUsername} className="auth-avatar" />
          {isAdmin && badgeCount > 0 && <span className="auth-badge" />}
        </span>
        <span className="auth-username">@{githubUsername}</span>
      </button>

      {open && (
        <div className="auth-dropdown">
          {isAdmin && (
            <Link
              to="/files/admin"
              className="auth-dropdown-item"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          )}
          <button
            className="auth-dropdown-item"
            onClick={() => { logout(); setOpen(false) }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
