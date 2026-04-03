# UX Design: Page Hierarchy & User Journey

## Visitor Journey

The journey mirrors discovering an agent:
1. **Detect a signal** (landing) — prismatic data ribbons pulse, a ticket appears
2. **Access the file system** (click ticket) — the agent's dossier opens
3. **Browse the files** (.md tabs) — each tab reveals a facet of the agent
4. **Leave a mark** (feedback) or **reach out** (contact)

## Site Map

```
/                       → Landing (Temporal Anomaly ribbons + Symmetry Breaking ticket)
/files                  → File System (Note App layout)
  ├── SOUL.md           → Brief intro — who is the agent
  ├── SKILL.md          → Skills (GSAP progressive animation) + sub-items:
  │   ├── RESUME        → Embedded CV / experience timeline
  │   ├── HACKATHONS    → Map + timeline animation
  │   └── CERTIFICATIONS → Certs + education
  ├── MEMORY.md         → Blog posts + visitor feedback
  ├── CONTACT.md        → Contact info + form
  └── MUSIC.md          → Music player + artist page
```

## Page Breakdown

### 1. Landing — "The Signal" (/)

**Purpose:** First impression. Atmospheric, cinematic. The visitor encounters the agent's credentials before entering.

**References:** Temporal Anomaly (background) + Symmetry Breaking (ticket)

**Structure:**
- **Background layer:** Temporal Anomaly data ribbons animated across the viewport, rendered in prismatic iridescent palette (pinks, corals, teals, mints, lavenders) instead of red/purple/cyan. Flowing, pulsing, atmospheric.
- **Foreground layer:** Symmetry Breaking ticket/pass centered in upper portion of viewport.
  - Left/visual zone: halftone shader or prismatic particle effect
  - Right/data zone: agent credentials

**Ticket content (draft):**
```
AGENT       > YONGKANG ZOU
CODENAME    > inhibitor
BASE        > PARIS, FR
CLEARANCE   > ALL DOMAINS

MISSIONS    > 24
WINS        > 9
SPEED       > 0 → DEMO < 20H

            [ ACCESS FILE SYSTEM ]
```

**Transition on click "ACCESS FILE SYSTEM":**
- Data ribbons converge/collapse inward
- Ticket morphs into the Note App tab system
- Grid/rulers fade in from edges
- First tab (SOUL.md) becomes active

### 2. File System — Note App Layout (/files)

**Purpose:** The core navigation shell. All content lives here as `.md` files.

**Reference:** Note App (tabs + sidebar + editor panel)

**Layout:**
- **Top:** Tabs styled as `.md` file tabs (trapezoid shape from Note App)
  - `SOUL.md` | `SKILL.md` | `MEMORY.md` | `CONTACT.md` | `MUSIC.md`
- **Left sidebar:** Note-items within the active tab (context-dependent)
- **Right panel:** Main content area (the "editor" pane from Note App)
- Grid background + rulers visible behind everything
- Crosshair cursor active

### 3. SOUL.md — Brief Intro

**Purpose:** First file the visitor sees. Quick, impactful.

**Sidebar:** None (or minimal — just a single "README" item)

**Content panel:**
- Name: Yongkang ZOU
- One-paragraph thesis: creative technologist, assembling skills across domains, artist × engineer
- Key stats: hackathon wins, current status, location
- Profile photo (optional, atmospheric — not a corporate headshot)
- Links to other tabs as "see also: SKILL.md, MEMORY.md"

### 4. SKILL.md — Skills + Resume + Hackathons

**Purpose:** Show the agent's capabilities with progressive reveal animation.

**Sidebar note-items:**
```
├── SKILLS (default view)    → GSAP progressive skill animation
├── RESUME                   → Experience timeline
├── HACKATHONS               → Map + timeline
└── CERTIFICATIONS           → Certs + education
```

#### SKILLS (main view — default)
- GSAP-powered progressive animation: skill domains appear one at a time with staggered timing
- Within each domain, individual skills "materialize" like tokens being generated
- Each skill domain is a content card (sharp corners, Note App style)
- `battleTested` references shown as subtle annotations below each skill
- Hover → prismatic color bleeds in

#### RESUME (note-item)
- Experience timeline in the right panel
- Each role as a narrative block: what skill was assembled
- Framed as progression: CITIC → Smart Gadget → SocGen → Misogi → Mozart → Epiminds
- Sequential timeline — each step builds on the last

#### HACKATHONS (note-item)
- Interactive map (Mapbox) + GSAP timeline animation
- World map with pins (primarily Europe + MIT/USA)
- Remote hackathons in a "REMOTE" section alongside map
- Timeline scrubber at bottom
- Auto-plays or user scrubs
- Stats computed from data at render time

#### CERTIFICATIONS (note-item)
- Education: Paris Dauphine-PSL, Paris-Saclay, Toulouse
- Chemistry Olympiad
- Coursera ML in Production, HuggingFace AI Agents certificate

### 5. MEMORY.md — Blog + Feedback

**Purpose:** The agent's memory log. Your thoughts + visitor notes.

**Sidebar note-items:**
```
├── 2026-03: Stockholm Hackathon    → Blog post
├── 2026-02: Joining Epiminds       → Blog post
├── 2025-12: 9th Win                → Blog post
├── ...
└── [ LEAVE A NOTE ]                → Feedback form
```

#### Blog Posts
- Standard blog format: date, title, article body with embedded images
- Clean readable text in the Note App editor panel style
- Stored in Supabase `posts` table
- **Admin only:** When logged in (Supabase auth, your account only), a "+ NEW ENTRY" button appears and the editor panel becomes writable. No one else can create/edit posts.
- Scalable for more users in future (role-based auth)

#### Visitor Feedback ("LEAVE A NOTE")
- A note-item at the bottom of the sidebar
- Opens a simple form: name, message, LinkedIn URL (optional)
- Stored in Supabase `feedback` table
- Visible to you only (admin view) or optionally displayed as a "guestbook" section

### 6. CONTACT.md — Contact Info

**Purpose:** Invite connection. Clean, minimal.

**Sidebar:** None needed — single view.

**Content panel:**
- Email: yongkang.zou1999@gmail.com
- GitHub: github.com/inin-zou
- LinkedIn: linkedin.com/in/yongkang-zou
- Simple contact form (name, email, message + honeypot)
- Social links grid-aligned

### 7. MUSIC.md — Music Player + Artist Page

**Purpose:** The artist side. Full iridescence moment.

**References:** Temporal Anomaly (data ribbons as audio visualizer)

**Layout:**
- **Background element:** Temporal Anomaly data ribbons reused as audio visualizer — prismatic ribbons react to audio playback
- **Vertical photo:** Image of Yongkang singing, embedded in the page (provided later)
- **Sidebar note-items:** Track list (click to play)
  ```
  ├── Track 1: 失眠
  ├── Track 2: Inhibitor
  └── ...
  ```
- **Right panel:** Artist bio, genre, status, platform links (Spotify, Douyin, NetEase)
- **Mini player:** Bottom of the MUSIC.md panel (contained, not global). Play/pause, progress bar, track name.
- **Audio files:** Stored in Supabase Storage, streamed on play
- **Admin:** Can upload new tracks

## Navigation

**Primary nav:** `.md` file tabs at the top (Note App trapezoid style)
- `SOUL.md` | `SKILL.md` | `MEMORY.md` | `CONTACT.md` | `MUSIC.md`

**Secondary nav:** Sidebar note-items within each tab (context-dependent)

**File path breadcrumb:** Show current location, e.g., `~/agent/SKILL.md/HACKATHONS`

**Mobile:** Bottom tab bar with .md file names, sidebar becomes a dropdown/drawer

## Interaction Patterns

- **Landing ribbons** — Temporal Anomaly data ribbons in prismatic palette, always moving
- **Ticket entry** — Click to transition into file system
- **GSAP progressive reveal** — Skills materialize like token generation
- **Grid-snap cursor** with crosshair — throughout file system
- **Prismatic color on hover** — grey → iridescent on engagement
- **Map timeline scrubber** — playable hackathon animation
- **Audio-reactive ribbons** — Temporal Anomaly ribbons respond to music playback in MUSIC.md
- **Frosted glass panels** — Used on top of photos (hackathon pins, project cards, music page)

## Responsive Strategy

- **Desktop:** Full file system with sidebar + panel, rulers, cursor effects
- **Tablet:** Sidebar collapses to top selector, panel takes full width
- **Mobile:** Single column, tabs become bottom nav with .md names, no cursor effects, map becomes vertical timeline
