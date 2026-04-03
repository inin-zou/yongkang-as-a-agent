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
      { id: 'skills', label: 'SKILLS', preview: 'Arsenal overview — all domains', routeSegment: '' },
      { id: 'resume', label: 'RESUME', preview: 'Experience timeline', routeSegment: 'resume' },
      { id: 'hackathons', label: 'HACKATHONS', preview: 'Map + timeline animation', routeSegment: 'hackathons' },
      { id: 'certifications', label: 'CERTIFICATIONS', preview: 'Education + certs', routeSegment: 'certifications' },
    ],
    defaultItem: 'skills',
  },
  {
    id: 'memory',
    label: 'MEMORY.md',
    basePath: '/files/memory',
    sidebarItems: [
      // Placeholder items — real blog posts come from Supabase in Phase 7
      { id: 'post-placeholder-1', label: 'Stockholm Hackathon', date: '2026-03', preview: 'Reflections on the trip to Sweden...', routeSegment: 'stockholm-hackathon' },
      { id: 'post-placeholder-2', label: 'Joining Epiminds', date: '2026-02', preview: 'New chapter in the assembling...', routeSegment: 'joining-epiminds' },
      { id: 'leave-note', label: 'LEAVE A NOTE', preview: 'Share your thoughts', routeSegment: 'feedback' },
    ],
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
      // Placeholder tracks — real tracks come from Supabase Storage in Phase 8
      { id: 'track-1', label: '失眠', preview: 'Original single', routeSegment: 'track-1' },
      { id: 'track-2', label: 'Inhibitor', preview: 'EP track', routeSegment: 'track-2' },
    ],
    // defaultItem: null is intentional — tab-level view shows "select a post/track" prompt
    // rather than auto-selecting the first entry (unlike SKILL.md which defaults to 'skills')
    defaultItem: null,
  },
]
