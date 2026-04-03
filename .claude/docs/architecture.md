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
GET  /api/projects              # List all projects (supports ?category= filter)
GET  /api/projects/:slug        # Single project detail
GET  /api/hackathons            # List hackathons (with geo coordinates for map)
GET  /api/experience            # Work experience entries
GET  /api/skills                # Skills grouped by domain
GET  /api/music                 # Music/artist info + platform links
POST /api/contact               # Contact form submission (honeypot field + rate limit: 3/hour per IP)
GET  /api/health                # Health check
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
| Vercel or Cloudflare Pages | Frontend hosting (static SPA) |
| Fly.io or Railway | Backend hosting (Go binary) |
| SendGrid or Resend | Transactional email (contact form) |
| Mapbox | Map tiles for hackathon visualization |
| Cloudinary (optional) | Image CDN for project screenshots + photos |
| Supabase (optional future) | PostgreSQL + auth if adding admin panel |

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
