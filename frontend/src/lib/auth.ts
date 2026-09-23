import { createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'

// Context and hook live apart from AuthProvider so that file only exports components (fast refresh).
export interface AuthState {
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

export const AuthContext = createContext<AuthState | undefined>(undefined)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
