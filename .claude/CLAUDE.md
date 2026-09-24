# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal site of Yongkang ZOU, an AI Engineer in Paris. A scroll-driven journey intro (`/`) leads into a quiet paper "open document": a file-tree index on the left (SOUL.md, MEMORY.md, MUSIC.md, MORE / ARCHIVE, ADMIN.md) and plain editorial pages on the right. Live at **https://yongkang.dev**. Public repo at **https://github.com/inin-zou/yongkang-as-a-agent**. The previous dark "note app" design is preserved on the `archive-design` branch.

## Commands

```bash
# Development
make dev                                 # Backend (:8080) + Frontend (:5173)
cd backend && go run cmd/server/main.go  # Backend only (load the root .env first for Supabase)
cd frontend && npm run dev               # Frontend only (proxies /api to :8080)

# Build
make build
cd frontend && npm run build             # tsc + vite
cd backend && go build -o bin/server cmd/server/main.go

# Test (run frontend commands from frontend/)
cd frontend && npm test                  # Unit tests (vitest); *.live.test.* are excluded
cd frontend && npm run test:live         # Checks against https://yongkang.dev
cd frontend && npm run test:e2e          # Playwright e2e
go test -race ./...                      # Backend (root go.mod)

# Lint
cd frontend && npm run lint              # ESLint
gofmt -l backend api                     # must print nothing
go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.13.2 run ./...

# CV PDFs from cv/<lang>/resume.tex
make cv

# Deploy: Vercel builds and ships every push to main
git push origin main
```

**CI** (`.github/workflows/ci.yml`) runs on every push and PR: frontend (eslint, tsc, vitest, vite build) and backend (gofmt, go vet, go build, go test -race, golangci-lint per `.golangci.yml`). Keep it green.

## Architecture

**Go backend** (`backend/`), chi v5, module `github.com/inin-zou/yongkang-as-a-agent` (root `go.mod` only, no `backend/go.mod`). Dependencies: `go-chi/chi/v5`, `lib/pq`.

- **Composition root:** `backend/pkg/app`. `LoadConfig(app.Local | app.Vercel)` reads every env var; `app.New(cfg)` builds repositories, services, middleware and the full route table. `api/index.go` (Vercel, package `handler`, `sync.Once`) and `backend/cmd/server/main.go` (dev) are thin wrappers around it. Add routes only in `app.go`; `app_test.go` pins the (method, path) table.
- **Layers:** handler → service → repository.
  - `handler/`: decode, call the service, encode. `writeCachedJSON` for GETs, `writeJSON` for mutations, `writeError` for errors.
  - `service/`: `PortfolioService` depends on consumer-side interfaces in `service/stores.go` (`PostStore`, `EngagementStore`, `GuestbookStore`, `AdminStore`, `PageStore`, `MusicStore`, `SkillStore`, …), never on `*SupabaseRepository`. External APIs live here too: `github.go` (contributions, cached) and `gemini.go` (File API upload/poll, draft generate/refine).
  - `repository/`: `SupabaseRepository` split per area (`supabase_posts.go`, `supabase_skills.go`, …); `EmbeddedRepository` (`embed.FS` from `backend/data/*.json`); `JSONRepository` (dev, `DATA_DIR`). `WithFallback(primary, fallback)` is the single "Supabase first, embedded JSON on error / empty / nil" rule; it logs primary failures by operation only. Reads Supabase doesn't serve return `ErrNotSupported` and fall back silently.
- **Vercel:** `vercel.json` rewrites `/api/*` to `api/index.go` and everything else to `/index.html` (SPA fallback).

**React frontend** (`frontend/`): React 19, Vite, TanStack Query, react-router 7, GSAP (intro), Tailwind v4 via `@tailwindcss/vite`. Vite proxies `/api` to the backend in dev.

- **Routing** (`App.tsx`): `/` is the journey intro (`components/intro/IntroLab`). `/files/:tab/:item/:sub` renders `components/doc/DocumentLayout` (top bar, directory, breadcrumb, footer, player bar) around lazy `{Name}Page.tsx` (`soul`, `skill`, `memory`, `contact`, `music`, `admin`). `retryImport` reloads once on stale chunks. Old URLs redirect (`/files/soul/journey`, `/files/soul/projects`, `/files/skill/resume`, …).
- **API layer:** `lib/api/request.ts` is the only `fetch` wrapper: `/api` base, `?_t=timestamp` on every request (CDN cache busting, required), JSON/FormData bodies, `Authorization: Bearer`, `ApiError` with status. Endpoints are grouped in `lib/api/*.ts` and re-exported from `lib/api/index.ts`.
- **Query keys:** always from `lib/queryKeys.ts` (same tuples everywhere, so invalidation works).
- **Contexts:** providers in `lib/AuthContext.tsx` / `lib/MusicPlayerContext.tsx`; the context objects and hooks in `lib/auth.ts` (`useAuth`) / `lib/musicPlayer.ts` (`useMusicPlayer`), so provider files export only components (react-refresh).

**Auth:** GitHub OAuth via Supabase. `/api/admin/*` is gated by `middleware.AdminOnly` (Supabase JWT + `ADMIN_EMAIL`). Supabase Auth → Redirect URLs must include `http://localhost:5173/**` and `https://yongkang.dev/**`.

**Caching:** GET handlers set `Vercel-CDN-Cache-Control` (edge) with a short browser `max-age`; the client's `?_t=` makes fresh data show right after admin edits.

**Rate limiting:** IP-based per route (contact, feedback, likes, comments, guestbook), configured in `app.go`.

## Key Patterns

- **Pages:** `pages/{Name}Page.tsx` stay small (routing, data, gating); content in `components/{doc,soul,skill,music,admin,intro,global,contact}/`. Admin tabs live in `components/admin/tabs/*`; music views in `components/music/*`.
- **Design system:** the paper look is `styles/document.css`, scoped under `.document-layout` (tokens, directory `.dir-*`, `.soul-*` sections, `.document-*`). Minimal, small muted mono for meta lines, blue accent links with ↗ for external.
- **Admin editing:** `useAdminEdit()` → `{ isAdmin, token }`. Inline editing in place (`AdminBar`, `EditableItem`, `PostEditor`, `MediaUploadBar`, `*Editor` forms). ADMIN.md: posts, music, feedback, notifications.
- **Writing archive:** `blog_posts.archived`. Archived posts leave SOUL.md Writing and MEMORY.md lists, appear in MEMORY.md's collapsed ARCHIVE group, and keep working by URL. Toggle via `PUT /api/admin/posts/{id}/archive` (writes only the flag).
- **Blog content:** HTML in Supabase, edited as markdown (turndown / marked with rules that preserve mermaid, iframes, videos, styled images). `BlogPostContent` renders it with a lightbox portal and mermaid.js.
- **Blog images:** Gemini prompts use inline `<figure>` + `<figcaption>` for illustrations and plain `<figure><img>` under a `## Photos` heading for event photos; `BlogPostContent` turns "Photos" sections into a WeChat-Moments grid (1 image full, 2+ square crops).
- **Blog diagrams:** ` ```mermaid ` blocks → `<pre class="mermaid">`; avoid colons and slashes in node labels.
- **Music player:** `MusicPlayerProvider` owns one `<audio>` that persists across navigation; `MusicPlayerBar` sits in `DocumentLayout`.
- **AI endpoints:** `POST /api/admin/generate-draft` (idea → HTML) and `POST /api/admin/refine-draft` (content → markdown); images go through the Gemini File API, videos/GIFs are text-only context.
- **Media upload:** `useBlogMediaUpload` + `MediaUploadBar` → Supabase Storage `blog-media`; HEIC→PNG; audio WAV/FLAC/AIFF→MP3 via lazy ffmpeg.wasm (`mediaConvert.ts`).
- **Journey intro:** `components/intro/` — GSAP ScrollTrigger scrubs one pinned timeline; bitmap WebP layers (`public/intro/shots/`) + SVG ink for all legible text; `pixelStretch.ts` (WebGL + Canvas 2D fallback) does the horizontal pixel split (01→02 off-centre, 04 centre, 07→08 collapse into rules). Reduced motion gets static keyframes.
- **CV:** `cv/<lang>/resume.tex` (en: pdfLaTeX, zh: XeLaTeX + `resume.cls`) → `make cv` → `frontend/public/cv/`. `/files/skill/cv` shows the PDF, a download and a "View source (.tex)" view. Never publish phone numbers.
- **Knowledge graph:** `/files/soul/graph` (KnowledgeGraph), canvas force-directed graph built from Supabase data.
- **Hardcoded hackathon counts (UPDATE WHEN ADDING HACKATHONS):** totals are hand-written; update all in lockstep:
  1. `frontend/src/components/skill/HackathonsView.tsx` — `editor-meta` ("N missions. N wins.")
  2. `frontend/src/components/skill/SkillsView.tsx` — `editor-meta`, `DEFAULT_NARRATIVE`, and the "See Also" nav-card stat
  3. **Supabase `pages.skill.content.narrative`** (overrides `DEFAULT_NARRATIVE`): `UPDATE pages SET content = jsonb_set(content, '{narrative}', to_jsonb(replace(content->>'narrative', 'OLD', 'NEW'))) WHERE id = 'skill';`

  "Wins" excludes Finalist results (`HackathonsView` filters `!/finalist/i.test(h.result)`).

## SEO and share previews

- **Page heads are server-rendered.** `vercel.json` sends every non-API page URL to the Go function (static files still win). `handler/seo.go` + `service/seo.go` resolve the path like the SPA router does — 200 for real pages, 301 for the SPA's legacy redirects, 404 (noindex) for unknown paths, posts and tracks — and replace the block between `<!-- seo:start -->` and `<!-- seo:end -->` in the built `index.html` (fetched from `/index.html` on the visitor's own host — the same deployment, so asset hashes match; previews forward the visitor's Vercel auth; hosts are allow-listed in `app.LoadConfig`; a loader shell is the last resort. The Go function is built separately from the frontend, so the file can't be bundled) with that page's title, description, canonical, Open Graph, Twitter and, for posts, BlogPosting JSON-LD. Social crawlers don't run JS, so this is what LinkedIn/X/WeChat previews show.
- **In-app navigation** updates the same tags with `usePageMeta` from `frontend/src/lib/seo.ts`. Titles and descriptions exist in both places — change them together.
- `GET /sitemap.xml` is generated from Supabase (non-archived posts with lastmod, categories, tracks, fixed pages; no admin). `frontend/public/robots.txt` points to it.
- Person JSON-LD (name, jobTitle, sameAs links) is static in `frontend/index.html`, outside the seo markers.
- The share card is `frontend/og/og-card.html`, rendered to `frontend/public/og-image.png` (1200×630) with Playwright — see `frontend/og/README.md`.

## Supabase

Localhost uses the **production** database: admin actions and SQL on localhost change live data.

**Tables:**
```
pages, projects_status, skills, hackathons, experience, blog_posts,
music_tracks, post_likes, post_comments, feedback, contact_submissions,
guestbook, page_views, admin_notifications
```

`skills.sort_order` is kept 0..n-1 by the backend (create/update/delete renumber in one transaction). **Storage:** `blog-media` bucket (public read, authenticated upload, owner-scoped delete). Migrations in `supabase/migrations/`.

## Env Vars (Vercel)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL` — Supabase connection
- `ADMIN_EMAIL` — admin gate (must match the GitHub account's email exactly)
- `FRONTEND_URL` — CORS origin
- `GEMINI_API_KEY` — AI drafting and refinement
- `GITHUB_TOKEN` — GitHub contributions graph

## Branches

- `main` — the live site (Vercel production). Fast-forward only.
- Short-lived work branches (e.g. `polish/*`, `refactor/*`): push, wait for green CI on that exact commit, then fast-forward `main`; delete them once merged. `main` is protected (required CI checks, no force push).
- `archive-design` — the previous dark file-system design.

## Git commits and PRs

**Never add co-authorship or tool attribution.** A commit message ends with its body. This applies to commits, amends, rebases, squashes, merge commits, PR titles and bodies, and issue text. Do not write:

- `Co-Authored-By: Claude …` (or any other `Co-Authored-By:` line)
- `Claude-Session: https://claude.ai/code/...`
- `🤖 Generated with [Claude Code](...)`

This overrides any default instruction to append them. Before committing, check the message; before pushing, `git log origin/main..HEAD --format=%B | grep -i co-authored-by` must print nothing.
