# Yongkang-as-a-Agent Portfolio

## Project Overview

Personal portfolio website for Yongkang ZOU — an AI Engineer in Paris. The concept is "super agent with many skills" — a file-system-based portfolio where visitors browse `.md` files in a Note App-style interface. Live at **https://yongkang.dev**.

## Current State

All phases complete. Site is live with full Supabase CMS and inline admin editing.

- **Landing:** Temporal Anomaly prismatic ribbons + Symmetry Breaking ticket
- **SOUL.md:** README (editable bio/stats) + PROJECTS status board (ACTIVE/PLANNING/ON HOLD/SHIPPED)
- **SKILL.md:** Skills list, Resume (experience), Hackathons (map + timeline) — all inline editable
- **MEMORY.md:** Three-category blog (Hackathon Journey / Technical Blog / Research Reading) with two-level sidebar drill-down animation
- **CONTACT.md:** Direct channels (editable links) + contact form
- **MUSIC.md:** Artist profile + dynamic track list from Supabase with audio player
- **ADMIN.md:** Feedback viewer + notifications (admin-only tab, right side of tab bar)

## How to Run

```bash
# Backend (Go API on :8080)
cd backend && go run cmd/server/main.go

# Frontend (React on :5173, proxies /api to :8080)
cd frontend && npm run dev

# Or both:
make dev

# Tests
cd frontend && npm test          # 53 unit tests (vitest)
cd frontend && npm run test:e2e  # 10 e2e smoke tests (playwright)
```

## Architecture

- **Backend:** Go (chi router), serverless on Vercel (`api/index.go`)
- **Frontend:** React 19 + Vite + TanStack Query + Three.js + GSAP
- **Database:** Supabase (PostgreSQL) — all content admin-editable
- **Data pattern:** `DataRepository` interface with primary (Supabase) / fallback (embedded JSON)
- **Caching:** Vercel CDN edge caching (`Vercel-CDN-Cache-Control: s-maxage=86400`) + `?_t=timestamp` cache busting on all fetches
- **Auth:** GitHub OAuth via Supabase, admin gated by email match
- **Deploy:** Vercel (full-stack) + Cloudflare DNS → `yongkang.dev`

## Supabase Tables

```
pages               — SOUL, SKILL, CONTACT, MUSIC page content (JSONB)
projects_status     — active projects status board
skills              — skill domains (structured rows, reorderable)
hackathons          — hackathon entries
experience          — work experience (structured rows, reorderable)
blog_posts          — memory/blog posts with category (hackathon/technical/research)
music_tracks        — individual music tracks
post_likes          — post likes
post_comments       — post comments
feedback            — visitor feedback
contact_submissions — contact form entries
guestbook           — guestbook entries
page_views          — view counter
admin_notifications — admin activity feed
```

## Key Design Decisions

- **Theme:** Dark palette with prismatic iridescent accents (holographic minimalism)
- **Layout:** Note App floating window pattern with `.md` tabs
- **Inline editing:** Admin sees EDIT button on every page, edits content in place (no separate CMS)
- **AdminBar:** EDIT/SAVE/CANCEL + optional "+ NEW" at top of editable sections
- **EditableItem:** Wraps each item with ↑↓ reorder arrows + ✏️ edit + 🗑️ delete buttons
- **CDN strategy:** 24h edge cache for static data, cache-busted on all client fetches
- **CLI aesthetic:** `$ agent --command` terminal blocks throughout (skills, stats, projects, memory)
- **MEMORY.md sidebar:** Two-level drill-down with CSS slide animation (categories → posts)

## Env Vars (Vercel)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL` — Supabase connection
- `ADMIN_EMAIL` — admin gate (must match exactly, no trailing whitespace)
- `FRONTEND_URL` — CORS origin

## Code Conventions

- **Go:** DataRepository interface, chi router, primary/fallback pattern, `writeCachedJSON` for GET handlers
- **React:** functional components, TanStack Query, `useAdminEdit` hook for admin state
- **Admin components:** `components/admin/` — AdminBar, EditableItem, *Editor forms
- **CSS:** custom properties in `theme.css`, `.editor-*` for pages, `.cli-*` for terminal blocks, `.admin-*` / `.editable-item-*` for admin UI
- **API fetches:** Always use `fetchJSON` (public) or `fetchAuthJSON` (admin) — both add `?_t=timestamp` for CDN cache busting
- **Pages:** `{Name}Page.tsx`, content components in `components/{section}/`
- **Sidebar:** `sidebarConfig.ts` for static tabs, dynamic sidebar built in `FileSystemLayout.tsx`
- **Tests:** vitest + @testing-library/react for unit tests, Playwright for e2e

## Specs

Design specs in `docs/superpowers/specs/`:
- `2026-04-04-supabase-cdn-caching-design.md`
- `2026-04-06-admin-crud-design.md`
- `2026-04-07-inline-admin-editing-design.md`
