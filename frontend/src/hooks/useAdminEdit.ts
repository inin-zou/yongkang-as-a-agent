import { useAuth } from '../lib/auth'

export function useAdminEdit() {
  const { user, session } = useAuth()
  const isAdmin = !!user
  const token = session?.access_token ?? ''
  return { isAdmin, token }
}
