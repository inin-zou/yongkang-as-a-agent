# Phase 6: Supabase Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Supabase project with auth, database tables, storage buckets, and RLS policies. Add Supabase client to both Go backend and React frontend. Add auth endpoints and CRUD endpoints for posts, feedback, and tracks to the Go API.

**Architecture:** The Go backend connects to Supabase PostgreSQL directly via `pgx` (not the Supabase REST API) for full SQL control. Supabase Auth handles admin login with email/password. The Go backend validates Supabase JWTs for protected endpoints. The React frontend uses `@supabase/supabase-js` only for auth flows (login/logout/session); all data operations go through the Go API.

**Tech Stack:** Go (chi, pgx/v5, golang-jwt/jwt/v5, go-playground/validator/v10), Supabase (Auth + PostgreSQL + Storage), @supabase/supabase-js v2

**Reference docs:**
- `.claude/docs/architecture.md` — Supabase schema, API endpoints, auth plan
- `.claude/docs/UX-design.md` — MEMORY.md (blog + feedback), MUSIC.md (tracks)
- `.claude/docs/plans/2026-04-03-phase1-foundation.md` — existing backend patterns

---

## Required Credentials

Before starting implementation, the user must provide the following values. These come from the Supabase dashboard after creating the project (Task 1).

| Variable | Source | Description |
|----------|--------|-------------|
| `SUPABASE_URL` | Supabase Dashboard > Settings > API | Project URL, e.g. `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API | Public anonymous key (safe for frontend) |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard > Settings > API | Service role key (server-side only, bypasses RLS) |
| `SUPABASE_DB_URL` | Supabase Dashboard > Settings > Database > Connection string | Direct PostgreSQL connection string, e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard > Settings > API > JWT Settings | JWT secret for verifying access tokens server-side |
| `ADMIN_USER_ID` | Created after first admin signup via Supabase Auth | UUID of the admin user, used in RLS policies |

---

## File Structure (Phase 6)

```
yongkang-as-a-agent/
├── backend/
│   ├── cmd/server/main.go                    # MODIFY — add Supabase routes + DB init
│   ├── internal/
│   │   ├── model/types.go                    # MODIFY — add Post, Feedback, Track models
│   │   ├── repository/
│   │   │   ├── json_repo.go                  # EXISTING — unchanged
│   │   │   └── supabase_repo.go              # CREATE — pgx-based CRUD for posts/feedback/tracks
│   │   ├── service/
│   │   │   ├── portfolio.go                  # EXISTING — unchanged
│   │   │   └── content.go                    # CREATE — business logic for posts/feedback/tracks
│   │   ├── handler/
│   │   │   ├── api.go                        # EXISTING — unchanged
│   │   │   ├── content.go                    # CREATE — HTTP handlers for posts/feedback/tracks
│   │   │   └── auth.go                       # CREATE — HTTP handlers for login/logout/me
│   │   └── middleware/
│   │       └── middleware.go                 # MODIFY — add JWT auth middleware
│   ├── migrations/
│   │   ├── 001_create_posts.sql              # CREATE — posts table + RLS
│   │   ├── 002_create_feedback.sql           # CREATE — feedback table + RLS
│   │   ├── 003_create_tracks.sql             # CREATE — tracks table + RLS
│   │   └── 004_create_storage_buckets.sql    # CREATE — storage bucket policies
│   ├── go.mod                                # MODIFY — add pgx, jwt dependencies
│   └── .env.example                          # CREATE — template for env vars
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts                        # MODIFY — add posts/feedback/tracks/auth API functions
│   │   │   └── supabase.ts                   # CREATE — Supabase client instance
│   │   ├── hooks/
│   │   │   └── useAuth.ts                    # CREATE — auth context + hook for admin state
│   │   ├── types/
│   │   │   └── index.ts                      # MODIFY — add Post, Feedback, Track types
│   │   └── components/
│   │       └── global/
│   │           └── AuthProvider.tsx           # CREATE — React context provider for auth
│   ├── package.json                          # MODIFY — add @supabase/supabase-js
│   └── .env.example                          # CREATE — template for frontend env vars
```

---

## Task 1: Supabase Project Setup (Manual)

**Estimated time:** 5 min

This is a manual step performed in the Supabase dashboard. Document it clearly so the user knows exactly what to do.

- [ ] **Step 1: Create Supabase project**

Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a new project:
- Organization: personal
- Project name: `yongkang-portfolio`
- Database password: generate a strong password and save it
- Region: choose closest to Paris (e.g. `eu-west-1` or `eu-central-1`)

- [ ] **Step 2: Create admin user**

Go to Authentication > Users > Add User:
- Email: your admin email (e.g. `yongkang.zou1999@gmail.com`)
- Password: strong password
- Check "Auto-confirm user"

After creation, copy the user UUID from the users table. This is your `ADMIN_USER_ID`.

- [ ] **Step 3: Collect API credentials**

Go to Settings > API and collect:
- Project URL (`SUPABASE_URL`)
- `anon` public key (`SUPABASE_ANON_KEY`)
- `service_role` secret key (`SUPABASE_SERVICE_KEY`)
- JWT Secret (`SUPABASE_JWT_SECRET`)

Go to Settings > Database and collect:
- Connection string with pooler in Transaction mode (`SUPABASE_DB_URL`). Use the URI format. Replace `[YOUR-PASSWORD]` with the database password from Step 1.

- [ ] **Step 4: Create backend .env file**

Create `backend/.env` (do NOT commit this file):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres.your-ref:your-password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_JWT_SECRET=your-jwt-secret
ADMIN_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PORT=8080
DATA_DIR=./data
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 5: Create frontend .env file**

Create `frontend/.env.local` (do NOT commit this file):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 6: Create .env.example files**

Create `backend/.env.example` and `frontend/.env.example` with placeholder values (these ARE committed to show other developers what env vars are expected).

---

## Task 2: SQL Migrations — Database Tables

**Estimated time:** 5 min

Create SQL migration files in `backend/migrations/`. These will be run manually in the Supabase SQL Editor (Dashboard > SQL Editor) or via the Supabase CLI.

- [ ] **Step 1: Create posts migration**

Create `backend/migrations/001_create_posts.sql`:

```sql
-- Posts table for blog entries (MEMORY.md)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false
);

-- Index for listing published posts sorted by date
CREATE INDEX idx_posts_published ON posts (is_published, published_at DESC);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published posts"
  ON posts FOR SELECT
  USING (is_published = true);

-- Admin can do everything
CREATE POLICY "Admin can manage posts"
  ON posts FOR ALL
  USING (auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid)
  WITH CHECK (auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

Note: Replace `ADMIN_USER_ID_PLACEHOLDER` with the actual `ADMIN_USER_ID` UUID before running.

- [ ] **Step 2: Create feedback migration**

Create `backend/migrations/002_create_feedback.sql`:

```sql
-- Feedback table for visitor notes (MEMORY.md > "LEAVE A NOTE")
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for listing feedback by date
CREATE INDEX idx_feedback_created ON feedback (created_at DESC);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (public guestbook)
CREATE POLICY "Public can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (true);

-- Only admin can read feedback
CREATE POLICY "Admin can read feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid);

-- Admin can delete feedback
CREATE POLICY "Admin can delete feedback"
  ON feedback FOR DELETE
  USING (auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid);
```

- [ ] **Step 3: Create tracks migration**

Create `backend/migrations/003_create_tracks.sql`:

```sql
-- Tracks table for music entries (MUSIC.md)
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  track_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ordered track listing
CREATE INDEX idx_tracks_order ON tracks (track_order ASC, created_at ASC);

-- Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Public can read all tracks
CREATE POLICY "Public can read tracks"
  ON tracks FOR SELECT
  USING (true);

-- Admin can manage tracks
CREATE POLICY "Admin can manage tracks"
  ON tracks FOR ALL
  USING (auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid)
  WITH CHECK (auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid);
```

- [ ] **Step 4: Create storage bucket policies**

Create `backend/migrations/004_create_storage_buckets.sql`:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Music bucket: public read
CREATE POLICY "Public can read music files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music');

-- Music bucket: admin-only upload
CREATE POLICY "Admin can upload music files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'music'
    AND auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid
  );

-- Music bucket: admin-only delete
CREATE POLICY "Admin can delete music files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'music'
    AND auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid
  );

-- Blog images bucket: public read
CREATE POLICY "Public can read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Blog images bucket: admin-only upload
CREATE POLICY "Admin can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images'
    AND auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid
  );

-- Blog images bucket: admin-only delete
CREATE POLICY "Admin can delete blog images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-images'
    AND auth.uid() = 'ADMIN_USER_ID_PLACEHOLDER'::uuid
  );
```

- [ ] **Step 5: Run all migrations**

Open Supabase Dashboard > SQL Editor. Run each migration file in order (001, 002, 003, 004), replacing `ADMIN_USER_ID_PLACEHOLDER` with the actual admin UUID.

Verify in Table Editor that `posts`, `feedback`, and `tracks` tables exist. Verify in Storage that `music` and `blog-images` buckets exist.

- [ ] **Step 6: Commit migrations**

```bash
git add backend/migrations/ backend/.env.example frontend/.env.example
git commit -m "feat(db): SQL migrations for posts, feedback, tracks tables and storage buckets"
```

---

## Task 3: Go Backend — Dependencies + Data Models

**Estimated time:** 3 min

- [ ] **Step 1: Add Go dependencies**

```bash
cd backend
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool
go get github.com/golang-jwt/jwt/v5
go get github.com/joho/godotenv
go mod tidy
```

- [ ] **Step 2: Add Supabase data models to types.go**

Add to `backend/internal/model/types.go`:

```go
// Post represents a blog post entry stored in Supabase.
type Post struct {
    ID            string  `json:"id"`
    Title         string  `json:"title"`
    Body          string  `json:"body"`
    PublishedAt   *string `json:"publishedAt,omitempty"`   // ISO 8601 timestamp or nil
    CreatedAt     string  `json:"createdAt"`
    UpdatedAt     string  `json:"updatedAt"`
    CoverImageURL *string `json:"coverImageUrl,omitempty"`
    IsPublished   bool    `json:"isPublished"`
}

// CreatePostRequest is the request body for creating a blog post.
type CreatePostRequest struct {
    Title         string  `json:"title" validate:"required,min=1,max=200"`
    Body          string  `json:"body" validate:"required"`
    CoverImageURL *string `json:"coverImageUrl,omitempty" validate:"omitempty,url"`
    IsPublished   bool    `json:"isPublished"`
}

// UpdatePostRequest is the request body for updating a blog post.
type UpdatePostRequest struct {
    Title         *string `json:"title,omitempty"`
    Body          *string `json:"body,omitempty"`
    CoverImageURL *string `json:"coverImageUrl,omitempty"`
    IsPublished   *bool   `json:"isPublished,omitempty"`
}

// Feedback represents a visitor feedback entry stored in Supabase.
type Feedback struct {
    ID          string  `json:"id"`
    Name        string  `json:"name"`
    Message     string  `json:"message"`
    LinkedInURL *string `json:"linkedinUrl,omitempty"`
    CreatedAt   string  `json:"createdAt"`
}

// CreateFeedbackRequest is the request body for submitting feedback.
type CreateFeedbackRequest struct {
    Name        string  `json:"name" validate:"required,min=1,max=100"`
    Message     string  `json:"message" validate:"required,min=1,max=2000"`
    LinkedInURL *string `json:"linkedinUrl,omitempty" validate:"omitempty,url"`
}

// Track represents a music track stored in Supabase.
type Track struct {
    ID              string `json:"id"`
    Title           string `json:"title"`
    AudioURL        string `json:"audioUrl"`
    DurationSeconds *int   `json:"durationSeconds,omitempty"`
    TrackOrder      int    `json:"trackOrder"`
    CreatedAt       string `json:"createdAt"`
}

// CreateTrackRequest is the request body for adding a track.
type CreateTrackRequest struct {
    Title           string `json:"title" validate:"required,min=1,max=200"`
    AudioURL        string `json:"audioUrl" validate:"required,url"`
    DurationSeconds *int   `json:"durationSeconds,omitempty" validate:"omitempty,min=1"`
    TrackOrder      int    `json:"trackOrder" validate:"min=0"`
}
```

Also add a shared validator instance in `types.go`:

```go
import "github.com/go-playground/validator/v10"

// Validate is the shared validator instance. Use it in handlers to validate request structs.
var Validate = validator.New()
```

Handlers should call `model.Validate.Struct(req)` after JSON decoding and before calling the service layer. Return 400 with validation errors if it fails:

```go
if err := model.Validate.Struct(req); err != nil {
    writeError(w, http.StatusBadRequest, err.Error())
    return
}

// LoginRequest is the request body for admin login.
type LoginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

// AuthResponse is returned after successful login.
type AuthResponse struct {
    AccessToken  string `json:"accessToken"`
    RefreshToken string `json:"refreshToken"`
    User         AuthUser `json:"user"`
}

// AuthUser represents the authenticated user info.
type AuthUser struct {
    ID    string `json:"id"`
    Email string `json:"email"`
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/go.mod backend/go.sum backend/internal/model/types.go
git commit -m "feat(backend): add pgx, jwt dependencies and Supabase data models"
```

---

## Task 4: Go Backend — Supabase Repository

**Estimated time:** 5 min

- [ ] **Step 1: Create supabase_repo.go**

Create `backend/internal/repository/supabase_repo.go`:

```go
package repository

import (
    "context"
    "fmt"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
)

// SupabaseRepository handles CRUD operations against Supabase PostgreSQL.
type SupabaseRepository struct {
    pool *pgxpool.Pool
}

// NewSupabaseRepository creates a new repository connected to the given database URL.
func NewSupabaseRepository(ctx context.Context, databaseURL string) (*SupabaseRepository, error) {
    pool, err := pgxpool.New(ctx, databaseURL)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    if err := pool.Ping(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return &SupabaseRepository{pool: pool}, nil
}

// Close closes the database connection pool.
func (r *SupabaseRepository) Close() {
    r.pool.Close()
}
```

Then implement the following methods on `SupabaseRepository`:

**Posts:**
- `GetPublishedPosts(ctx) ([]model.Post, error)` — `SELECT * FROM posts WHERE is_published = true ORDER BY published_at DESC`
- `GetPublishedPostByID(ctx, id string) (*model.Post, error)` — `SELECT * FROM posts WHERE id = $1 AND is_published = true` (used by public handler)
- `GetPostByID(ctx, id string) (*model.Post, error)` — `SELECT * FROM posts WHERE id = $1` (used by admin handlers — no published filter, so admins can access drafts)
- `CreatePost(ctx, req model.CreatePostRequest) (*model.Post, error)` — `INSERT INTO posts (...) VALUES (...) RETURNING *`. If `IsPublished` is true, set `published_at = now()`.
- `UpdatePost(ctx, id string, req model.UpdatePostRequest) (*model.Post, error)` — build dynamic `UPDATE` with only non-nil fields. If transitioning `is_published` to true and `published_at` is null, set `published_at = now()`. Use `RETURNING *`.
- `DeletePost(ctx, id string) error` — `DELETE FROM posts WHERE id = $1`

**Feedback:**
- `CreateFeedback(ctx, req model.CreateFeedbackRequest) (*model.Feedback, error)` — `INSERT ... RETURNING *`
- `GetAllFeedback(ctx) ([]model.Feedback, error)` — `SELECT * FROM feedback ORDER BY created_at DESC`

**Tracks:**
- `GetTracks(ctx) ([]model.Track, error)` — `SELECT * FROM tracks ORDER BY track_order ASC, created_at ASC`
- `CreateTrack(ctx, req model.CreateTrackRequest) (*model.Track, error)` — `INSERT ... RETURNING *`
- `DeleteTrack(ctx, id string) error` — `DELETE FROM tracks WHERE id = $1`

All methods should:
- Accept `context.Context` as first parameter
- Use `pgx.Row.Scan` or `pgx.CollectRows` for mapping
- Convert `time.Time` to ISO 8601 strings for JSON serialization in the model
- Return wrapped errors with `fmt.Errorf("...: %w", err)`

- [ ] **Step 2: Commit**

```bash
git add backend/internal/repository/supabase_repo.go
git commit -m "feat(backend): Supabase repository with pgx for posts, feedback, tracks CRUD"
```

---

## Task 5: Go Backend — Content Service Layer

**Estimated time:** 3 min

- [ ] **Step 1: Create content service**

Create `backend/internal/service/content.go`:

```go
package service

import (
    "context"
    "strings"

    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/repository"
)

// ContentService provides business logic for Supabase-backed content.
type ContentService struct {
    repo *repository.SupabaseRepository
}

// NewContentService creates a new ContentService.
func NewContentService(repo *repository.SupabaseRepository) *ContentService {
    return &ContentService{repo: repo}
}
```

Methods to implement (thin wrappers — validation is handled by `go-playground/validator` struct tags in the handler layer before calling these methods):

**Posts:**
- `GetPublishedPosts(ctx) ([]model.Post, error)` — delegates to repo
- `GetPublishedPostByID(ctx, id) (*model.Post, error)` — validates id is non-empty, delegates to `repo.GetPublishedPostByID` (public handler — only returns published posts)
- `GetPostByID(ctx, id) (*model.Post, error)` — validates id is non-empty, delegates to `repo.GetPostByID` (admin handler — returns any post including drafts)
- `CreatePost(ctx, req) (*model.Post, error)` — validates title and body are non-empty (trimmed), delegates to repo
- `UpdatePost(ctx, id, req) (*model.Post, error)` — validates id is non-empty, delegates to repo
- `DeletePost(ctx, id) error` — validates id, delegates to repo

**Feedback:**
- `SubmitFeedback(ctx, req) (*model.Feedback, error)` — validates name and message non-empty (trimmed), optionally validates LinkedIn URL format if provided
- `GetAllFeedback(ctx) ([]model.Feedback, error)` — delegates to repo

**Tracks:**
- `GetTracks(ctx) ([]model.Track, error)` — delegates to repo
- `CreateTrack(ctx, req) (*model.Track, error)` — validates title and audio URL non-empty, delegates to repo
- `DeleteTrack(ctx, id) error` — validates id, delegates to repo

- [ ] **Step 2: Commit**

```bash
git add backend/internal/service/content.go
git commit -m "feat(backend): content service layer for posts, feedback, tracks"
```

---

## Task 6: Go Backend — JWT Auth Middleware

**Estimated time:** 5 min

- [ ] **Step 1: Add auth middleware to middleware.go**

Add to `backend/internal/middleware/middleware.go`:

```go
// contextKey is a custom type for context keys to avoid collisions.
type contextKey string

const UserIDKey contextKey = "userID"

// RequireAuth returns middleware that validates a Supabase JWT access token
// from the Authorization header and injects the user ID into the request context.
func RequireAuth(jwtSecret string, adminUserID string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract token from "Bearer <token>" header
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
                http.Error(w, `{"error":"missing or invalid authorization header"}`, http.StatusUnauthorized)
                return
            }
            tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

            // Parse and validate JWT using the Supabase JWT secret
            token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
                if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                    return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
                }
                return []byte(jwtSecret), nil
            })

            if err != nil || !token.Valid {
                http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
                return
            }

            // Extract the "sub" claim (user UUID)
            claims, ok := token.Claims.(jwt.MapClaims)
            if !ok {
                http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
                return
            }

            sub, ok := claims["sub"].(string)
            if !ok || sub == "" {
                http.Error(w, `{"error":"missing user ID in token"}`, http.StatusUnauthorized)
                return
            }

            // Verify this is the admin user
            if sub != adminUserID {
                http.Error(w, `{"error":"forbidden: admin access required"}`, http.StatusForbidden)
                return
            }

            // Inject user ID into context
            ctx := context.WithValue(r.Context(), UserIDKey, sub)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// GetUserID extracts the authenticated user ID from the request context.
func GetUserID(ctx context.Context) string {
    if v, ok := ctx.Value(UserIDKey).(string); ok {
        return v
    }
    return ""
}
```

Add necessary imports: `context`, `fmt`, `strings`, `github.com/golang-jwt/jwt/v5`.

- [ ] **Step 2: Commit**

```bash
git add backend/internal/middleware/middleware.go
git commit -m "feat(backend): JWT auth middleware for Supabase token validation"
```

---

## Task 7: Go Backend — Auth Handlers

**Estimated time:** 4 min

- [ ] **Step 1: Create auth handler**

Create `backend/internal/handler/auth.go`:

```go
package handler

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
)

// AuthHandler handles authentication endpoints by proxying to Supabase Auth.
type AuthHandler struct {
    supabaseURL  string
    supabaseKey  string // anon key
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(supabaseURL, supabaseKey string) *AuthHandler {
    return &AuthHandler{
        supabaseURL: supabaseURL,
        supabaseKey: supabaseKey,
    }
}
```

Methods:

- `HandleLogin(w, r)` — `POST /api/auth/login`
  - Decode `model.LoginRequest` from body
  - Validate email and password non-empty
  - Forward to Supabase: `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with body `{"email": ..., "password": ...}` and headers `apikey: {SUPABASE_ANON_KEY}`, `Content-Type: application/json`
  - On success (200): extract `access_token`, `refresh_token`, `user.id`, `user.email` from Supabase response, return as `model.AuthResponse`
  - On failure: forward the Supabase error status and message

- `HandleLogout(w, r)` — `POST /api/auth/logout`
  - Extract the access token from the `Authorization` header
  - Forward to Supabase: `POST {SUPABASE_URL}/auth/v1/logout` with headers `apikey: {SUPABASE_ANON_KEY}`, `Authorization: Bearer {token}`
  - Return `{"status": "ok"}` on success

- `HandleMe(w, r)` — `GET /api/auth/me`
  - Extract the access token from the `Authorization` header
  - Forward to Supabase: `GET {SUPABASE_URL}/auth/v1/user` with headers `apikey: {SUPABASE_ANON_KEY}`, `Authorization: Bearer {token}`
  - On success: return `model.AuthUser` with id and email
  - On failure (401): return `{"error": "not authenticated"}`

All proxy methods should use `http.Client` with a 10-second timeout. Do NOT use the service role key for auth operations; use the anon key.

- [ ] **Step 2: Commit**

```bash
git add backend/internal/handler/auth.go
git commit -m "feat(backend): auth handlers proxying to Supabase Auth for login/logout/me"
```

---

## Task 8: Go Backend — Content Handlers

**Estimated time:** 5 min

- [ ] **Step 1: Create content handlers**

Create `backend/internal/handler/content.go`:

```go
package handler

import (
    "encoding/json"
    "net/http"
    "strings"

    "github.com/go-chi/chi/v5"
    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
    "github.com/inin-zou/yongkang-as-a-agent/backend/internal/service"
)

// ContentHandler handles Supabase-backed content endpoints.
type ContentHandler struct {
    svc *service.ContentService
}

// NewContentHandler creates a new ContentHandler.
func NewContentHandler(svc *service.ContentService) *ContentHandler {
    return &ContentHandler{svc: svc}
}
```

Methods:

**Posts (public read, admin write):**
- `HandleGetPosts(w, r)` — `GET /api/posts` — calls `svc.GetPublishedPosts(ctx)`, returns JSON array
- `HandleGetPost(w, r)` — `GET /api/posts/{id}` — reads `id` from URL param, calls `svc.GetPublishedPostByID(ctx, id)`, returns 404 if not found (public — only returns published posts)
- `HandleCreatePost(w, r)` — `POST /api/posts` — decodes `model.CreatePostRequest`, calls `svc.CreatePost(ctx, req)`, returns 201
- `HandleUpdatePost(w, r)` — `PUT /api/posts/{id}` — decodes `model.UpdatePostRequest`, calls `svc.GetPostByID(ctx, id)` to verify existence (admin — can access drafts), then `svc.UpdatePost(ctx, id, req)`, returns 200
- `HandleDeletePost(w, r)` — `DELETE /api/posts/{id}` — calls `svc.GetPostByID(ctx, id)` to verify existence (admin — can access drafts), then `svc.DeletePost(ctx, id)`, returns 204

**Feedback (public insert, admin read):**
- `HandleSubmitFeedback(w, r)` — `POST /api/feedback` — decodes `model.CreateFeedbackRequest`, validates, calls `svc.SubmitFeedback(ctx, req)`, returns 201
- `HandleGetFeedback(w, r)` — `GET /api/feedback` — calls `svc.GetAllFeedback(ctx)`, returns JSON array

**Tracks (public read, admin write):**
- `HandleGetTracks(w, r)` — `GET /api/music/tracks` — calls `svc.GetTracks(ctx)`, returns JSON array
- `HandleCreateTrack(w, r)` — `POST /api/music/tracks` — decodes `model.CreateTrackRequest`, calls `svc.CreateTrack(ctx, req)`, returns 201
- `HandleDeleteTrack(w, r)` — `DELETE /api/music/tracks/{id}` — calls `svc.DeleteTrack(ctx, id)`, returns 204

Reuse the existing `writeJSON` and `writeError` helpers from `api.go`. Either move them to a shared file or import them (they are in the same package so they are already accessible).

- [ ] **Step 2: Commit**

```bash
git add backend/internal/handler/content.go
git commit -m "feat(backend): content handlers for posts, feedback, tracks CRUD endpoints"
```

---

## Task 9: Go Backend — Wire Everything in main.go

**Estimated time:** 5 min

- [ ] **Step 1: Update main.go**

Modify `backend/cmd/server/main.go` to:

1. Load `.env` file using `godotenv.Load()` (ignore error if file doesn't exist — production uses real env vars)
2. Read new env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWT_SECRET`, `ADMIN_USER_ID`
3. Initialize `SupabaseRepository` with `SUPABASE_DB_URL` (if the env var is set; if not, skip Supabase routes and log a warning — this keeps backward compatibility for running without Supabase)
4. Create `ContentService` and `ContentHandler`
5. Create `AuthHandler`
6. Update CORS middleware to also allow `PUT`, `DELETE` methods
7. Add new routes:

```go
r.Route("/api", func(r chi.Router) {
    // Existing static data routes (unchanged)
    r.Get("/projects", h.HandleGetProjects)
    r.Get("/projects/{slug}", h.HandleGetProjectBySlug)
    r.Get("/hackathons", h.HandleGetHackathons)
    r.Get("/experience", h.HandleGetExperience)
    r.Get("/skills", h.HandleGetSkills)
    r.Get("/music", h.HandleGetMusic)
    // NOTE: /api/music is kept as a flat route here for backward compatibility.
    // Phase 8 will refactor this into a subroute group: /api/music/artist + /api/music/tracks
    // When implementing Phase 8, remove these flat routes and replace with r.Route("/music", ...)
    r.With(middleware.RateLimit(3, time.Hour)).Post("/contact", h.HandleContact)
    r.Get("/health", h.HandleHealth)

    // Auth routes
    r.Post("/auth/login", authH.HandleLogin)
    r.Post("/auth/logout", authH.HandleLogout)
    r.Get("/auth/me", authH.HandleMe)

    // Public content routes
    r.Get("/posts", contentH.HandleGetPosts)
    r.Get("/posts/{id}", contentH.HandleGetPost)
    r.Get("/music/tracks", contentH.HandleGetTracks)  // flat route — Phase 8 moves this into r.Route("/music", ...)

    // Public feedback submission (rate limited)
    r.With(middleware.RateLimit(5, time.Hour)).Post("/feedback", contentH.HandleSubmitFeedback)

    // Admin-only content routes
    r.Group(func(r chi.Router) {
        r.Use(middleware.RequireAuth(jwtSecret, adminUserID))

        r.Post("/posts", contentH.HandleCreatePost)
        r.Put("/posts/{id}", contentH.HandleUpdatePost)
        r.Delete("/posts/{id}", contentH.HandleDeletePost)

        r.Get("/feedback", contentH.HandleGetFeedback)

        r.Post("/music/tracks", contentH.HandleCreateTrack)          // flat route — Phase 8 moves into r.Route("/music", ...)
        r.Delete("/music/tracks/{id}", contentH.HandleDeleteTrack)  // flat route — Phase 8 moves into r.Route("/music", ...)
    })
})
```

8. Add `defer supabaseRepo.Close()` before server start

- [ ] **Step 2: Update CORS middleware**

In `middleware.go`, update the `Access-Control-Allow-Methods` header to include `PUT` and `DELETE`:

```go
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
```

- [ ] **Step 3: Test backend manually**

```bash
cd backend && go run cmd/server/main.go

# Health check
curl -s http://localhost:8080/api/health

# Existing endpoints still work
curl -s http://localhost:8080/api/projects | head -5

# Existing music endpoint still works (backward-compatible flat route)
curl -s http://localhost:8080/api/music

# New public endpoints (should return empty arrays initially)
curl -s http://localhost:8080/api/posts
curl -s http://localhost:8080/api/music/tracks

# Auth login
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin-email","password":"your-admin-password"}'

# Use the returned accessToken for admin endpoints
curl -s -X POST http://localhost:8080/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"title":"First Post","body":"Hello world","isPublished":true}'

# Verify the post appears in public listing
curl -s http://localhost:8080/api/posts
```

- [ ] **Step 4: Commit**

```bash
git add backend/cmd/server/main.go backend/internal/middleware/middleware.go
git commit -m "feat(backend): wire Supabase routes — auth, posts, feedback, tracks endpoints"
```

---

## Task 10: Frontend — Supabase Client + Auth

**Estimated time:** 5 min

- [ ] **Step 1: Install @supabase/supabase-js**

```bash
cd frontend && npm install @supabase/supabase-js
```

- [ ] **Step 2: Create Supabase client**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Create AuthProvider and useAuth hook**

Create `frontend/src/components/global/AuthProvider.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const user = session?.user ?? null;
  const isAdmin = !!user; // For now, any authenticated user is admin (single-user system)

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Create useAuth hook re-export**

Create `frontend/src/hooks/useAuth.ts`:

```typescript
export { useAuth } from '../components/global/AuthProvider';
```

This re-export keeps imports clean for components that need auth state.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json \
  frontend/src/lib/supabase.ts \
  frontend/src/components/global/AuthProvider.tsx \
  frontend/src/hooks/useAuth.ts
git commit -m "feat(frontend): Supabase client, AuthProvider, and useAuth hook"
```

---

## Task 11: Frontend — Update Types + API Client

**Estimated time:** 4 min

- [ ] **Step 1: Add new types**

Add to `frontend/src/types/index.ts`:

```typescript
export interface Post {
  id: string;
  title: string;
  body: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  coverImageUrl?: string;
  isPublished: boolean;
}

export interface CreatePostRequest {
  title: string;
  body: string;
  coverImageUrl?: string;
  isPublished: boolean;
}

export interface UpdatePostRequest {
  title?: string;
  body?: string;
  coverImageUrl?: string;
  isPublished?: boolean;
}

export interface Feedback {
  id: string;
  name: string;
  message: string;
  linkedinUrl?: string;
  createdAt: string;
}

export interface CreateFeedbackRequest {
  name: string;
  message: string;
  linkedinUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
  trackOrder: number;
  createdAt: string;
}

export interface CreateTrackRequest {
  title: string;
  audioUrl: string;
  durationSeconds?: number;
  trackOrder: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}
```

- [ ] **Step 2: Add API functions for new endpoints**

Add to `frontend/src/lib/api.ts`:

```typescript
import { supabase } from './supabase';
// ... existing imports ...

// Helper to get current access token for admin requests
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

// Authenticated fetch helper for admin operations
async function fetchAuthJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Posts (public)
export function fetchPosts(): Promise<Post[]> {
  return fetchJSON<Post[]>('/posts');
}

export function fetchPost(id: string): Promise<Post> {
  return fetchJSON<Post>(`/posts/${id}`);
}

// Posts (admin)
export function createPost(data: CreatePostRequest): Promise<Post> {
  return fetchAuthJSON<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePost(id: string, data: UpdatePostRequest): Promise<Post> {
  return fetchAuthJSON<Post>(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deletePost(id: string): Promise<void> {
  return fetchAuthJSON<void>(`/posts/${id}`, { method: 'DELETE' });
}

// Tracks (public)
export function fetchTracks(): Promise<Track[]> {
  return fetchJSON<Track[]>('/music/tracks');
}

// Tracks (admin)
export function createTrack(data: CreateTrackRequest): Promise<Track> {
  return fetchAuthJSON<Track>('/music/tracks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteTrack(id: string): Promise<void> {
  return fetchAuthJSON<void>(`/music/tracks/${id}`, { method: 'DELETE' });
}

// Feedback (public submit — no auth required, but must be POST with JSON body)
export function submitFeedback(data: CreateFeedbackRequest): Promise<Feedback> {
  return fetchJSON<Feedback>('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Feedback (admin read)
export function fetchFeedback(): Promise<Feedback[]> {
  return fetchAuthJSON<Feedback[]>('/feedback');
}
```

Note: `submitFeedback` uses `fetchJSON` (not `fetchAuthJSON`) because feedback submission is public — no auth required. It explicitly sets the `Content-Type: application/json` header and uses `POST` with a JSON body.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): add Post/Feedback/Track types and API client functions"
```

---

## Task 12: Frontend — Wire AuthProvider into App

**Estimated time:** 2 min

- [ ] **Step 1: Wrap App with AuthProvider**

Modify `frontend/src/App.tsx` (or `main.tsx` depending on current structure):

Wrap the top-level component tree with `<AuthProvider>`:

```typescript
import { AuthProvider } from './components/global/AuthProvider';

// Inside the component tree, wrap everything:
<AuthProvider>
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
</AuthProvider>
```

The `AuthProvider` must be outside `QueryClientProvider` so auth state is available to all query functions.

- [ ] **Step 2: Verify the frontend builds**

```bash
cd frontend && npm run build
```

Should compile with zero errors. The auth state is initialized but not yet used by any page — Phases 7 and 8 will consume it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): wrap app with AuthProvider for admin auth state"
```

---

## Verification Checklist (Phase 6 Complete When...)

- [ ] Supabase project exists with `posts`, `feedback`, `tracks` tables in the Table Editor
- [ ] RLS policies are enabled: `SELECT` on posts returns only `is_published = true` rows for anonymous requests
- [ ] Storage buckets `music` and `blog-images` exist and are publicly readable
- [ ] `backend/.env` has all 6 required env vars and the server starts without errors
- [ ] `curl localhost:8080/api/health` returns `{"status":"ok"}` (existing routes unbroken)
- [ ] `curl localhost:8080/api/projects` still returns project data (backward compatible)
- [ ] `curl localhost:8080/api/posts` returns `[]` (empty array, no error)
- [ ] `curl localhost:8080/api/music` returns artist JSON (backward-compatible flat route still works)
- [ ] `curl localhost:8080/api/music/tracks` returns `[]` (flat tracks route works)
- [ ] `POST /api/auth/login` with valid admin credentials returns an access token
- [ ] `GET /api/auth/me` with valid token returns admin user info
- [ ] `POST /api/posts` with valid token creates a post, returns 201
- [ ] `GET /api/posts` returns the created post (after setting `is_published: true`)
- [ ] `POST /api/posts` without token returns 401
- [ ] `POST /api/feedback` without auth creates feedback, returns 201
- [ ] `GET /api/feedback` without auth returns 401
- [ ] `GET /api/feedback` with admin token returns the submitted feedback
- [ ] `POST /api/music/tracks` with admin token creates a track
- [ ] `GET /api/music/tracks` returns the created track (public)
- [ ] `frontend/` builds with `npm run build` — zero TypeScript errors
- [ ] Frontend `AuthProvider` initializes without errors in browser console
- [ ] `.env` and `.env.local` files are NOT committed (in `.gitignore`)
- [ ] `.env.example` files ARE committed with placeholder values
