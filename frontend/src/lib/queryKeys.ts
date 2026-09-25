/** Keep these tuples flat: public/admin caches and prefix invalidations are intentional. */
export const queryKeys = {
  posts: () => ['posts'] as const,
  post: (slug: string) => ['post', slug] as const,
  // No username means the two-part invalidation prefix; an empty username is a real key.
  postStats: (slug: string, ...user: [] | [string]) => ['post-stats', slug, ...user] as const,
  postComments: (slug: string) => ['post-comments', slug] as const,
  adminPosts: () => ['admin-posts'] as const,
  adminFeedback: () => ['admin-feedback'] as const,
  adminNotifications: () => ['admin-notifications'] as const,
  adminUnread: () => ['admin-unread'] as const,
  adminMusicTracks: () => ['admin-music-tracks'] as const,
  adminTraffic: (days: number) => ['admin-traffic', days] as const,
  music: () => ['music'] as const,
  musicTracks: () => ['music-tracks'] as const,
  page: (id: string) => ['pages', id] as const,
  guestbook: () => ['guestbook'] as const,
  skills: () => ['skills'] as const,
  hackathons: () => ['hackathons'] as const,
  experience: () => ['experience'] as const,
  githubContributions: () => ['github-contributions'] as const,
  cvPdf: (lang: 'en' | 'zh') => ['cv-pdf', lang] as const,
  cvSource: (lang: 'en' | 'zh', file: 'tex' | 'cls') => ['cv-source', lang, file] as const,
}
