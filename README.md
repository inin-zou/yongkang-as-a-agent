# yongkang.dev

Personal portfolio for Yongkang ZOU — AI Engineer in Stockholm.

The concept is "super agent with many skills" — a file-system-based portfolio where visitors browse `.md` files in a Note App-style interface.

**Live at [yongkang.dev](https://yongkang.dev)**

## Stack

- **Backend:** Go (chi router), serverless on Vercel (`api/index.go`)
- **Frontend:** React 19 + Vite + TanStack Query + Three.js + GSAP + Tailwind CSS v4
- **Database:** Supabase (PostgreSQL) — all content admin-editable via inline CMS
- **AI:** Gemini API for blog post generation & refinement with image analysis (File API)
- **Audio:** Persistent music player with playlist, client-side WAV-to-MP3 via ffmpeg.wasm
- **Media:** HEIC-to-PNG conversion (heic2any), mermaid.js diagram rendering
- **Deploy:** Vercel (Git integration auto-deploy) + Cloudflare DNS

## Pages

| Tab | Description |
|---|---|
| **SOUL.md** | Bio, stats, projects status board |
| **SKILL.md** | Skills, resume, hackathons (dotted map + timeline) |
| **MEMORY.md** | Blog with three categories, likes, comments, guestbook |
| **CONTACT.md** | Direct channels (GitHub, LinkedIn, Hugging Face) + contact form |
| **MUSIC.md** | Artist profile + waveform audio player with persistent playback |
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

# Deploy (auto-deploys on git push to main via Vercel Git integration)
git push origin main
```

## Architecture

```
api/index.go              Vercel serverless entrypoint (chi router)
backend/
  pkg/handler/            API handlers + Gemini AI (generate + refine)
  pkg/service/            Business logic (primary/fallback pattern)
  pkg/repository/         Supabase + embedded JSON data access
  pkg/model/              Go types
  data/*.json             Fallback data (embedded via go:embed)
frontend/
  src/pages/              Page components ({Name}Page.tsx)
  src/components/
    admin/                AdminBar, EditableItem, PostEditor, MediaUploadBar
    global/               Layout, FileSystemLayout, MusicPlayerBar, BlogPostContent
    skill/                HackathonMap, SkillsView, ResumeView
    navigation/           Sidebar, TabNavigation, Breadcrumb
  src/hooks/              useAdminEdit, useBlogMediaUpload, useReducedMotion
  src/lib/                API client, auth, markdown, mediaConvert, MusicPlayerContext
  src/styles/             CSS (theme, file-system, admin, memory, player, etc.)
```

## Key Features

- **Inline admin editing** — admin sees EDIT button on every page, edits in place
- **AI blog drafting** — generate posts from rough ideas, or refine existing posts with REFINE WITH AI
- **Smart media placement** — Gemini analyzes uploaded images via File API, places inline (Type A) or in WeChat-style gallery grids (Type B)
- **WeChat Moments gallery** — 1 image shows full, 2+ images crop to square grid (2-col or 3-col based on count)
- **Click-to-expand lightbox** — all blog images open fullscreen via portal overlay, Escape to close
- **Mermaid diagrams** — `<pre class="mermaid">` blocks render as diagrams with dark theme
- **Persistent music player** — slim bar at bottom, continues playing across tab navigation, playlist with repeat modes
- **Markdown editor** — content stored as HTML, edited as markdown (turndown + marked)
- **Media conversion** — HEIC-to-PNG (heic2any), WAV-to-MP3 (ffmpeg.wasm), all client-side
- **Mobile responsive** — collapsible sidebar, full-screen layout, scrollable tabs on phones
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
| `GEMINI_API_KEY` | Gemini API for AI draft generation & refinement |
