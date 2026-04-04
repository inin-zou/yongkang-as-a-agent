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
    sidebarItems: [
      { id: 'pimmies-dilemma', label: "PIMMIE'S DILEMMA", preview: 'Cover · Pimmie, PND & Drake', routeSegment: 'pimmies-dilemma' },
      { id: 'soft-spot', label: 'Soft Spot', preview: 'Cover · keshi', routeSegment: 'soft-spot' },
      { id: 'dream', label: 'Dream', preview: 'Cover · keshi', routeSegment: 'dream' },
    ],
    // defaultItem: null is intentional — tab-level view shows "select a post/track" prompt
    // rather than auto-selecting the first entry (unlike SKILL.md which defaults to 'skills')
    defaultItem: null,
  },
]
