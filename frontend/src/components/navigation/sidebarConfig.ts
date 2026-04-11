export interface SidebarItem {
  id: string
  label: string
  /** Optional date string shown above the title (Note App pattern) */
  date?: string
  /** Short preview text shown below the title */
  preview?: string
  /** Route segment appended to the tab route: /files/skill/resume */
  routeSegment: string
}

export interface TabConfig {
  id: string
  /** Display label with .md extension */
  label: string
  /** Base route: /files/soul */
  basePath: string
  /** Sidebar items for this tab. Empty array = no sidebar. */
  sidebarItems: SidebarItem[]
  /** Default sub-item to select when tab is activated (null = show tab-level content) */
  defaultItem: string | null
}

export const FILE_TABS: TabConfig[] = [
  {
    id: 'soul',
    label: 'SOUL.md',
    basePath: '/files/soul',
    sidebarItems: [
      { id: 'readme', label: 'README', preview: 'Who is the agent', routeSegment: '' },
      { id: 'projects', label: 'PROJECTS', preview: 'Currently cooking', routeSegment: 'projects' },
      { id: 'graph', label: 'GRAPH', preview: 'Knowledge graph', routeSegment: 'graph' },
    ],
    defaultItem: 'readme',
  },
  {
    id: 'skill',
    label: 'SKILL.md',
    basePath: '/files/skill',
    sidebarItems: [
      { id: 'skills', label: 'SKILLS', preview: 'Agent skill manifest — 10 domains', routeSegment: '' },
      { id: 'resume', label: 'RESUME', preview: 'Experience + education', routeSegment: 'resume' },
      { id: 'hackathons', label: 'HACKATHONS', preview: '24 missions · 9 wins', routeSegment: 'hackathons' },
    ],
    defaultItem: 'skills',
  },
  {
    id: 'memory',
    label: 'MEMORY.md',
    basePath: '/files/memory',
    // Items populated dynamically from blog posts in FileSystemLayout
    sidebarItems: [],
    // defaultItem: null is intentional — tab-level view shows "select a post/track" prompt
    // rather than auto-selecting the first entry (unlike SKILL.md which defaults to 'skills')
    defaultItem: null,
  },
  {
    id: 'contact',
    label: 'CONTACT.md',
    basePath: '/files/contact',
    sidebarItems: [
      { id: 'channels', label: 'Channels', preview: 'Email, GitHub, LinkedIn', routeSegment: '' },
      { id: 'message', label: 'Leave a Message', preview: 'Contact form', routeSegment: 'message' },
    ],
    defaultItem: 'channels',
  },
  {
    id: 'music',
    label: 'MUSIC.md',
    basePath: '/files/music',
    // Items populated dynamically from music tracks in FileSystemLayout
    sidebarItems: [],
    // defaultItem: null is intentional — tab-level view shows "select a post/track" prompt
    // rather than auto-selecting the first entry (unlike SKILL.md which defaults to 'skills')
    defaultItem: null,
  },
]

export const ADMIN_TAB: TabConfig = {
  id: 'admin',
  label: 'ADMIN.md',
  basePath: '/files/admin',
  sidebarItems: [
    { id: 'posts', label: 'POSTS', preview: 'Create & manage blog posts', routeSegment: '' },
    { id: 'feedback', label: 'FEEDBACK', preview: 'View visitor feedback', routeSegment: 'feedback' },
    { id: 'music', label: 'MUSIC', preview: 'Upload & manage tracks', routeSegment: 'music' },
    { id: 'notifications', label: 'NOTIFICATIONS', preview: 'Activity feed', routeSegment: 'notifications' },
  ],
  defaultItem: 'posts',
}
