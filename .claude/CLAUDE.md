# Yongkang-as-a-Agent Portfolio

## Project Overview

Personal portfolio website for Yongkang ZOU — an AI Engineer in Paris. The concept is "super agent with many skills" — a file-system-based portfolio where visitors browse `.md` files in a Note App-style interface.

## Current State

**Phase 1 (Foundation):** DONE — Go backend API + React/TS frontend scaffold
**Phase 2 (File System Shell):** DONE — Note App layout with .md tabs, sidebar, breadcrumb
**Phase 3 (Landing Page):** DONE — Temporal Anomaly prismatic ribbons + Symmetry Breaking ticket
**Phase 4 (SOUL.md + CONTACT.md):** DONE — editor-style pages with sidebar items

**Next:** Phase 5 (SKILL.md — GSAP animation + hackathon map), Phase 6 (Supabase), Phase 7 (MEMORY.md blog), Phase 8 (MUSIC.md player)

## How to Run

```bash
# Backend (Go API on :8080)
cd backend && go run cmd/server/main.go

# Frontend (React on :5173, proxies /api to :8080)
cd frontend && npm run dev

# Or both:
make dev
```

## Key Docs (read these first)

- `.claude/docs/portfolio-design-principles.md` — brand, colors, typography, edge shapes
- `.claude/docs/UX-design.md` — page hierarchy, .md tabs, sidebar config, all sections
- `.claude/docs/UI-implement-design.md` — reusable elements, CSS tokens, glassmorphism, iridescent techniques
- `.claude/docs/architecture.md` — Go backend + React frontend, Supabase schema, API endpoints, deployment
- `.claude/docs/yongkang-profile.md` — all personal data (experience, hackathons, skills, music)
- `.claude/docs/future-scalability.md` — how to add content, enhancement roadmap

## Implementation Plans

All plans in `.claude/docs/plans/`:
- `2026-04-03-portfolio-master-plan.md` — 9-phase overview
- `2026-04-03-phase1-foundation.md` through `phase9-polish-deploy.md` — detailed per-phase plans

Plans have been cross-checked and fixed for consistency. 20 issues found and resolved.

## Design References

HTML design references in `.claude/design-refs/`:
1. LUMO Studios — 3D point cloud, blur reveal (→ landing inspiration)
2. COORDINATE — grid/rulers (→ removed, too busy)
3. Temporal Anomaly — data ribbons, timeline (→ landing background + hackathon timeline)
4. Symmetry Breaking — ticket/pass layout (→ landing ticket)
5. Abyssal Telemetry — isometric wireframes (→ optional skills enhancement)
6. Note App — tabs + sidebar + editor (→ core file system pattern)
7. Vortex Portfolio — 3D tube gallery (→ optional photo gallery)

## Architecture

- **Backend:** Go (chi router), serves JSON data files via REST API
- **Frontend:** React 19 + Vite + Tailwind CSS + Three.js + GSAP
- **Future:** Supabase (auth, blog posts, feedback, music storage)
- **Deploy:** Vercel (frontend) + Fly.io (backend) + `yongkang.dev` domain

## Design Decisions Made

- **Theme:** Dark palette with prismatic iridescent accents (holographic minimalism)
- **Layout:** Note App floating window pattern (not full-bleed)
- **Tabs:** `.md` file naming (SOUL.md, SKILL.md, MEMORY.md, CONTACT.md, MUSIC.md)
- **No grid background** — removed COORDINATE grid lines, too busy
- **No custom cursor** — removed crosshair cursor, using default cursor
- **No corner piece** — removed
- **Edge shapes:** Sharp (0px) for static, rounded (6-12px) for interactive
- **Typography:** Inter (body) + Space Mono (data/labels)
- **Blog tab:** MEMORY.md (agent's memory log)

## APIs/Keys Needed for Future Phases

- Supabase project (URL, anon key, service key, DB URL, JWT secret) — Phase 6
- Mapbox access token — Phase 5
- Domain `yongkang.dev` — Phase 9
- Fly.io account — Phase 9
- Music files (.wav/.mp3) — Phase 8
- Vertical singing photo — Phase 8

## Code Conventions

- Go: repository pattern, chi router, JSON file data store
- React: functional components, TanStack Query for data fetching
- CSS: custom properties in `theme.css`, `.editor-*` classes for page content
- Pages: `{Name}Page.tsx` naming convention
- Sidebar config: `sidebarConfig.ts` is single source of truth for navigation
