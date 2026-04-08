import { useAuth } from '../lib/AuthContext'

export function useAdminEdit() {
  const { user, session } = useAuth()
  const isAdmin = !!user
  const token = session?.access_token ?? ''
  return { isAdmin, token }
}
