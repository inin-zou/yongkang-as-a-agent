import { queryKeys } from '../../../lib/queryKeys'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { fetchFeedback, deleteFeedback } from '../../../lib/api'
import type { Feedback } from '../../../types/index'

/* ─── Feedback viewer tab ─── */

export default function FeedbackTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  const { data: feedback, isLoading } = useQuery({
    queryKey: queryKeys.adminFeedback(),
    queryFn: () => fetchFeedback(token),
    enabled: !!token,
  })

  async function handleDelete(item: Feedback) {
    if (!confirm('Delete this feedback?')) return
    await deleteFeedback(token, item.id)
    queryClient.invalidateQueries({ queryKey: queryKeys.adminFeedback() })
  }

  if (isLoading) return <p className="admin-empty">Loading feedback...</p>

  if (!feedback || feedback.length === 0) {
    return <p className="admin-empty">No feedback yet.</p>
  }

  return (
    <>
      {feedback.map((item) => (
        <div key={item.id} className="admin-feedback-item">
          <div className="admin-feedback-header">
            <span className="admin-feedback-name">{item.name}</span>
            <span className="admin-feedback-date">{item.createdAt?.split('T')[0]}</span>
          </div>
          <div className="admin-feedback-message">{item.message}</div>
          <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(item)}>
            DELETE
          </button>
        </div>
      ))}
    </>
  )
}
