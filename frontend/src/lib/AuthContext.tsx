import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  loginWithGitHub: () => Promise<void>
  logout: () => Promise<void>
  getAuthHeaders: () => Record<string, string>
  /** GitHub username from user metadata */
  githubUsername: string
  /** GitHub avatar URL */
  githubAvatar: string
  /** GitHub profile URL */
  githubProfileUrl: string
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function extractGitHubMeta(user: User | null) {
  const meta = user?.user_metadata ?? {}
  return {
    githubUsername: meta.user_name || meta.preferred_username || '',
    githubAvatar: meta.avatar_url || '',
    githubProfileUrl: meta.user_name ? `https://github.com/${meta.user_name}` : '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Clear all cached data (admin queries, post stats, etc.)
    queryClient.clear()
  }, [queryClient])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = session?.access_token
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [session])

  const { githubUsername, githubAvatar, githubProfileUrl } = extractGitHubMeta(user)

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      loginWithGitHub, logout, getAuthHeaders,
      githubUsername, githubAvatar, githubProfileUrl,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
