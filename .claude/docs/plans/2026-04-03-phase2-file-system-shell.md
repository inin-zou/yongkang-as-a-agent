# Phase 2: File System Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Phase 1 frontend from simple About/Projects/Contact tabs into a Note App-style file system layout with `.md` file tabs (SOUL.md, SKILL.md, MEMORY.md, CONTACT.md, MUSIC.md), a context-dependent sidebar, and a main content panel — establishing the navigation shell for all future phases.

**Architecture:** The existing `TabNavigation.tsx` and `Layout.tsx` are replaced with a three-zone `FileSystemLayout` component: top tab bar (`.md` file tabs with trapezoid shape), left sidebar (note-items varying by active tab), and right main panel (content area via `<Outlet />`). React Router nested routes map `/files/:tab/:item?` to the correct tab + sidebar selection. Existing global components (GridBackground, CrosshairCursor, NoiseOverlay) remain untouched. Existing page components (About, Projects, Contact) are retired; new placeholder page shells are created per `.md` tab.

**Tech Stack:** React 19, React Router v7 (nested routes + `useParams`), TypeScript 5, CSS custom properties (existing theme tokens), Vite 6

**Reference docs:**
- `.claude/docs/UX-design.md` — file system layout, site map, sidebar content per tab, breadcrumb spec
- `.claude/docs/UI-implement-design.md` — Note App tab system (`clip-path` trapezoid), sidebar list pattern (`.note-item`), scrollbar styling, component architecture
- `.claude/docs/portfolio-design-principles.md` — edge shape system (tabs = sharp, 0px bottom / 2px top), typography (Space Mono for labels, Inter for body), Apple-style clean design

---

## File Structure (Phase 2 changes)

```
frontend/src/
├── components/
│   ├── global/
│   │   ├── GridBackground.tsx          ← UNCHANGED
│   │   ├── CrosshairCursor.tsx         ← UNCHANGED
│   │   ├── NoiseOverlay.tsx            ← UNCHANGED
│   │   ├── TabNavigation.tsx           ← REWRITTEN (About/Projects/Contact → .md file tabs)
│   │   ├── Layout.tsx                  ← MODIFIED (landing-only wrapper, delegates inner to FileSystemLayout)
│   │   └── FileSystemLayout.tsx        ← NEW (tabs + sidebar + panel three-zone shell)
│   └── navigation/
│       ├── Sidebar.tsx                 ← NEW (note-item list with selected state)
│       ├── Breadcrumb.tsx              ← NEW (file path breadcrumb: ~/agent/SKILL.md/HACKATHONS)
│       └── sidebarConfig.ts            ← NEW (data: which sidebar items per tab)
├── pages/
│   ├── Landing.tsx                     ← MODIFIED (navigate to /files/soul instead of /about)
│   ├── About.tsx                       ← DELETED (replaced by SoulPage)
│   ├── Projects.tsx                    ← DELETED (replaced by SkillPage sub-items)
│   ├── Contact.tsx                     ← DELETED (replaced by ContactPage)
│   ├── SoulPage.tsx                    ← NEW (placeholder for SOUL.md)
│   ├── SkillPage.tsx                   ← NEW (placeholder shell, routes to sub-items)
│   ├── MemoryPage.tsx                  ← NEW (placeholder for MEMORY.md)
│   ├── ContactPage.tsx                 ← NEW (placeholder for CONTACT.md)
│   └── MusicPage.tsx                   ← NEW (placeholder for MUSIC.md)
├── App.tsx                             ← REWRITTEN (new route tree)
├── lib/api.ts                          ← UNCHANGED
├── types/index.ts                      ← UNCHANGED
├── styles/
│   ├── theme.css                       ← UNCHANGED
│   └── file-system.css                 ← NEW (sidebar + breadcrumb + layout styles)
├── main.tsx                            ← UNCHANGED
└── index.css                           ← MODIFIED (import file-system.css)
```

---

## Task 1: Sidebar Configuration Data

**Files:**
- Create: `frontend/src/components/navigation/sidebarConfig.ts`

**Estimated time:** 2-3 minutes

- [ ] **Step 1: Define sidebar item type and tab-to-items mapping**

Create `frontend/src/components/navigation/sidebarConfig.ts` with:

```typescript
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
    sidebarItems: [],
    defaultItem: null,
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
    sidebarItems: [],
    defaultItem: null,
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/navigation/sidebarConfig.ts
git commit -m "feat(frontend): add sidebar config data for file system tabs"
```

---

## Task 2: Rewrite TabNavigation for .md File Tabs

**Files:**
- Modify: `frontend/src/components/global/TabNavigation.tsx`

**Estimated time:** 3-5 minutes

The current `TabNavigation.tsx` renders three `NavLink`s (About, Projects, Contact) with trapezoid `clip-path`. Rewrite it to render five `.md` file tabs using the `FILE_TABS` config.

- [ ] **Step 1: Rewrite TabNavigation.tsx**

Replace the entire content of `TabNavigation.tsx`. Key changes:

1. Import `FILE_TABS` from `../navigation/sidebarConfig`
2. Import `NavLink` and `useLocation` from `react-router-dom`
3. Map over `FILE_TABS` instead of the old hardcoded array
4. Each tab links to `tab.basePath` (e.g., `/files/soul`)
5. Active detection: check if `location.pathname` starts with `tab.basePath` (use `useLocation().pathname.startsWith(tab.basePath)` instead of relying solely on `NavLink` isActive, because sub-routes like `/files/skill/resume` must still highlight the SKILL.md tab)
6. Tab label now includes the `.md` suffix: display `tab.label` (which is already `"SOUL.md"`)
7. Keep the existing trapezoid `clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%)`
8. Keep the same styling pattern (active: `--color-surface-0` bg, z-index 3; inactive: `--color-surface-2` bg)
9. Add `aria-current="page"` when active for accessibility
10. Keep `cursor: 'none'` and `data-interactive` attributes

The visual shape and size stay the same. The only changes are: the tab labels, the routes they link to, and the active-detection logic.

```typescript
// Key difference in active detection:
const isActive = location.pathname === tab.basePath || location.pathname.startsWith(tab.basePath + '/')
```

- [ ] **Step 2: Verify tabs render**

Run `npm run dev`. Navigate to `/files/soul`. All five tabs should appear with trapezoid shapes. Clicking each tab should navigate to its base path. The active tab should be visually distinct.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/global/TabNavigation.tsx
git commit -m "refactor(frontend): rewrite TabNavigation for .md file tabs (SOUL/SKILL/MEMORY/CONTACT/MUSIC)"
```

---

## Task 3: Build Sidebar Component

**Files:**
- Create: `frontend/src/components/navigation/Sidebar.tsx`
- Create: `frontend/src/styles/file-system.css`
- Modify: `frontend/src/index.css`

**Estimated time:** 4-5 minutes

- [ ] **Step 1: Create file-system.css**

Create `frontend/src/styles/file-system.css` with styles for the sidebar, note-items, and breadcrumb:

```css
/* ===== SIDEBAR ===== */
.sidebar {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--color-grid);
  background: var(--color-void);
  overflow-y: auto;
  height: 100%;
}

.sidebar-header {
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
  border-bottom: 1px solid var(--color-grid);
  user-select: none;
}

/* ===== NOTE ITEM (sidebar list entry) ===== */
.note-item {
  display: block;
  padding: var(--space-sm) var(--space-md);
  border-left: 3px solid transparent;
  border-bottom: 1px solid var(--color-grid);
  text-decoration: none;
  cursor: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.note-item:hover {
  background: var(--color-surface-0);
}

.note-item.active {
  border-left-color: var(--color-highlight);
  background: var(--color-surface-0);
}

.note-item-date {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.note-item-title {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: 2px;
  line-height: 1.3;
}

.note-item-preview {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-muted);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== BREADCRUMB ===== */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-xs) var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-muted);
  border-bottom: 1px solid var(--color-grid);
  user-select: none;
  background: var(--color-void);
}

.breadcrumb-separator {
  color: var(--color-ink-faint);
}

.breadcrumb-segment {
  color: var(--color-ink-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.breadcrumb-segment:hover {
  color: var(--color-ink);
}

.breadcrumb-current {
  color: var(--color-ink);
}

/* ===== FILE SYSTEM LAYOUT (three-zone) ===== */
.fs-layout {
  display: flex;
  height: calc(100vh - var(--ruler-x-height) - 48px);
  /* 48px = tab bar height (36px) + tab bottom spacing (12px) */
}

.fs-sidebar {
  flex-shrink: 0;
}

.fs-main {
  flex: 1;
  overflow-y: auto;
  background: var(--color-void);
}

.fs-main-inner {
  /* No padding here — individual pages own their own padding */
  max-width: 900px;
}

/* ===== EMPTY SIDEBAR STATE ===== */
.fs-layout.no-sidebar .fs-main {
  /* When no sidebar, content takes full width */
}
```

- [ ] **Step 2: Import file-system.css in index.css**

Add to `frontend/src/index.css`:

```css
@import "./styles/file-system.css";
```

Place it after the existing `@import "./styles/theme.css";` line.

- [ ] **Step 3: Create Sidebar component**

Create `frontend/src/components/navigation/Sidebar.tsx`:

```typescript
import { NavLink, useLocation } from 'react-router-dom'
import type { SidebarItem, TabConfig } from './sidebarConfig'

interface SidebarProps {
  tab: TabConfig
}

export default function Sidebar({ tab }: SidebarProps) {
  const location = useLocation()

  if (tab.sidebarItems.length === 0) return null

  return (
    <aside className="sidebar fs-sidebar">
      <div className="sidebar-header">
        {tab.label}
      </div>
      <nav>
        {tab.sidebarItems.map((item) => {
          const fullPath = item.routeSegment
            ? `${tab.basePath}/${item.routeSegment}`
            : tab.basePath
          const isActive = location.pathname === fullPath

          return (
            <NavLink
              key={item.id}
              to={fullPath}
              className={`note-item ${isActive ? 'active' : ''}`}
              data-interactive
            >
              {item.date && <div className="note-item-date">{item.date}</div>}
              <div className="note-item-title">{item.label}</div>
              {item.preview && <div className="note-item-preview">{item.preview}</div>}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
```

Key design decisions:
- Uses `NavLink` for each item (navigates to sub-route)
- Active state detected by exact pathname match
- Active item gets `border-left: 3px solid var(--color-highlight)` (prismatic pink) + darker background
- Returns `null` when no sidebar items (SOUL.md, CONTACT.md)
- The `data-interactive` attribute enables the cursor expansion effect on hover
- Note-item pattern follows the UI-implement-design.md spec: date + title + preview

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/navigation/Sidebar.tsx frontend/src/styles/file-system.css frontend/src/index.css
git commit -m "feat(frontend): Sidebar component with note-item pattern and file-system CSS"
```

---

## Task 4: Build Breadcrumb Component

**Files:**
- Create: `frontend/src/components/navigation/Breadcrumb.tsx`

**Estimated time:** 2-3 minutes

- [ ] **Step 1: Create Breadcrumb component**

Create `frontend/src/components/navigation/Breadcrumb.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom'
import { FILE_TABS } from './sidebarConfig'

export default function Breadcrumb() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)
  // Expected: ['files', 'skill', 'resume'] or ['files', 'soul']

  if (pathSegments.length < 2 || pathSegments[0] !== 'files') return null

  const tabId = pathSegments[1]
  const tab = FILE_TABS.find((t) => t.id === tabId)
  if (!tab) return null

  const itemSegment = pathSegments[2] || null
  const item = itemSegment
    ? tab.sidebarItems.find((si) => si.routeSegment === itemSegment)
    : null

  return (
    <div className="breadcrumb">
      <span className="breadcrumb-segment">~/agent</span>
      <span className="breadcrumb-separator">/</span>
      {item ? (
        // When a sub-item is selected, tab name is a clickable link back to tab root
        <Link to={tab.basePath} className="breadcrumb-segment" data-interactive>
          {tab.label}
        </Link>
      ) : (
        // When no sub-item, tab name is the terminal node — use current styling, not a link
        <span className="breadcrumb-current">{tab.label}</span>
      )}
      {item && (
        <>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{item.label}</span>
        </>
      )}
    </div>
  )
}
```

The breadcrumb renders: `~/agent / SKILL.md / HACKATHONS`
- `~/agent` is static (the "home directory" of the agent)
- The tab name is a clickable link back to the tab's base path **only when a sub-item is selected**. When no sub-item is selected, the tab name is the terminal node and renders with `.breadcrumb-current` styling (not clickable).
- The sub-item name (if present) is static text, highlighted as current location
- Uses `.breadcrumb-*` classes from `file-system.css`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/navigation/Breadcrumb.tsx
git commit -m "feat(frontend): Breadcrumb component showing file path (~/agent/TAB.md/ITEM)"
```

---

## Task 5: Build FileSystemLayout Component

**Files:**
- Create: `frontend/src/components/global/FileSystemLayout.tsx`
- Modify: `frontend/src/components/global/Layout.tsx`

**Estimated time:** 4-5 minutes

- [ ] **Step 1: Create FileSystemLayout component**

Create `frontend/src/components/global/FileSystemLayout.tsx`:

This is the three-zone shell that replaces the old simple `<Outlet />` wrapper. It:
1. Reads the current tab from `useParams()` (the `:tab` segment)
2. Looks up the `TabConfig` for the active tab
3. Renders: `TabNavigation` at top, then a flex row with `Sidebar` (if items exist) + main panel (`<Outlet />`)
4. Renders the `Breadcrumb` above the main content panel

```typescript
import { Outlet, useParams, Navigate } from 'react-router-dom'
import TabNavigation from './TabNavigation'
import Sidebar from '../navigation/Sidebar'
import Breadcrumb from '../navigation/Breadcrumb'
import { FILE_TABS } from '../navigation/sidebarConfig'

export default function FileSystemLayout() {
  const { tab } = useParams<{ tab: string }>()
  const activeTab = FILE_TABS.find((t) => t.id === tab)

  // If no valid tab, redirect to SOUL.md (first tab)
  if (!activeTab) {
    return <Navigate to="/files/soul" replace />
  }

  const hasSidebar = activeTab.sidebarItems.length > 0

  return (
    <>
      <TabNavigation />
      <div className={`fs-layout ${hasSidebar ? '' : 'no-sidebar'}`}>
        {hasSidebar && <Sidebar tab={activeTab} />}
        <div className="fs-main">
          <Breadcrumb />
          <div className="fs-main-inner">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Modify Layout.tsx**

Update `frontend/src/components/global/Layout.tsx` to simplify it. After Phase 2, `Layout` is only responsible for the global overlay layers (grid, noise, cursor) and positioning the content area below the rulers. It no longer renders tabs or `<Outlet />` directly — that is `FileSystemLayout`'s job.

New `Layout.tsx`:

```typescript
import { type ReactNode } from 'react'
import GridBackground from './GridBackground'
import NoiseOverlay from './NoiseOverlay'
import CrosshairCursor from './CrosshairCursor'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <GridBackground />
      <NoiseOverlay />
      <CrosshairCursor />
      <div
        style={{
          position: 'relative',
          marginTop: 'var(--ruler-x-height)',
          marginLeft: 'var(--ruler-y-width)',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </>
  )
}
```

The old `showTabs` and `useOutlet` props are removed. `Layout` is now a pure wrapper for global layers + ruler offsets.

- [ ] **Step 3: Commit**

> **WARNING:** Do NOT commit Layout.tsx separately — it will break compilation until App.tsx is also updated in Task 7. Layout.tsx and App.tsx changes MUST happen in the SAME commit. Either commit these files together with Task 7's App.tsx changes, or hold this commit until Task 7 is also complete and commit them all at once:
>
> ```bash
> git add frontend/src/components/global/FileSystemLayout.tsx frontend/src/components/global/Layout.tsx frontend/src/App.tsx frontend/src/pages/Landing.tsx
> git commit -m "feat(frontend): FileSystemLayout three-zone shell + rewrite routing for file system paths"
> ```

---

## Task 6: Create Placeholder Page Shells

**Files:**
- Create: `frontend/src/pages/SoulPage.tsx`
- Create: `frontend/src/pages/SkillPage.tsx`
- Create: `frontend/src/pages/MemoryPage.tsx`
- Create: `frontend/src/pages/ContactPage.tsx`
- Create: `frontend/src/pages/MusicPage.tsx`
- Delete: `frontend/src/pages/About.tsx`
- Delete: `frontend/src/pages/Projects.tsx`
- Delete: `frontend/src/pages/Contact.tsx`

**Estimated time:** 4-5 minutes

Each page is a minimal placeholder that proves the routing and layout work. Real content is built in later phases (Phase 4-8). All placeholders follow the same pattern: a heading, a description, and a "coming in Phase X" note.

- [ ] **Step 1: Create SoulPage.tsx**

```typescript
export default function SoulPage() {
  return (
    <>
      <h1 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '2rem',
        fontWeight: 300,
        color: 'var(--color-ink)',
        marginBottom: 'var(--space-md)',
      }}>
        YONGKANG ZOU
      </h1>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
        maxWidth: '600px',
      }}>
        Creative technologist. Assembling skills across AI, full-stack, music, and design.
        9x hackathon winner. Ships in 20 hours.
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 4 ]
      </p>
    </>
  )
}
```

- [ ] **Step 2: Create SkillPage.tsx**

This page uses `useParams` to check if a sub-item is selected (resume, hackathons, certifications) or if it shows the default skills view.

```typescript
import { useParams } from 'react-router-dom'

const SKILL_VIEWS: Record<string, { title: string; description: string }> = {
  '': { title: 'SKILLS', description: 'Arsenal overview — GSAP progressive skill animation' },
  resume: { title: 'RESUME', description: 'Experience timeline — every role, every skill assembled' },
  hackathons: { title: 'HACKATHONS', description: 'Interactive map + timeline animation' },
  certifications: { title: 'CERTIFICATIONS', description: 'Education + professional certifications' },
}

export default function SkillPage() {
  const { item } = useParams<{ item?: string }>()
  const view = SKILL_VIEWS[item || ''] || SKILL_VIEWS['']

  return (
    <>
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '0.85rem',
        color: 'var(--color-ink-muted)',
        marginBottom: 'var(--space-lg)',
      }}>
        {view.title}
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        {view.description}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 5 ]
      </p>
    </>
  )
}
```

- [ ] **Step 3: Create MemoryPage.tsx**

```typescript
import { useParams } from 'react-router-dom'

export default function MemoryPage() {
  const { item } = useParams<{ item?: string }>()

  if (item === 'feedback') {
    return (
      <>
        <h2 style={{
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.85rem',
          color: 'var(--color-ink-muted)',
          marginBottom: 'var(--space-lg)',
        }}>
          LEAVE A NOTE
        </h2>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1rem',
          color: 'var(--color-ink)',
        }}>
          Visitor feedback form — share your thoughts.
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-ink-faint)',
          marginTop: 'var(--space-lg)',
        }}>
          [ Full content coming in Phase 7 ]
        </p>
      </>
    )
  }

  return (
    <>
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '0.85rem',
        color: 'var(--color-ink-muted)',
        marginBottom: 'var(--space-lg)',
      }}>
        {item ? item.replace(/-/g, ' ').toUpperCase() : 'MEMORY LOG'}
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        {item
          ? 'Blog post content will appear here.'
          : 'The agent\'s memory log. Select a post from the sidebar.'}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 7 ]
      </p>
    </>
  )
}
```

- [ ] **Step 4: Create ContactPage.tsx**

```typescript
export default function ContactPage() {
  return (
    <>
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '0.85rem',
        color: 'var(--color-ink-muted)',
        marginBottom: 'var(--space-lg)',
      }}>
        Contact
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        Get in touch — email, GitHub, LinkedIn, and a contact form.
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 4 ]
      </p>
    </>
  )
}
```

- [ ] **Step 5: Create MusicPage.tsx**

```typescript
import { useParams } from 'react-router-dom'

export default function MusicPage() {
  const { item } = useParams<{ item?: string }>()

  return (
    <>
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '0.85rem',
        color: 'var(--color-ink-muted)',
        marginBottom: 'var(--space-lg)',
      }}>
        {item ? item.replace(/-/g, ' ').toUpperCase() : 'MUSIC'}
      </h2>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '1rem',
        lineHeight: 1.7,
        color: 'var(--color-ink)',
      }}>
        {item
          ? 'Track player and details will appear here.'
          : 'The artist side — inhibitor. Music player, bio, and platform links.'}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-faint)',
        marginTop: 'var(--space-lg)',
      }}>
        [ Full content coming in Phase 8 ]
      </p>
    </>
  )
}
```

- [ ] **Step 6: Delete old page components**

Delete these files (they are fully replaced by the new page shells):
- `frontend/src/pages/About.tsx`
- `frontend/src/pages/Projects.tsx`
- `frontend/src/pages/Contact.tsx`

**Naming convention:** All placeholder pages use the `{Name}Page.tsx` format (e.g., `SoulPage.tsx`, `ContactPage.tsx`). Later phases that replace these placeholders MUST use the same filenames and export names, or explicitly delete the placeholder and update the import in App.tsx.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat(frontend): placeholder page shells for SOUL/SKILL/MEMORY/CONTACT/MUSIC tabs"
```

---

## Task 7: Rewrite App.tsx Routing + Update Landing.tsx

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/Landing.tsx`

**Estimated time:** 3-5 minutes

- [ ] **Step 1: Rewrite App.tsx with new route tree**

Replace the entire content of `App.tsx`:

```typescript
import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/global/Layout'
import FileSystemLayout from './components/global/FileSystemLayout'
import Landing from './pages/Landing'
import SoulPage from './pages/SoulPage'
import SkillPage from './pages/SkillPage'
import MemoryPage from './pages/MemoryPage'
import ContactPage from './pages/ContactPage'
import MusicPage from './pages/MusicPage'

const queryClient = new QueryClient()

/**
 * TabRouter resolves which page component to render based on the :tab param.
 * This avoids duplicating the page imports across multiple route definitions.
 */
function TabRouter() {
  const { tab } = useParams<{ tab: string }>()

  switch (tab) {
    case 'soul': return <SoulPage />
    case 'skill': return <SkillPage />
    case 'memory': return <MemoryPage />
    case 'contact': return <ContactPage />
    case 'music': return <MusicPage />
    default: return <Navigate to="/files/soul" replace />
  }
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Landing /></Layout>,
  },
  // Redirect bare /files to /files/soul
  {
    path: '/files',
    element: <Navigate to="/files/soul" replace />,
  },
  {
    path: '/files/:tab',
    element: <Layout><FileSystemLayout /></Layout>,
    children: [
      // Tab-level routes (no sub-item)
      { index: true, element: <TabRouter /> },
      // Sub-item routes
      { path: ':item', element: <TabRouter /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

**Route structure explained:**
- `/` renders `Landing` inside `Layout` (no tabs, no sidebar)
- `/files` redirects to `/files/soul` (explicit redirect route prevents redirect loops)
- `/files/:tab` renders `FileSystemLayout` inside `Layout` — `FileSystemLayout` reads `:tab` from `useParams` to determine which tab is active (for sidebar rendering)
- `/files/:tab/:item` renders the same page shell via `TabRouter`, which internally reads the `:item` param for sub-views (SKILL.md uses this for resume/hackathons/certifications, MEMORY.md for blog posts, MUSIC.md for tracks)
- Invalid `:tab` values redirect to `/files/soul` (handled inside `TabRouter`'s default case)

**Why `/files/:tab` instead of `/files` with nested `:tab`:** Mounting `FileSystemLayout` at `/files` and using `useParams` to read `:tab` causes a redirect loop because `:tab` is only defined on child routes, not on the `/files` route itself. By mounting at `/files/:tab`, `FileSystemLayout` can always read the active tab from params.

- [ ] **Step 2: Update Landing.tsx**

Modify `frontend/src/pages/Landing.tsx`:
- Change the "Enter" button's `navigate('/about')` to `navigate('/files/soul')`
- Change the button text from `"Enter"` to `"ACCESS FILE SYSTEM"` (matching the UX spec ticket content)
- Everything else stays the same

```typescript
// In Landing.tsx, change:
onClick={() => navigate('/about')}
// To:
onClick={() => navigate('/files/soul'))

// And change:
Enter
// To:
Access File System
```

- [ ] **Step 3: Verify full routing**

Start both backend and frontend. Test these paths:

| URL | Expected Result |
|-----|----------------|
| `/` | Landing page, no tabs, "ACCESS FILE SYSTEM" button |
| Click button | Navigates to `/files/soul` |
| `/files/soul` | SOUL.md tab active, no sidebar, Soul placeholder content |
| `/files/skill` | SKILL.md tab active, sidebar with 4 items (SKILLS selected), Skill placeholder |
| `/files/skill/resume` | SKILL.md tab active, RESUME sidebar item highlighted, RESUME content |
| `/files/skill/hackathons` | SKILL.md tab active, HACKATHONS highlighted |
| `/files/memory` | MEMORY.md tab active, sidebar with blog posts + LEAVE A NOTE |
| `/files/memory/feedback` | MEMORY.md tab active, feedback item highlighted, feedback placeholder |
| `/files/contact` | CONTACT.md tab active, no sidebar, Contact placeholder |
| `/files/music` | MUSIC.md tab active, sidebar with 2 tracks, Music placeholder |
| `/files/music/track-1` | MUSIC.md active, track-1 highlighted |
| `/files/nonexistent` | Redirects to `/files/soul` |
| Breadcrumb at `/files/skill/resume` | Shows `~/agent / SKILL.md / RESUME` |
| Breadcrumb at `/files/soul` | Shows `~/agent / SOUL.md` |

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/Landing.tsx
git commit -m "refactor(frontend): rewrite routing for /files/:tab/:item file system paths"
```

---

## Task 8: Final Cleanup and Smoke Test

**Files:**
- Possibly modify: any files with import path issues or TypeScript errors

**Estimated time:** 2-3 minutes

- [ ] **Step 1: Run TypeScript type check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors (most likely: missing imports, unused imports from deleted files, param type mismatches).

- [ ] **Step 2: Verify no console errors**

Open the browser at `http://localhost:5173`, open DevTools console. Navigate through all routes. Ensure:
- No React key warnings
- No 404 errors
- No TypeScript/runtime errors
- No missing CSS class warnings

- [ ] **Step 3: Verify global layers still work**

Confirm these Phase 1 elements are unbroken:
- Grid background visible behind all file system pages
- X and Y rulers with labels at viewport edges
- Corner piece (dark square at top-left)
- Crosshair cursor follows mouse and snaps to grid cells
- Cursor outline expands on hover over tabs and sidebar items
- Noise grain overlay visible
- Coordinates display (bottom-right) updates on mouse move
- Custom scrollbar styling on sidebar (if content overflows)

- [ ] **Step 4: Verify edge shape system**

Per `.claude/docs/portfolio-design-principles.md`:
- Tab navigation tabs: `border-radius: 0px` (structural nav, sharp) -- confirmed via `clip-path` trapezoid
- Sidebar note-items: `border-radius: 0px` (structural list, sharp) -- no radius applied
- Breadcrumb links: no radius (inline text links)
- Any future buttons that get added: should be `8px` (interactive)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(frontend): Phase 2 cleanup — file system shell complete"
```

---

## Verification Checklist (Phase 2 Complete When...)

- [ ] Five `.md` file tabs render at the top: `SOUL.md | SKILL.md | MEMORY.md | CONTACT.md | MUSIC.md`
- [ ] Tabs use trapezoid `clip-path` shape, active tab is visually distinct (lighter bg, higher z-index)
- [ ] Clicking a tab navigates to `/files/{tab}` and highlights the correct tab
- [ ] SKILL.md shows a sidebar with 4 items: SKILLS, RESUME, HACKATHONS, CERTIFICATIONS
- [ ] MEMORY.md shows a sidebar with placeholder blog posts + LEAVE A NOTE
- [ ] MUSIC.md shows a sidebar with placeholder tracks
- [ ] SOUL.md and CONTACT.md show NO sidebar (content takes full width)
- [ ] Sidebar items use the note-item pattern: date (optional) + title + preview
- [ ] Clicking a sidebar item navigates to `/files/{tab}/{item}` and highlights with left border
- [ ] Breadcrumb shows `~/agent / TAB.md / ITEM` and updates on navigation
- [ ] Landing page button says "ACCESS FILE SYSTEM" and navigates to `/files/soul`
- [ ] Grid background, rulers, crosshair cursor, noise overlay all still work correctly
- [ ] Coordinates display (bottom-right) still updates on mouse move
- [ ] `/files/nonexistent` redirects to `/files/soul`
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] No console errors in browser DevTools
- [ ] Old routes (`/about`, `/projects`, `/contact`) no longer exist (404 or redirect)
- [ ] Old page files (`About.tsx`, `Projects.tsx`, `Contact.tsx`) are deleted
