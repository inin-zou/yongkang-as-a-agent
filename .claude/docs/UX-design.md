# UX Design: Page Hierarchy & User Journey

## Visitor Journey

The journey mirrors discovering an agent:
1. **Detect a signal** (landing) — something is here
2. **Explore what it does** (skills, projects) — breadth and depth revealed
3. **Understand who's behind it** (story, journey) — the human context
4. **Reach out** (contact) — connection

## Site Map

```
/                   → Landing (The Signal)
/about              → The Agent's Story (Trajectory + Dual Nature)
  ├── #arsenal      → Skills/Domains grid
  ├── #deployments  → Hackathon map + timeline animation
  ├── #trajectory   → Work experience as skill assembly
  └── #music        → The Other Side (inhibitor)
/projects           → Project Database (filterable grid)
/projects/:slug     → Individual project detail
/contact            → Reach the Agent
```

## Page Breakdown

### 1. Landing — "The Signal" (/)

**Purpose:** First impression. Atmospheric entry that draws the visitor in.

**Reference:** LUMO Studios adapted

**Structure:**
- Grey void background
- 3D particle/point cloud materializing in prismatic iridescent colors — "the signal forming"
- Blur-reveal interaction on cursor — content is there but blurred, mouse movement "declassifies" it (like wiping dust off a filed document)
- Hero text: Name + tagline ("Creative Technologist. 9x Hackathon Winner. Ships in 20 hours.")
- Minimal UI chrome: version number, coordinates, status indicator
- On scroll → atmospheric void transitions into the COORDINATE grid/file system

**The landing is the cover of the file. Scroll, and you're inside it.**

### 2. The Agent's Story (/about)

**Purpose:** Tell the assembling narrative. Reframe the career as intentional skill-building.

**Layout:** Single scrolling page with sections, file-system grid as structural backbone.

#### Section: Arsenal (Skills/Domains)
- Structured grid (COORDINATE-inspired) showing skill domains
- NOT a flat tag cloud — each domain has context: where it was battle-tested
- Categories: AI/ML, LLM Frameworks, Data & Visualization, Cloud, DevOps, Frontend, Backend, Databases
- Hover interaction → prismatic color bleeds in

#### Section: Field Deployments (Hackathons)
- **Playable map + timeline animation**
- World map (primarily Europe) with pins for each hackathon city (Stockholm, Paris, Berlin, MIT/Cambridge, etc.)
- Online/remote hackathons (no physical location) shown in a "REMOTE" sidebar alongside the map, not as pins
- Timeline scrubber at bottom (inspired by Temporal Anomaly ruler)
- Auto-plays chronologically or user can scrub
- Each pin lights up with: date, hackathon name, project, result
- Domain tags visible on each entry → visually demonstrates breadth
- The map sits ON the grid, with ruler coordinates marking cities and dates
- Feels like a strategic operations map in a field dossier
- Stats summary computed from data at render time (not hardcoded). "Win" = 1st, 2nd, 3rd place, or Community Win. Finalists and funding are separate indicators.

#### Section: Trajectory (Work Experience)
- NOT a resume list
- Each role is a narrative block: what skill was assembled
- Framed as progression:
  - CITIC Securities → analytical thinking, financial modeling
  - Smart Gadget Home → ML foundations, optimization
  - Societe Generale → enterprise AI, RAG systems
  - Misogi Labs → multi-agent orchestration, drug discovery
  - Mozart AI → creative AI, music video generation (Oct 2025 - Jan 2026)
  - Epiminds → marketing AI (Feb 2026 - Mar 2026, team restructured)
- These are sequential — Mozart AI ended before Epiminds started.
- The "job-shifting" becomes visibly intentional — each step builds on the last

#### Section: The Other Side (Music)
- The moment the grey surface cracks open and full iridescence comes through
- Artist name: inhibitor (indie RnB)
- Platform links: Spotify, Douyin, NetEase (external embeds or links — no self-hosted audio player in v1, since tracks are on streaming platforms)
- Gallery photos in 3D arrangement (Vortex Portfolio reference)
- Brief but impactful — proves the dual nature

### 3. Projects (/projects)

**Purpose:** Browsable, filterable project database.

**Layout:** Grid of project cards with category tabs.

**Tabs:** ALL | FAVORITE | HACKATHON | INDUSTRY | ACADEMIC | SIDE

**Card design:** Symmetry Breaking ticket/pass aesthetic
- Left/top: visual (project screenshot or generated thumbnail)
- Right/bottom: structured data (title, date, tags, result, links)
- Category color coding via prismatic accent (not neon)

**Project detail (/projects/:slug):**
- Full description with feature highlights
- Tech stack breakdown
- Links (GitHub, Demo, DevPost)
- Related projects (same domain)

### 4. Contact (/contact)

**Purpose:** Invite connection. Minimal, warm.

**Content:**
- Email: yongkang.zou1999@gmail.com
- GitHub: github.com/inin-zou
- LinkedIn: linkedin.com/in/yongkang-zou
- Simple contact form (name, email, message)
- The grey lifts slightly here — more warmth, inviting

## Navigation

**Primary nav:** Tabs at the top (file-system drawer metaphor)
- About | Projects | Contact
- Possibly: a "file path" breadcrumb showing current location (e.g., `/agent/deployments/`)

**Mobile:** Bottom navigation bar or hamburger, maintaining the file-system metaphor

## Interaction Patterns

- **Blur-reveal on cursor** (landing page) — declassifying content
- **Grid-snap cursor** with crosshair — throughout the site, subtle
- **Scroll-triggered section reveals** — content emerges as you scroll, not everything visible at once
- **Prismatic color on hover/interaction** — grey → iridescent on engagement
- **Map timeline scrubber** — playable animation for hackathon journey
- **3D gallery rotation** — for photos/music section (Vortex reference)

## Responsive Strategy

- **Desktop:** Full file-system grid, rulers visible, cursor interactions
- **Tablet:** Grid simplifies, ruler markers reduce, touch-friendly
- **Mobile:** Single column, tabs become bottom nav, map becomes vertical timeline, no cursor effects
