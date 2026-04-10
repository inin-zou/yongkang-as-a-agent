# yongkang.dev

Personal portfolio for Yongkang ZOU — AI Engineer in Paris.

The concept is "super agent with many skills" — a file-system-based portfolio where visitors browse `.md` files in a Note App-style interface.

**Live at [yongkang.dev](https://yongkang.dev)**

## Stack

- **Backend:** Go (chi router), serverless on Vercel (`api/index.go`)
- **Frontend:** React 19 + Vite + TanStack Query + Three.js + GSAP + Tailwind CSS v4
- **Database:** Supabase (PostgreSQL) — all content admin-editable via inline CMS
- **AI:** Gemini API for blog post generation/refinement with image analysis (File API)
- **Audio:** Client-side WAV-to-MP3 conversion via ffmpeg.wasm
- **Deploy:** Vercel + Cloudflare DNS

## Pages

| Tab | Description |
|---|---|
| **SOUL.md** | Bio, stats, projects status board |
| **SKILL.md** | Skills, resume, hackathons (map + timeline) |
| **MEMORY.md** | Blog with three categories, likes, comments, guestbook |
| **CONTACT.md** | Direct channels + contact form |
| **MUSIC.md** | Artist profile + audio player |
| **ADMIN.md** | Posts, music, feedback, notifications (admin-only) |

## Development

```bash
# Both backend (:8080) and frontend (:5173)
make dev

# Or separately
cd backend && go run cmd/server/main.go
cd frontend && npm run dev

# Tests
cd frontend && npm test          # vitest
cd frontend && npm run test:e2e  # playwright

# Lint
cd frontend && npm run lint
```

## Architecture

```
api/index.go              Vercel serverless entrypoint (chi router)
backend/
  pkg/handler/            API handlers + Gemini AI integration
  pkg/service/            Business logic (primary/fallback pattern)
  pkg/repository/         Supabase + embedded JSON data access
  pkg/model/              Go types
  data/*.json             Fallback data (embedded via go:embed)
frontend/
  src/pages/              Page components ({Name}Page.tsx)
  src/components/         UI components by section
  src/hooks/              Custom hooks (useAdminEdit, useBlogMediaUpload)
  src/lib/                API client, auth, markdown, audio conversion
  src/styles/             CSS (theme, file-system, admin, memory, etc.)
```

## Key Features

- **Inline admin editing** — admin sees EDIT button on every page, edits content in place
- **AI blog drafting** — generate posts from rough ideas with Gemini, or refine existing posts
- **Smart image placement** — Gemini analyzes uploaded images and places them inline or in gallery grids
- **Click-to-expand lightbox** — all blog images open fullscreen on click
- **CDN caching** — 24h Vercel edge cache with timestamp-based cache busting
- **Primary/fallback data** — Supabase first, embedded JSON fallback if unavailable

## Env Vars

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_EMAIL` | Admin gate (exact email match) |
| `FRONTEND_URL` | CORS origin |
| `GEMINI_API_KEY` | Gemini API for AI draft generation |
