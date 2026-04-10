# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Yongkang ZOU — an AI Engineer in Paris. Concept: "super agent with many skills" — a file-system-based portfolio where visitors browse `.md` files in a Note App-style interface. Live at **https://yongkang.dev**.

## Commands

```bash
# Development
make dev                              # Backend (:8080) + Frontend (:5173) concurrently
cd backend && go run cmd/server/main.go  # Backend only
cd frontend && npm run dev               # Frontend only (proxies /api to :8080)

# Build
make build                            # Both
cd frontend && npm run build          # Frontend only (tsc + vite)
cd backend && go build -o bin/server cmd/server/main.go

# Test
cd frontend && npm test               # All unit tests (vitest)
cd frontend && npx vitest run src/components/admin/__tests__/AdminBar.test.tsx  # Single test file
cd frontend && npm run test:e2e       # Playwright e2e

# Lint
cd frontend && npm run lint           # ESLint

# Deploy (auto-deploys on git push via Vercel Git integration)
git push origin main
```

## Architecture

**Go backend** (`backend/`) serves a REST API via chi router. The Vercel serverless entrypoint is `api/index.go` — a thin wrapper that initializes the same chi router with `sync.Once`. Go module: `github.com/inin-zou/yongkang-as-a-agent`. There is no `backend/go.mod` — only the root `go.mod`.

**React frontend** (`frontend/`) uses React 19 + Vite + TanStack Query + Three.js + GSAP. Tailwind CSS v4. Vite proxies `/api` to the Go backend in dev.

**Data flow:** `api/index.go` → `handler.APIHandler` → `service.PortfolioService` → `repository.DataRepository` (interface). Two implementations: `SupabaseRepository` (primary, PostgreSQL via `lib/pq`) and `EmbeddedRepository` (fallback, `embed.FS` from `backend/data/*.json`). The service tries primary first, falls back to embedded if primary is nil or returns empty results.

**Frontend data:** All API calls go through `frontend/src/lib/api.ts` which exports `fetchJSON` (public) and `fetchAuthJSON` (admin). Both append `?_t=timestamp` for CDN cache busting — this is required on all fetches.

**Auth:** GitHub OAuth via Supabase. Admin routes (`/api/admin/*`) gated by `middleware.AdminOnly` which validates the Supabase JWT and checks email against `ADMIN_EMAIL` env var.

**Caching:** GET handlers use `writeCachedJSON` which sets `Vercel-CDN-Cache-Control: s-maxage=86400` for edge caching. Browser sees `max-age=10`. Client-side `?_t=timestamp` busts CDN cache after mutations.

## Key Patterns

- **Pages:** `{Name}Page.tsx` in `pages/`, content components in `components/{section}/`
- **Admin editing:** `useAdminEdit()` hook returns `{ isAdmin, token }`. Admin UI in `components/admin/` — `AdminBar`, `EditableItem`, `PostEditor`, `MediaUploadBar`, `*Editor` forms
- **Sidebar:** Static tab config in `sidebarConfig.ts`, dynamic sidebar (e.g. MEMORY.md drill-down) built in `FileSystemLayout.tsx`
- **Go handlers:** Use `writeCachedJSON` for GET endpoints, `writeJSON` for mutations, `writeError` for errors
- **Go admin CRUD:** Full CRUD on `SupabaseRepository` for all Supabase tables; admin routes use the JWT-validated supabase connection
- **CSS:** Custom properties in `theme.css`. Class prefixes: `.editor-*` (pages), `.cli-*` (terminal blocks), `.admin-*` / `.editable-item-*` (admin UI), `.music-player-*` (player bar), `.blog-post-content` (rendered blog posts), `.media-upload-*` (upload chips)
- **Blog content:** Stored as HTML in Supabase. Edited as markdown (turndown HTML→MD, marked MD→HTML). `BlogPostContent` component renders with `dangerouslySetInnerHTML` + lightbox portal.
- **Music player:** `MusicPlayerContext` owns a global `<audio>` element that persists across navigation. `MusicPlayerBar` at bottom of `FileSystemLayout`. `AudioPlayer` in MusicPage reads from the same context.
- **AI endpoints:** `POST /api/admin/generate-draft` (rough idea → HTML) and `POST /api/admin/refine-draft` (existing content → markdown). Both upload media to Gemini File API for visual analysis. Refine returns markdown directly; generate returns HTML.
- **Media upload:** `useBlogMediaUpload` hook + `MediaUploadBar` shared component. Uploads to Supabase Storage `blog-media` bucket. Gemini File API for supported types (PNG/JPEG/WEBP/MP4/etc.), skips unsupported (GIF).

## Supabase Tables

```
pages, projects_status, skills, hackathons, experience, blog_posts,
music_tracks, post_likes, post_comments, feedback, contact_submissions,
guestbook, page_views, admin_notifications
```

## Env Vars (Vercel)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL` — Supabase connection
- `ADMIN_EMAIL` — admin gate (must match exactly, no trailing whitespace)
- `FRONTEND_URL` — CORS origin
- `GEMINI_API_KEY` — AI draft generation and refinement

## Design Decisions

- **Theme:** Dark palette with prismatic iridescent accents (holographic minimalism)
- **Layout:** Note App floating window with `.md` tabs
- **Inline editing:** Admin edits content in place — no separate CMS UI
- **CLI aesthetic:** `$ agent --command` terminal blocks throughout
- **MEMORY.md sidebar:** Two-level drill-down with CSS slide animation (categories → posts)
- **Blog images:** Two-type strategy — inline figures with captions (Type A) for illustrations, `.img-gallery` grid (Type B) for event photos. Lightbox via `createPortal` to `document.body`.
- **Music:** Persistent player bar at bottom of app-window, Spotify-style queue (play from here), repeat modes (off/all/one)
