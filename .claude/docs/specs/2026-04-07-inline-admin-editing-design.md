# Inline Admin Editing

**Date:** 2026-04-07 (updated 2026-04-08)
**Status:** Approved
**Goal:** Replace the separate admin panel with inline editing on each page. Admin logs in, sees EDIT buttons on content, edits in place. All page content stored in Supabase for easy updates.

## Supabase Structure

### New table: `pages`

Stores full-page content as JSONB. One row per page.

```sql
CREATE TABLE pages (
  id text PRIMARY KEY,           -- 'soul', 'contact', 'music'
  content jsonb NOT NULL,        -- all structured fields
  updated_at timestamptz DEFAULT now()
);
```

RLS: public read, admin write (authenticated + email check done at Go middleware level).

### New table: `music_tracks`

Individual music tracks as structured rows (like hackathons/skills pattern).

```sql
CREATE TABLE music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,       -- 'pimmies-dilemma', 'soft-spot', 'dream'
  name text NOT NULL,              -- "PIMMIE'S DILEMMA"
  genre text NOT NULL,             -- 'Alternative RnB'
  original text NOT NULL,          -- 'Pimmie, PARTYNEXTDOOR & Drake'
  notes text NOT NULL,             -- description
  file_url text NOT NULL,          -- Supabase storage URL
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

RLS: public read, authenticated write.

### Page content schemas

**soul:**
```json
{
  "subtitle": "AI Engineer · Paris, France",
  "bio": ["Part engineer, part artist...", "Not assembling API wrappers..."],
  "domains": "AI Engineering\n├── Spatial Intelligence & 3D\n├── Music & Audio AI\n├── LLM Infrastructure\n├── Healthcare & Biotech\n├── Quantum Computing\n├── Emotion & Vision AI\n├── Geospatial ML\n└── Creative AI & Content",
  "stats": { "hackathons": 24, "wins": 9, "domains": "8+", "languages": 3 },
  "speed": "Full demo in < 20 hours avg",
  "languages": "Chinese (native) · French (DALF C2) · English (IELTS 7.0)"
}
```

Note: ASCII banner, CLI prompts (`$ agent --tree`, `$ agent --stats`, `$ agent --info`), "See Also" links, and "Last updated" meta text stay **hardcoded** — they're layout/design, not content.

**contact:**
```json
{
  "meta": "Signal channels — always open",
  "email": "yongkang.zou.ai@gmail.com",
  "github": "https://github.com/inin-zou",
  "linkedin": "https://linkedin.com/in/yongkang-zou"
}
```

Note: SVG icons and "Leave a Message" section stay hardcoded (layout).

**music:**
```json
{
  "artistName": "inhibitor",
  "genre": "Indie RnB / Lo-Fi",
  "status": "Recording",
  "location": "Paris, France",
  "bio": "...",
  "platforms": {
    "douyin": "https://...",
    "netease": "https://..."
  }
}
```

Note: `status` and `location` included (required by current UI). Tracks stored separately in `music_tracks` table.

### Complete Supabase schema (corrected)

```
pages               — SOUL, CONTACT, MUSIC page content (JSONB)
music_tracks        — individual music tracks (new)
skills              — skill domains (structured rows)
hackathons          — hackathon entries (structured rows)
experience          — work experience (structured rows)
blog_posts          — memory/blog posts
post_likes          — post likes
post_comments       — post comments
feedback            — visitor feedback
contact_submissions — contact form entries
guestbook           — guestbook entries
page_views          — view counter
admin_notifications — admin activity feed
```

## Frontend Architecture

### Shared `useAdminEdit` hook

New file: `frontend/src/hooks/useAdminEdit.ts`

```tsx
export function useAdminEdit() {
  const { user, session } = useAuth()
  const isAdmin = !!user
  const token = session?.access_token ?? ''
  return { isAdmin, token }
}
```

### Shared `AdminBar` component

Appears at top of editable sections when admin is logged in:

```tsx
function AdminBar({ isEditing, onToggleEdit, onAdd }: {
  isEditing: boolean
  onToggleEdit: () => void
  onAdd?: () => void
}) // renders [+ NEW] [EDIT MODE] buttons using existing admin CSS classes
```

### Shared `EditableItem` wrapper

Wraps each item to show EDIT/DELETE buttons in edit mode:

```tsx
function EditableItem({ isEditMode, isAdmin, onEdit, onDelete, children }: {...})
```

### Per-page inline editing

**SKILL.md pages:**
- `SkillsView.tsx` — wraps each skill entry with EditableItem, shows SkillEditor form inline
- `ResumeView.tsx` — wraps each ExperienceBlock with EditableItem, shows ExperienceEditor inline
- `HackathonsView.tsx` — wraps timeline entries with EditableItem, shows HackathonEditor inline

**MEMORY.md:**
- `MemoryPage.tsx` — wraps each post with EditableItem, shows PostEditor inline

**SOUL.md:**
- Fetches content from `GET /api/pages/soul`
- Falls back to current hardcoded values if API returns nothing
- In edit mode, renders form with: subtitle, bio (2 textareas), domains (textarea), stats (4 number inputs), speed, languages

**CONTACT.md:**
- Fetches content from `GET /api/pages/contact`
- In edit mode: meta, email, github, linkedin fields

**MUSIC.md:**
- Overview fetches from `GET /api/pages/music` (artist profile)
- Track list fetches from `GET /api/music-tracks` (replaces hardcoded TRACKS object)
- Sidebar items built dynamically from music_tracks (like MEMORY.md builds from blog_posts)
- In edit mode: edit artist profile fields + add/edit/delete individual tracks

### Editor form components (extracted from AdminPage)

```
frontend/src/components/admin/
  AdminBar.tsx           — shared edit mode toggle bar
  EditableItem.tsx       — shared item wrapper with EDIT/DELETE
  SkillEditor.tsx        — skill domain form
  HackathonEditor.tsx    — hackathon form
  ExperienceEditor.tsx   — experience form
  PostEditor.tsx         — blog post form
  PageEditor.tsx         — JSONB page editor (soul/contact/music overview)
  TrackEditor.tsx        — music track form
```

### ADMIN.md tab — slimmed down

Only keeps:
- Feedback — view/delete visitor feedback
- Notifications — activity feed

Sidebar items reduced to 2.

### MUSIC.md sidebar — now dynamic

`FileSystemLayout.tsx` updated to build MUSIC.md sidebar from `music_tracks` API (same pattern as MEMORY.md builds sidebar from blog_posts).

## Backend Changes

### New API endpoints

```
GET  /api/pages/{id}              — public, returns page JSONB content, cached 86400s
PUT  /api/admin/pages/{id}        — admin only, updates page content, returns updated content

GET  /api/music-tracks            — public, returns all tracks, cached 86400s
POST /api/admin/music-tracks      — admin only, create track
PUT  /api/admin/music-tracks/{id} — admin only, update track
DELETE /api/admin/music-tracks/{id} — admin only, delete track
```

### Repository (supabase_repo.go)

```go
// Pages
func (r *SupabaseRepository) GetPage(id string) (json.RawMessage, error)
func (r *SupabaseRepository) UpdatePage(id string, content json.RawMessage) (json.RawMessage, error)

// Music tracks
func (r *SupabaseRepository) GetMusicTracks() ([]model.MusicTrack, error)
func (r *SupabaseRepository) CreateMusicTrack(...) (*model.MusicTrack, error)
func (r *SupabaseRepository) UpdateMusicTrack(id string, ...) (*model.MusicTrack, error)
func (r *SupabaseRepository) DeleteMusicTrack(id string) error
```

### Model (types.go)

Add new type:
```go
type MusicTrack struct {
    ID        string `json:"id,omitempty"`
    Slug      string `json:"slug"`
    Name      string `json:"name"`
    Genre     string `json:"genre"`
    Original  string `json:"original"`
    Notes     string `json:"notes"`
    FileURL   string `json:"fileUrl"`
    SortOrder int    `json:"sortOrder,omitempty"`
}
```

### Service (portfolio.go)

- `GetPage`: try Supabase first, fall back to hardcoded default JSONB
- `UpdatePage`: returns updated content (consistent with other PUT patterns)
- `GetMusicTracks`: try Supabase, fall back to empty list
- CRUD for music tracks: same thin wrapper pattern as skills/hackathons/experience

### Handler (api.go)

- `HandleGetPage`: validate id is one of `soul|contact|music`, return 404 otherwise. Set `writeCachedJSON(..., 86400)`.
- `HandleUpdatePage`: admin only, parse `json.RawMessage` body, return updated content.
- Music track handlers: follow exact same pattern as skill CRUD handlers.

### Validation

- `HandleUpdatePage`: id must be `soul|contact|music`, body must be valid JSON
- Music track create/update: name, slug, genre, original, fileUrl required (trimmed non-empty)

### Migration

```sql
CREATE TABLE pages (...);  -- with RLS
CREATE TABLE music_tracks (...);  -- with RLS

INSERT INTO pages (id, content) VALUES
  ('soul', '{...full soul content...}'),
  ('contact', '{...full contact content...}'),
  ('music', '{...full music overview...}');

INSERT INTO music_tracks (slug, name, genre, original, notes, file_url, sort_order) VALUES
  ('pimmies-dilemma', 'PIMMIE''S DILEMMA', 'Alternative RnB', 'Pimmie, PARTYNEXTDOOR & Drake', '...', 'https://...', 0),
  ('soft-spot', 'Soft Spot', 'Lo-Fi RnB', 'keshi', '...', 'https://...', 1),
  ('dream', 'Dream', 'Lo-Fi RnB', 'keshi', '...', 'https://...', 2);
```

## Files Changed

### New files
| File | Purpose |
|------|---------|
| `frontend/src/hooks/useAdminEdit.ts` | Shared admin state hook |
| `frontend/src/components/admin/AdminBar.tsx` | Edit mode toggle bar |
| `frontend/src/components/admin/EditableItem.tsx` | Item wrapper with EDIT/DELETE |
| `frontend/src/components/admin/SkillEditor.tsx` | Skill form (extracted from AdminPage) |
| `frontend/src/components/admin/HackathonEditor.tsx` | Hackathon form (extracted) |
| `frontend/src/components/admin/ExperienceEditor.tsx` | Experience form (extracted) |
| `frontend/src/components/admin/PostEditor.tsx` | Blog post form (extracted) |
| `frontend/src/components/admin/PageEditor.tsx` | JSONB page editor (soul/contact/music) |
| `frontend/src/components/admin/TrackEditor.tsx` | Music track form |
| `supabase/migrations/20260408000000_pages_and_tracks.sql` | Pages + music_tracks tables + seed |

### Modified files
| File | Change |
|------|--------|
| `backend/pkg/model/types.go` | Add MusicTrack type |
| `backend/pkg/repository/supabase_repo.go` | Add GetPage, UpdatePage, music track CRUD |
| `backend/pkg/service/portfolio.go` | Add page + music track service methods |
| `backend/pkg/handler/api.go` | Add page + music track handlers |
| `api/index.go` + `backend/cmd/server/main.go` | Register new routes |
| `frontend/src/types/index.ts` | Add MusicTrack type |
| `frontend/src/lib/api.ts` | Add fetchPage, updatePage, music track CRUD functions |
| `frontend/src/pages/SoulPage.tsx` | Fetch from API, add inline edit |
| `frontend/src/pages/ContactPage.tsx` | Fetch from API, add inline edit |
| `frontend/src/pages/MusicPage.tsx` | Fetch tracks from API (replace hardcoded), add inline edit |
| `frontend/src/pages/MemoryPage.tsx` | Add inline post editing |
| `frontend/src/components/skill/SkillsView.tsx` | Add inline skill editing |
| `frontend/src/components/skill/ResumeView.tsx` | Add inline experience editing |
| `frontend/src/components/skill/HackathonsView.tsx` | Add inline hackathon editing |
| `frontend/src/pages/AdminPage.tsx` | Remove content tabs, keep feedback + notifications only |
| `frontend/src/components/navigation/sidebarConfig.ts` | Slim ADMIN_TAB to 2 items |
| `frontend/src/components/global/FileSystemLayout.tsx` | Build MUSIC.md sidebar dynamically from music_tracks |

## What Does NOT Change

- Existing Supabase tables (skills, hackathons, experience, blog_posts, etc.)
- All existing CRUD API endpoints
- Auth flow
- CDN caching strategy (Vercel-CDN-Cache-Control headers)
- Public visitor experience (no edit buttons when not admin)
- ASCII banners, CLI prompts, layout structure (hardcoded design elements)
