import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setPostArchived } from '../../lib/api'
import type { BlogPost } from '../../types'

export default function PostArchiveToggle({ post, token }: { post: BlogPost; token: string }) {
  const client = useQueryClient()
  const mutation = useMutation({
    // Archive-only write: never resends content, never bumps updated_at.
    mutationFn: () => setPostArchived(token, post.id, !post.archived),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['posts'] }),
        client.invalidateQueries({ queryKey: ['admin-posts'] }),
        client.invalidateQueries({ queryKey: ['post', post.slug] }),
      ])
    },
  })

  return <>
    <button className="admin-btn" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? 'Saving…' : post.archived ? 'Unarchive' : 'Archive'}
    </button>
    {mutation.isError && <span role="alert">Could not update archive status. Please try again.</span>}
  </>
}
