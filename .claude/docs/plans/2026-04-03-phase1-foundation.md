# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Go backend + React frontend monorepo with theme system, grid layout, navigation, routing, and API integration. After this phase, all pages render with the COORDINATE grid aesthetic and are fed real data from the Go API.

**Architecture:** Go backend with chi router serves JSON data files via REST. React SPA with Vite + Tailwind consumes the API. COORDINATE-style grid background + rulers + custom cursor are the global layout shell.

**Tech Stack:** Go 1.22+, chi v5, React 19, Vite 6, Tailwind CSS 4, React Router v7, TanStack Query v5, TypeScript 5

**Reference docs:**
- `.claude/docs/architecture.md` — project structure, data models, API endpoints
- `.claude/docs/UI-implement-design.md` — CSS tokens, component specs, reusable elements
- `.claude/docs/portfolio-design-principles.md` — edge shape system, typography, color
- `.claude/docs/yongkang-profile.md` — all content data

---

## File Structure (Phase 1)

```
yongkang-as-a-agent/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── model/types.go
│   │   ├── repository/json_repo.go
│   │   ├── service/portfolio.go
│   │   ├── handler/api.go
│   │   └── middleware/middleware.go
│   ├── data/
│   │   ├── projects.json
│   │   ├── hackathons.json
│   │   ├── experience.json
│   │   ├── skills.json
│   │   └── music.json
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── global/
│   │   │       ├── GridBackground.tsx
│   │   │       ├── CrosshairCursor.tsx
│   │   │       ├── TabNavigation.tsx
│   │   │       ├── NoiseOverlay.tsx
│   │   │       └── Layout.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── About.tsx
│   │   │   ├── Projects.tsx
│   │   │   └── Contact.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── styles/
│   │   │   └── theme.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── Makefile
└── .gitignore
```

---

## Task 1: Go Backend — Module + Models + Data Files

**Files:**
- Create: `backend/go.mod`
- Create: `backend/internal/model/types.go`
- Create: `backend/data/projects.json`
- Create: `backend/data/hackathons.json`
- Create: `backend/data/experience.json`
- Create: `backend/data/skills.json`
- Create: `backend/data/music.json`

- [ ] **Step 1: Initialize Go module**

```bash
cd backend && go mod init github.com/inin-zou/yongkang-as-a-agent/backend
```

- [ ] **Step 2: Create data model types**

Create `backend/internal/model/types.go` with all data structures matching the TypeScript interfaces defined in `.claude/docs/architecture.md`. Include JSON tags. Models: `Project`, `Hackathon`, `Experience`, `SkillDomain`, `SkillSubcategory`, `Music`, `ContactRequest`.

- [ ] **Step 3: Create JSON data files with real content**

Populate all 5 JSON files using data from `.claude/docs/yongkang-profile.md`:
- `projects.json` — all 19 projects from the old portfolio with slugs, tags, categories, results
- `hackathons.json` — all 24 hackathons with dates, cities, coordinates (look up lat/lng for each city), domains, results. Set `isRemote: true` for online events (Mistral Online, Pond Speedrun, AMD Hackathon, ShipItSunday, GeoAI Hack, Mistral AI MCP)
- `experience.json` — all 6 roles with skillAssembled narratives
- `skills.json` — all skill domains from the about page data
- `music.json` — inhibitor artist info with platform links

- [ ] **Step 4: Verify JSON validity**

```bash
cd backend && for f in data/*.json; do python3 -c "import json; json.load(open('$f')); print(f'OK: $f')"; done
```

- [ ] **Step 5: Commit**

```bash
git add backend/go.mod backend/internal/model/ backend/data/
git commit -m "feat(backend): init Go module with data models and JSON content"
```

---

## Task 2: Go Backend — Repository + Service + Handlers

**Files:**
- Create: `backend/internal/repository/json_repo.go`
- Create: `backend/internal/service/portfolio.go`
- Create: `backend/internal/handler/api.go`
- Create: `backend/internal/middleware/middleware.go`
- Create: `backend/cmd/server/main.go`

- [ ] **Step 1: Implement JSON repository**

Create `backend/internal/repository/json_repo.go`:
- `JSONRepository` struct with `dataDir string`
- `NewJSONRepository(dataDir string) *JSONRepository`
- Methods: `GetProjects()`, `GetProjectBySlug(slug)`, `GetProjectsByCategory(category)`, `GetHackathons()`, `GetExperience()`, `GetSkills()`, `GetMusic()`
- Each method reads the corresponding JSON file with `os.ReadFile` and unmarshals into the model types
- Return errors properly (file not found, unmarshal errors)

- [ ] **Step 2: Implement service layer**

Create `backend/internal/service/portfolio.go`:
- `PortfolioService` struct with `repo *repository.JSONRepository`
- Thin wrapper that calls repo methods. For `GetProjects`, accept optional `category` filter string. For `GetHackathons`, sort by date descending.

- [ ] **Step 3: Implement HTTP handlers**

Create `backend/internal/handler/api.go`:
- `APIHandler` struct with `svc *service.PortfolioService`
- Handler methods for each endpoint: `HandleGetProjects`, `HandleGetProjectBySlug`, `HandleGetHackathons`, `HandleGetExperience`, `HandleGetSkills`, `HandleGetMusic`, `HandleContact`, `HandleHealth`
- `HandleGetProjects` reads `?category=` query param
- `HandleContact` validates required fields (name, email, message), checks honeypot field (`website` — if filled, reject silently), returns 200 with success message. (Actual email sending is Phase 6.)
- All handlers write JSON responses with `Content-Type: application/json`

- [ ] **Step 4: Implement middleware**

Create `backend/internal/middleware/middleware.go`:
- `CORS` middleware — allows frontend origin (`http://localhost:5173` in dev, configurable via env var `FRONTEND_URL`)
- `Logger` middleware — logs method, path, status, duration
- `RateLimit` middleware — simple in-memory rate limiter for `/api/contact` (3 requests per hour per IP using a `sync.Map`)

- [ ] **Step 5: Wire up main.go**

Create `backend/cmd/server/main.go`:
- Create chi router
- Apply middleware: Logger, CORS
- Mount routes under `/api/`
- Apply RateLimit only to POST `/api/contact`
- Read `PORT` env var (default `8080`), `DATA_DIR` env var (default `./data`)
- Start server with log output

- [ ] **Step 6: Install dependencies and test manually**

```bash
cd backend && go mod tidy
go run cmd/server/main.go &
curl -s http://localhost:8080/api/health | python3 -m json.tool
curl -s http://localhost:8080/api/projects | python3 -m json.tool | head -20
curl -s http://localhost:8080/api/hackathons | python3 -m json.tool | head -20
curl -s http://localhost:8080/api/projects?category=hackathon | python3 -m json.tool | head -20
curl -s http://localhost:8080/api/projects/emohunter | python3 -m json.tool
kill %1
```

Expected: JSON responses with real data for each endpoint.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): Go API with repository pattern, handlers, and middleware"
```

---

## Task 3: Frontend — Vite + React + Tailwind + Router Scaffold

**Files:**
- Create: `frontend/` (entire Vite scaffold)
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/styles/theme.css`

- [ ] **Step 1: Scaffold Vite React TypeScript project**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom@7 @tanstack/react-query tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Configure Tailwind via Vite plugin**

Update `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})
```

- [ ] **Step 3: Create TypeScript types**

Create `frontend/src/types/index.ts` with interfaces matching Go models exactly: `Project`, `Hackathon`, `Experience`, `SkillDomain`, `SkillSubcategory`, `Music`, `ContactRequest`. Copy from `.claude/docs/architecture.md` data models section.

- [ ] **Step 4: Create API client**

Create `frontend/src/lib/api.ts`:
- Base URL: `/api` (proxied by Vite in dev)
- Functions: `fetchProjects(category?)`, `fetchProject(slug)`, `fetchHackathons()`, `fetchExperience()`, `fetchSkills()`, `fetchMusic()`, `submitContact(data)`
- Each function uses `fetch()`, checks `response.ok`, returns typed JSON
- Export all functions

- [ ] **Step 5: Create CSS theme file**

Create `frontend/src/styles/theme.css` with ALL CSS custom properties from `.claude/docs/UI-implement-design.md` — color tokens, radius scale, shadow tokens, spacing scale, grid system variables, glass tokens. Import Google Fonts (Space Mono, Inter). Also include the `@property` registration for `--prism-angle`.

Update `frontend/src/index.css` (or main CSS entry) to import Tailwind and theme:
```css
@import "tailwindcss";
@import "./styles/theme.css";
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): Vite + React + Tailwind scaffold with types, API client, theme"
```

---

## Task 4: Frontend — Global Layout Components

**Files:**
- Create: `frontend/src/components/global/GridBackground.tsx`
- Create: `frontend/src/components/global/CrosshairCursor.tsx`
- Create: `frontend/src/components/global/TabNavigation.tsx`
- Create: `frontend/src/components/global/NoiseOverlay.tsx`
- Create: `frontend/src/components/global/Layout.tsx`

- [ ] **Step 1: Build GridBackground component**

Create `frontend/src/components/global/GridBackground.tsx`:
- Renders the COORDINATE-style grid: fixed background layer with CSS `background-image` linear gradients at `var(--cell-size)` intervals
- X ruler (horizontal): fixed bar at top, height `var(--ruler-x-height)`, generates column labels (A, B, C... or numbers) based on viewport width / cell size
- Y ruler (vertical): fixed bar at left, width `var(--ruler-y-width)`, generates row numbers
- Corner piece: fixed black square at top-left intersection
- Coordinates display: fixed bottom-right, shows current cursor grid position (`X: {col} | Y: {row}`)
- Rulers generate labels dynamically on mount + window resize
- Reference: `.claude/docs/UI-implement-design.md` → COORDINATE reusable elements table

- [ ] **Step 2: Build CrosshairCursor component**

Create `frontend/src/components/global/CrosshairCursor.tsx`:
- Two fixed divs: small dot (4px, follows mouse instantly) + outline circle (40px, follows with easing via `requestAnimationFrame` lerp)
- Outline has `::before` and `::after` pseudo-elements for crosshair lines
- Hides default cursor on body (`cursor: none`)
- Expands outline on hover over interactive elements (buttons, links) — use event delegation on `mouseenter`/`mouseleave` for `.interactive` class
- Only renders on desktop (check `window.matchMedia('(pointer: fine)')`)
- Active cell indicator: additional div that snaps to grid cell positions (nearest `--cell-size` multiple)

- [ ] **Step 3: Build TabNavigation component**

Create `frontend/src/components/global/TabNavigation.tsx`:
- Uses React Router `<NavLink>` for each tab
- Three tabs: About, Projects, Contact
- Tab shape: trapezoid via `clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%)`
- Active tab: higher z-index, background matches page body, visually "connected"
- Inactive tabs: darker background, hover lifts slightly (`translateY(-2px)`)
- Font: Space Mono, 14px, uppercase
- Positioned at top of page, below X ruler
- On landing page (`/`): tabs are hidden (landing has its own entry point)
- Sharp corners (0px radius) per edge shape system — these are structural navigation, not buttons

- [ ] **Step 4: Build NoiseOverlay component**

Create `frontend/src/components/global/NoiseOverlay.tsx`:
- Fixed full-viewport div with SVG `<feTurbulence>` noise pattern as `background-image`
- `mix-blend-mode: overlay`, `opacity: 0.15`, `pointer-events: none`
- z-index above content but below cursor

- [ ] **Step 5: Build Layout component**

Create `frontend/src/components/global/Layout.tsx`:
- Wraps page content with: `GridBackground` + `NoiseOverlay` + `CrosshairCursor` + `TabNavigation`
- Uses React Router `<Outlet />` for nested page content
- Main content area is positioned after rulers with appropriate margin (`margin-top: var(--ruler-x-height); margin-left: var(--ruler-y-width)`)
- The `Layout` takes a prop `showTabs` (default true) — landing page passes `false`

- [ ] **Step 6: Verify components render**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — should see the grid background, rulers with labels, corner piece, crosshair cursor following mouse, noise grain overlay, and tab navigation.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/global/
git commit -m "feat(frontend): global layout — grid background, rulers, cursor, tabs, noise overlay"
```

---

## Task 5: Frontend — Routing + Page Shells + Data Integration

**Files:**
- Create: `frontend/src/pages/Landing.tsx`
- Create: `frontend/src/pages/About.tsx`
- Create: `frontend/src/pages/Projects.tsx`
- Create: `frontend/src/pages/Contact.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Set up React Router + TanStack Query in App.tsx**

Update `frontend/src/App.tsx`:
- Wrap app in `QueryClientProvider` from TanStack Query
- Define routes with `createBrowserRouter`:
  - `/` → `Landing` (no layout tabs)
  - Layout wrapper with tabs → nested routes:
    - `/about` → `About`
    - `/projects` → `Projects`
    - `/projects/:slug` → `ProjectDetail` (placeholder for Phase 4)
    - `/contact` → `Contact`

Update `frontend/src/main.tsx` to render `<RouterProvider>`.

- [ ] **Step 2: Create Landing page shell**

Create `frontend/src/pages/Landing.tsx`:
- For now: centered text "YONGKANG ZOU" in large Inter font + subtitle "Creative Technologist. 9x Hackathon Winner." on a plain grey background
- A "ENTER" button (rounded, 8px radius — it's interactive) that navigates to `/about`
- Full viewport height, no grid/tabs visible (these come in Phase 2 with the real landing)

- [ ] **Step 3: Create About page shell with live data**

Create `frontend/src/pages/About.tsx`:
- Use TanStack Query hooks to fetch from `/api/experience`, `/api/skills`, `/api/music`
- Render experience entries as simple COORDINATE-style content cards (white bg, grid overlay, sharp corners) with role, company, dates, skillAssembled narrative
- Render skills as grouped lists inside content cards
- Show loading state and error state
- This is a working page with real data — not a placeholder

- [ ] **Step 4: Create Projects page shell with live data**

Create `frontend/src/pages/Projects.tsx`:
- Use TanStack Query to fetch from `/api/projects`
- Render category filter tabs at top: ALL | FAVORITE | HACKATHON | INDUSTRY | ACADEMIC | SIDE
- Filter tabs are pill-shaped (12px radius — they're clickable)
- Render project cards as COORDINATE-style content cards with title, date, tags, category, result
- Tags that are non-clickable labels: 2px radius. Filter pills: 12px radius.
- Sorted by date descending

- [ ] **Step 5: Create Contact page shell**

Create `frontend/src/pages/Contact.tsx`:
- Simple form: name, email, message fields (6px radius — they're inputs)
- Hidden honeypot field (`website`)
- Submit button (8px radius — interactive)
- Uses `submitContact` from API client
- Success/error states
- Social links: GitHub, LinkedIn, Email — displayed in grid-aligned layout

- [ ] **Step 6: Verify end-to-end**

```bash
# Terminal 1: start backend
cd backend && go run cmd/server/main.go

# Terminal 2: start frontend
cd frontend && npm run dev
```

Open `http://localhost:5173`:
- Landing page shows name + enter button
- Click ENTER → navigates to `/about` with grid, rulers, tabs visible
- About page shows real work experience + skills from API
- Projects page shows real projects with working category filters
- Contact page has a working form
- Tab navigation switches between pages
- Grid background, rulers, cursor, noise overlay visible on all inner pages

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): routing, page shells with live API data, end-to-end working"
```

---

## Task 6: Makefile + .gitignore Updates

**Files:**
- Create: `Makefile`
- Modify: `.gitignore`

- [ ] **Step 1: Create Makefile**

```makefile
.PHONY: dev dev-backend dev-frontend build

dev:
	@echo "Starting backend and frontend..."
	@make dev-backend & make dev-frontend

dev-backend:
	cd backend && go run cmd/server/main.go

dev-frontend:
	cd frontend && npm run dev

build-backend:
	cd backend && go build -o bin/server cmd/server/main.go

build-frontend:
	cd frontend && npm run build

build: build-backend build-frontend
```

- [ ] **Step 2: Update .gitignore**

Add to `.gitignore`:
```
# Dependencies
frontend/node_modules/
backend/bin/

# Build output
frontend/dist/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Superpowers
.superpowers/
```

- [ ] **Step 3: Test `make dev`**

```bash
make dev
```

Both backend (:8080) and frontend (:5173) should start. Verify `http://localhost:5173` loads with full grid layout and API data.

- [ ] **Step 4: Final commit for Phase 1**

```bash
git add Makefile .gitignore
git commit -m "chore: add Makefile and update .gitignore"
```

---

## Verification Checklist (Phase 1 Complete When...)

- [ ] `make dev` starts both backend and frontend
- [ ] `curl localhost:8080/api/projects` returns 19 projects as JSON
- [ ] `curl localhost:8080/api/hackathons` returns 24 hackathons as JSON
- [ ] `curl localhost:8080/api/projects?category=hackathon` returns only hackathon projects
- [ ] `curl localhost:8080/api/projects/emohunter` returns single project
- [ ] Frontend grid background with rulers renders on all inner pages
- [ ] Custom crosshair cursor follows mouse, snaps to grid
- [ ] Tab navigation (About/Projects/Contact) switches routes
- [ ] About page displays real experience + skills data
- [ ] Projects page displays real projects with working category filter
- [ ] Contact page form submits without error
- [ ] Noise grain overlay visible
- [ ] Landing page has no grid/tabs (just hero text + enter button)
- [ ] Edge shape system is correct: cards = sharp, buttons = 8px, filter pills = 12px, inputs = 6px, static tags = 2px
