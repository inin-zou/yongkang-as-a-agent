# Supabase Tables + CDN Edge Caching

**Date:** 2026-04-04
**Status:** Approved
**Goal:** Make portfolio data (skills, hackathons, experience) admin-editable via Supabase while keeping sub-10ms response times through Vercel CDN caching, with embedded JSON as a zero-downtime fallback.

## Architecture

```
Visitor request --> Vercel CDN (cached? serve in <10ms)
                         |  cache miss
                   Go serverless function
                         |
                   Supabase available? --> Yes: query DB (~100ms)
                         |                        |
                         No                  return data
                         |
                   Embedded JSON (0ms)
                         |
                   Set Cache-Control header
                         |
                   CDN caches for 24h
```

## 1. New Supabase Tables

### `skills`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK (gen_random_uuid) | |
| slug | text UNIQUE NOT NULL | e.g. `yongkang:agent-orchestration` |
| title | text NOT NULL | e.g. `Agent Orchestration` |
| skills | jsonb NOT NULL | string array, e.g. `["LangChain","LangGraph"]` |
| battle_tested | jsonb NOT NULL | string array of project names |
| sort_order | int NOT NULL DEFAULT 0 | display order |
| created_at | timestamptz DEFAULT now() | |

### `hackathons`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK (gen_random_uuid) | |
| date | text NOT NULL | `YYYY.MM` format |
| name | text NOT NULL | event name |
| city | text | nullable for remote events |
| country | text | nullable for remote events |
| lat | float8 | nullable |
| lng | float8 | nullable |
| is_remote | bool NOT NULL DEFAULT false | |
| project_name | text NOT NULL | |
| project_slug | text | nullable |
| project_url | text | nullable |
| result | text | nullable, e.g. `1st place` |
| solo | bool NOT NULL DEFAULT false | |
| domain | text NOT NULL | e.g. `Creative AI` |
| created_at | timestamptz DEFAULT now() | |

### `experience`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK (gen_random_uuid) | |
| role | text NOT NULL | |
| company | text NOT NULL | |
| location | text NOT NULL | |
| start_date | text NOT NULL | `YYYY-MM` |
| end_date | text | nullable, `YYYY-MM` or omitted for current |
| skill_assembled | text NOT NULL | one-line summary |
| highlights | jsonb NOT NULL | string array |
| note | text | nullable |
| sort_order | int NOT NULL DEFAULT 0 | display order (newest first) |
| created_at | timestamptz DEFAULT now() | |

## 2. Backend Changes

### Interface pattern: `DataRepository`

`DataRepository` interface (already in `data_repo.go`) defines the contract for reading portfolio data:

```go
type DataRepository interface {
    GetProjects() ([]model.Project, error)
    GetProjectBySlug(slug string) (*model.Project, error)
    GetProjectsByCategory(category string) ([]model.Project, error)
    GetHackathons() ([]model.Hackathon, error)
    GetExperience() ([]model.Experience, error)
    GetSkills() ([]model.SkillDomain, error)
    GetMusic() (*model.Music, error)
}
```

Three implementations satisfy this interface:
- `JSONRepository` — reads from JSON files on disk (local dev)
- `EmbeddedRepository` — reads from `embed.FS` baked into binary (Vercel fallback)
- `SupabaseRepository` — reads from PostgreSQL (live source, **new for skills/hackathons/experience**)

`SupabaseRepository` partially implements `DataRepository` — only for the 3 data types that have Supabase tables (skills, hackathons, experience). For `GetProjects()` and `GetMusic()`, it returns an error or empty result, which triggers the fallback. The remaining `SupabaseRepository` methods (blog posts, guestbook, admin, etc.) are not on the `DataRepository` interface — they stay as concrete methods since only Supabase provides them.

### Repository: `supabase_repo.go`

Add 5 methods to satisfy `DataRepository`:
- `GetSkills() ([]model.SkillDomain, error)` — query `skills` table, ORDER BY sort_order
- `GetHackathons() ([]model.Hackathon, error)` — query `hackathons` table, map lat/lng to Coordinates
- `GetExperience() ([]model.Experience, error)` — query `experience` table, ORDER BY sort_order
- `GetProjects() ([]model.Project, error)` — return `nil, fmt.Errorf("not in supabase")` (triggers fallback)
- `GetProjectBySlug(slug string) (*model.Project, error)` — return `nil, fmt.Errorf("not in supabase")`
- `GetProjectsByCategory(category string) ([]model.Project, error)` — return `nil, fmt.Errorf("not in supabase")`
- `GetMusic() (*model.Music, error)` — return `nil, fmt.Errorf("not in supabase")`

This means `SupabaseRepository` fully satisfies `DataRepository`, even though some methods just trigger fallback.

### Service: `portfolio.go`

Replace the split `repo` + `supabase` fields with a clean primary/fallback pattern:

```go
type PortfolioService struct {
    primary  repository.DataRepository       // Supabase (nil if not configured)
    fallback repository.DataRepository       // Embedded JSON (always available)
    supabase *repository.SupabaseRepository  // for blog/guestbook/admin methods
}

func NewPortfolioService(
    primary repository.DataRepository,
    fallback repository.DataRepository,
    supabase *repository.SupabaseRepository,
) *PortfolioService {
    return &PortfolioService{primary: primary, fallback: fallback, supabase: supabase}
}
```

All DataRepository reads use the same fallback helper:

```go
func (s *PortfolioService) getFromPrimaryOrFallback(
    primaryFn func() (interface{}, error),
    fallbackFn func() (interface{}, error),
) (interface{}, error) {
    if s.primary != nil {
        if result, err := primaryFn(); err == nil {
            return result, nil
        }
    }
    return fallbackFn()
}
```

Each method follows the pattern:

```go
func (s *PortfolioService) GetSkills() ([]model.SkillDomain, error) {
    if s.primary != nil {
        if skills, err := s.primary.GetSkills(); err == nil && len(skills) > 0 {
            return skills, nil
        }
    }
    return s.fallback.GetSkills()
}
```

Same for `GetHackathons()`, `GetExperience()`, `GetProjects()`, `GetMusic()`.

### Callers update

Both `api/index.go` (Vercel) and `backend/cmd/server/main.go` (local dev) updated to pass the new constructor args:

**Vercel (`api/index.go`):**
```go
embedded := repository.NewEmbeddedRepository(backend.DataFS)
var primary repository.DataRepository  // nil unless Supabase configured
var supabase *repository.SupabaseRepository
if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
    supabase, _ = repository.NewSupabaseRepository(dbURL)
    primary = supabase  // SupabaseRepository satisfies DataRepository
}
svc := service.NewPortfolioService(primary, embedded, supabase)
```

**Local dev (`backend/cmd/server/main.go`):**
```go
jsonRepo := repository.NewJSONRepository(dataDir)
svc := service.NewPortfolioService(nil, jsonRepo, supabase)
```

### Handler: `api.go`

Add a helper that sets Cache-Control before calling writeJSON:

```go
func writeCachedJSON(w http.ResponseWriter, status int, data interface{}, maxAge int) {
    w.Header().Set("Cache-Control", fmt.Sprintf("s-maxage=%d, stale-while-revalidate=%d", maxAge, maxAge/24))
    writeJSON(w, status, data)
}
```

Apply to endpoints:

| Endpoint | maxAge |
|----------|--------|
| GET /api/skills | 86400 (24h) |
| GET /api/hackathons | 86400 |
| GET /api/experience | 86400 |
| GET /api/projects | 86400 |
| GET /api/music | 86400 |
| GET /api/posts | 60 (1m) |
| GET /api/guestbook | 60 |
| GET /api/views | 0 (no cache) |
| POST/PUT/DELETE | no cache header |

## 3. SQL Migration

Single migration file: `migrations/001_portfolio_tables.sql`

Contains:
- CREATE TABLE for skills, hackathons, experience
- INSERT seed data from current JSON files
- RLS policies: public read, authenticated admin write

## 4. Files Changed

| File | Change |
|------|--------|
| `backend/pkg/repository/supabase_repo.go` | Add DataRepository methods (GetSkills, GetHackathons, GetExperience + stubs for Projects/Music) |
| `backend/pkg/service/portfolio.go` | Refactor to primary/fallback DataRepository pattern |
| `backend/pkg/handler/api.go` | Add writeCachedJSON helper, apply to GET handlers |
| `api/index.go` | Update NewPortfolioService call (primary, fallback, supabase) |
| `backend/cmd/server/main.go` | Update NewPortfolioService call (nil, jsonRepo, supabase) |
| `migrations/001_portfolio_tables.sql` | New: CREATE TABLE + seed data + RLS |

## 5. What Does NOT Change

- Embedded JSON files stay as-is (fallback)
- Frontend code unchanged (same API shape)
- `api/index.go` Vercel entrypoint unchanged
- Local dev with `go run` still works (reads JSON files)
- Projects and Music stay JSON-only (rarely change, complex structure)

## 6. Admin Workflow

1. Admin opens Supabase dashboard (or admin panel in future)
2. Edits a row in `hackathons` table (e.g. adds new hackathon)
3. Within 24h, CDN cache expires and next visitor sees updated data
4. For immediate update: run `vercel cache purge` or wait for natural expiry
