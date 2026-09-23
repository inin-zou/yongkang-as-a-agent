import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'

describe('query key compatibility', () => {
  it('matches the existing literal arrays, including empty usernames and invalidation prefixes', () => {
    const cases = [
      [queryKeys.posts(), ['posts']],
      [queryKeys.post('first'), ['post', 'first']],
      [queryKeys.postStats('first'), ['post-stats', 'first']],
      [queryKeys.postStats('first', ''), ['post-stats', 'first', '']],
      [queryKeys.postStats('first', 'reader'), ['post-stats', 'first', 'reader']],
      [queryKeys.postComments('first'), ['post-comments', 'first']],
      [queryKeys.adminPosts(), ['admin-posts']],
      [queryKeys.adminFeedback(), ['admin-feedback']],
      [queryKeys.adminNotifications(), ['admin-notifications']],
      [queryKeys.adminUnread(), ['admin-unread']],
      [queryKeys.adminMusicTracks(), ['admin-music-tracks']],
      [queryKeys.music(), ['music']],
      [queryKeys.musicTracks(), ['music-tracks']],
      [queryKeys.page('music'), ['pages', 'music']],
      [queryKeys.page('soul'), ['pages', 'soul']],
      [queryKeys.page('contact'), ['pages', 'contact']],
      [queryKeys.page('skill'), ['pages', 'skill']],
      [queryKeys.guestbook(), ['guestbook']],
      [queryKeys.skills(), ['skills']],
      [queryKeys.hackathons(), ['hackathons']],
      [queryKeys.experience(), ['experience']],
      [queryKeys.githubContributions(), ['github-contributions']],
      [queryKeys.cvPdf('en'), ['cv-pdf', 'en']],
      [queryKeys.cvPdf('zh'), ['cv-pdf', 'zh']],
      [queryKeys.cvSource('en', 'tex'), ['cv-source', 'en', 'tex']],
      [queryKeys.cvSource('zh', 'cls'), ['cv-source', 'zh', 'cls']],
    ]
    for (const [actual, literal] of cases) expect(actual).toEqual(literal)
  })

  it('invalidates all username variants of stats without touching other posts', async () => {
    const client = new QueryClient()
    client.setQueryData(['post-stats', 'first', ''], { likeCount: 1 })
    client.setQueryData(['post-stats', 'first', 'reader'], { likeCount: 1 })
    client.setQueryData(['post-stats', 'second', 'reader'], { likeCount: 2 })
    await client.invalidateQueries({ queryKey: queryKeys.postStats('first') })
    expect(client.getQueryState(['post-stats', 'first', ''])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['post-stats', 'first', 'reader'])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['post-stats', 'second', 'reader'])?.isInvalidated).toBe(false)
    client.clear()
  })
})
