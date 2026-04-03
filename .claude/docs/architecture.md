# Architecture

## Overview

Monorepo with Go backend API + TypeScript/React frontend SPA. Content is data-driven — all portfolio content (projects, hackathons, work experience, skills) lives in structured data files or a database, not hardcoded in components.

```
yongkang-as-a-agent/
├── backend/                 # Go API server
│   ├── cmd/
│   │   └── server/
│   │       └── main.go      # Entry point
│   ├── internal/
│   │   ├── handler/         # HTTP handlers
│   │   ├── model/           # Data models / types
│   │   ├── service/         # Business logic
│   │   ├── repository/      # Data access layer
│   │   └── middleware/      # CORS, logging, rate limiting
│   ├── pkg/                 # Shared utilities
│   ├── data/                # Static data files (JSON/YAML)
│   │   ├── projects.json
│   │   ├── hackathons.json
│   │   ├── experience.json
│   │   ├── skills.json
│   │   └── music.json
│   ├── go.mod
│   └── go.sum
├── frontend/                # TypeScript React SPA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── global/      # GridBackground, Cursor, Nav, etc.
│   │   │   ├── landing/     # PointCloud, BlurReveal, Hero
│   │   │   ├── about/       # SkillGrid, Map, Timeline, etc.
│   │   │   ├── projects/    # ProjectCard, Filter, Detail
│   │   │   └── contact/     # ContactForm, SocialLinks
│   │   ├── pages/           # Route-level page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # API client, utilities
│   │   ├── shaders/         # GLSL shader files
│   │   ├── types/           # TypeScript type definitions
│   │   ├── assets/          # Static assets (fonts, images)
│   │   └── styles/          # Global CSS, theme variables
│   ├── public/              # Static public files
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── .claude/
│   └── docs/                # Design docs (this directory)
├── docker-compose.yml
├── Makefile
└── README.md
```

## Tech Stack

### Backend — Go

| Component | Choice | Why |
|-----------|--------|-----|
| Language | Go | Your preference, performant, simple deployment |
| HTTP Router | chi or Echo | Lightweight, middleware-friendly |
| Data Source | JSON/YAML files (initial) → PostgreSQL (future) | Start simple, scale when needed |
| Contact Form | SMTP or SendGrid API | Send form submissions to your email |
| Deployment | Docker → Fly.io or Railway | Easy, cheap, fast cold starts |

**API Endpoints:**
```
# Static data (JSON files)
GET  /api/projects              # List all projects (supports ?category= filter)
GET  /api/projects/:slug        # Single project detail
GET  /api/hackathons            # List hackathons (with geo coordinates for map)
GET  /api/experience            # Work experience entries
GET  /api/skills                # Skills grouped by domain
GET  /api/music/artist          # Music/artist info + platform links
POST /api/contact               # Contact form submission (honeypot field + rate limit: 3/hour per IP)
GET  /api/health                # Health check

# Supabase-backed (blog, feedback, tracks)
GET  /api/posts                 # List published blog posts
GET  /api/posts/:id             # Single blog post
POST /api/posts                 # Create blog post (admin auth required)
PUT  /api/posts/:id             # Update blog post (admin auth required)
DELETE /api/posts/:id           # Delete blog post (admin auth required)

GET  /api/music/tracks          # List music tracks (from Supabase)
POST /api/music/tracks          # Upload track metadata (admin auth required)
DELETE /api/music/tracks/:id    # Delete track (admin auth required)

POST /api/feedback              # Submit visitor feedback (public, rate limited)
GET  /api/feedback              # List feedback (admin auth required)

POST /api/auth/login            # Admin login (proxies to Supabase Auth)
POST /api/auth/logout           # Admin logout
GET  /api/auth/me               # Check current auth status
```

**Design Patterns:**
- **Repository pattern** — data access abstracted behind interfaces. Today it reads JSON files, tomorrow it queries PostgreSQL. Same interface.
- **Service layer** — business logic (filtering, sorting, enrichment) separated from HTTP handling
- **Handler layer** — thin HTTP handlers that parse requests, call services, return JSON
- **Middleware chain** — CORS, request logging, rate limiting (especially on /contact)

```go
// Example: Repository interface
type ProjectRepository interface {
    GetAll(ctx context.Context) ([]Project, error)
    GetBySlug(ctx context.Context, slug string) (*Project, error)
    GetByCategory(ctx context.Context, category string) ([]Project, error)
}

// JSON file implementation (initial)
type JSONProjectRepository struct {
    dataPath string
}

// PostgreSQL implementation (future)
type PGProjectRepository struct {
    db *sql.DB
}
```

### Frontend — TypeScript React

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | React 19 + Vite | Fast dev, ecosystem, your familiarity |
| Styling | Tailwind CSS + CSS custom properties | Utility-first + theme variables |
| 3D | Three.js + @react-three/fiber | Point cloud, vortex gallery, shaders |
| Animation | GSAP | Timeline control for hackathon animation |
| Map | Mapbox GL JS | Beautiful, customizable, free tier |
| Routing | React Router v7 | Standard, supports code splitting |
| Data Fetching | TanStack Query | Caching, loading states, refetching |
| Build | Vite | Fast HMR, good Three.js support |

### Services / External

| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting (static SPA) — `yongkang.dev` |
| Fly.io | Backend hosting (Go binary) — `api.yongkang.dev` |
| Supabase | Auth (admin login), PostgreSQL (blog posts, feedback), Storage (music files, blog images) |
| Mapbox | Map tiles for hackathon visualization |
| SendGrid or Resend | Transactional email (contact form) |
| Cloudflare | DNS + CDN |

### Supabase Schema

**Tables:**

```sql
-- Blog posts (admin-only write)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,              -- Markdown content
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  cover_image_url TEXT,            -- Optional Supabase Storage URL
  is_published BOOLEAN DEFAULT false
);

-- Visitor feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  linkedin_url TEXT,               -- Optional
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Music tracks
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,         -- Supabase Storage URL
  duration_seconds INTEGER,
  track_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Storage Buckets:**
- `music` — audio files (.wav, .mp3), public read
- `blog-images` — embedded images for blog posts, public read

**Auth:**
- Supabase Auth with email/password
- Only your account has admin access (check `auth.uid()` in RLS policies)
- RLS policies: posts/tracks = public read, admin-only write. Feedback = public insert, admin-only read.
- Scalable: add role column to profiles table later for multi-user

## Data Models

### Project
```typescript
interface Project {
  slug: string;
  title: string;
  description: string;
  features?: string[];        // Detailed feature descriptions
  tags: string[];
  category: "hackathon" | "industry" | "academic" | "side";
  codeUrl?: string;
  demoUrl?: string;
  date: string;               // YYYY-MM format
  isFavorite?: boolean;
  result?: string;            // "1st place", "Finalist", etc.
  thumbnail?: string;         // Image URL
}
```

### Hackathon
```typescript
interface Hackathon {
  date: string;               // YYYY.MM
  name: string;
  city?: string;              // Optional — online/remote hackathons have no city
  country?: string;           // Optional — same reason
  coordinates?: [number, number]; // [lat, lng] for map pin. Omit for online events.
  isRemote?: boolean;         // true for online hackathons (no map pin, shown in sidebar)
  projectName: string;
  projectSlug?: string;       // Links to project detail
  projectUrl?: string;
  result?: string;
  solo?: boolean;
  domain: string;             // "Music AI", "Healthcare", "Spatial", etc.
}
```

### Experience
```typescript
interface Experience {
  role: string;
  company: string;
  location: string;
  startDate: string;          // YYYY-MM
  endDate?: string;           // YYYY-MM or "Present"
  skillAssembled: string;     // What capability was added (narrative)
  highlights: string[];
  note?: string;              // e.g., "team restructured"
}
```

### Skill
```typescript
interface SkillDomain {
  title: string;
  icon?: string;
  subcategories?: {
    name: string;
    skills: string[];
  }[];
  skills?: string[];
  battleTested: string[];     // Where this was used (project/role names)
}
```

## Scalable Architecture Decisions

### Why Go backend instead of just static JSON?
1. **Contact form** needs server-side email sending
2. **Future API consumers** — could serve data to a mobile app, CLI, or other frontends
3. **Analytics/tracking** — server-side event logging without client-side bloat
4. **Admin panel** (future) — CRUD operations on content
5. **Rate limiting** — protect contact endpoint

### Why JSON files as initial data store?
1. **Zero infrastructure** to start — no database to provision
2. **Git-tracked** — content changes are versioned with code
3. **Easy to edit** — update a JSON file, redeploy
4. **Migration path clear** — swap repository implementation when needed

### Why SPA instead of SSR (Next.js)?
1. **Portfolio is not SEO-critical** — visitors arrive via direct link (LinkedIn, GitHub, email)
2. **Heavy WebGL content** — Three.js scenes need client-side rendering anyway
3. **Simpler deployment** — static files on CDN + separate API
4. **Go backend is the API** — no need for Next.js API routes

If SEO becomes important later, can add prerendering (vite-plugin-ssr) or switch to Next.js with the same components.

## Deployment Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   DNS + CDN     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │  Vercel / CF    │          │   Fly.io /      │
     │  Pages          │          │   Railway       │
     │  (Frontend SPA) │          │   (Go API)      │
     │  Static files   │          │   Docker        │
     └─────────────────┘          └────────┬────────┘
                                           │
                                  ┌────────▼────────┐
                                  │  Data Layer     │
                                  │  JSON files     │
                                  │  (→ PostgreSQL) │
                                  └─────────────────┘
```

## Development Workflow

```bash
# Backend
cd backend && go run cmd/server/main.go    # Runs on :8080

# Frontend
cd frontend && npm run dev                  # Runs on :5173, proxies /api to :8080

# Both (with Makefile)
make dev                                    # Runs both concurrently
```
