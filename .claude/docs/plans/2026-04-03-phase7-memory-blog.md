# Phase 7: MEMORY.md — Blog System + Visitor Feedback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MEMORY.md page — a blog system where the admin can create/edit posts (markdown with embedded images), visitors can read posts, and anyone can leave feedback via a "LEAVE A NOTE" form. The sidebar shows blog posts as note-items (date + title + preview) fetched from Supabase, and the right panel renders full post content or the feedback form.

**Architecture:** The MemoryPage shell (created as placeholder in Phase 2) is replaced with a fully functional blog page. Blog posts are fetched from the Go API (`GET /api/posts`) which reads from the Supabase `posts` table. Admin auth (from Phase 6's `useAuth` hook and `AuthProvider`) gates the create/edit UI. Markdown is rendered client-side with `react-markdown` + `remark-gfm`. Image uploads go to Supabase Storage `blog-images` bucket via the Supabase JS client. Visitor feedback submits to `POST /api/feedback` (rate-limited on the backend). The sidebar dynamically populates from API data, replacing the hardcoded placeholder items in `sidebarConfig.ts`.

**Tech Stack:** React 19, TypeScript 5, TanStack Query (data fetching), react-markdown + remark-gfm (markdown rendering), @supabase/supabase-js (image upload), CSS custom properties (existing theme tokens)

**Prerequisites:**
- Phase 2 complete (FileSystemLayout, Sidebar, .md tabs, MemoryPage placeholder)
- Phase 6 complete (Supabase project, `posts` + `feedback` tables, `blog-images` bucket, Go API endpoints for posts/feedback, AuthProvider + useAuth hook, API client functions in `api.ts`)

**Reference docs:**
- `.claude/docs/UX-design.md` — Section 5: MEMORY.md spec (sidebar items, blog format, admin behavior, feedback form)
- `.claude/docs/architecture.md` — Supabase schema (`posts`, `feedback` tables), API endpoints, storage buckets
- `.claude/docs/UI-implement-design.md` — Note App reusable elements (sidebar `.note-item` pattern, tab system), edge shapes, color system
- `.claude/docs/portfolio-design-principles.md` — sharp default edges, rounded for interactive, Apple-style clean design, typography (Space Mono for labels, Inter for body)
- `.claude/docs/plans/2026-04-03-phase2-file-system-shell.md` — Sidebar component, `sidebarConfig.ts` structure, `file-system.css` styles
- `.claude/docs/plans/2026-04-03-phase6-supabase-integration.md` — Auth flow, API client (`fetchPosts`, `createPost`, `updatePost`, `submitFeedback`, `fetchFeedback`), AuthProvider/useAuth, Supabase client

---

## File Structure (Phase 7 changes)

```
frontend/src/
├── components/
│   ├── navigation/
│   │   └── sidebarConfig.ts            # MODIFY — memory tab sidebar now built dynamically (remove hardcoded placeholders)
│   └── memory/                         # CREATE — all blog/feedback components
│       ├── PostList.tsx                 # Blog post sidebar list (fetches posts, renders note-items)
│       ├── PostDetail.tsx              # Full blog post view (markdown rendered)
│       ├── PostEditor.tsx              # Admin: markdown editor + image upload + save
│       ├── FeedbackForm.tsx            # Visitor: name + message + LinkedIn URL form
│       ├── FeedbackList.tsx            # Admin: list of submitted feedback entries
│       └── ImageUpload.tsx             # Reusable image upload to Supabase Storage
├── pages/
│   └── MemoryPage.tsx                  # REWRITE — orchestrates blog layout with sidebar + panel
├── hooks/
│   ├── useAuth.ts                      # EXISTING (Phase 6) — re-exported hook
│   ├── usePosts.ts                     # CREATE — TanStack Query hooks for posts CRUD
│   └── useFeedback.ts                  # CREATE — TanStack Query hooks for feedback
├── styles/
│   ├── file-system.css                 # EXISTING — sidebar/note-item styles
│   └── memory.css                      # CREATE — blog post detail, editor, feedback form styles
├── lib/
│   ├── api.ts                          # EXISTING (Phase 6) — already has fetchPosts, createPost, etc.
│   └── supabase.ts                     # EXISTING (Phase 6) — used for image upload
├── types/
│   └── index.ts                        # EXISTING (Phase 6) — already has Post, Feedback types
└── index.css                           # MODIFY — import memory.css
```

---

## Task 1: Install react-markdown + remark-gfm

**Files:**
- Modify: `frontend/package.json`

**Estimated time:** 2 min

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install react-markdown remark-gfm
```

`react-markdown` renders markdown to React components. `remark-gfm` adds GitHub Flavored Markdown support (tables, strikethrough, autolinks, task lists).

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add react-markdown and remark-gfm for blog post rendering"
```

---

## Task 2: TanStack Query Hooks for Posts + Feedback

**Files:**
- Create: `frontend/src/hooks/usePosts.ts`
- Create: `frontend/src/hooks/useFeedback.ts`

**Estimated time:** 4-5 min

- [ ] **Step 1: Create usePosts hook**

Create `frontend/src/hooks/usePosts.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPosts, fetchPost, createPost, updatePost, deletePost } from '../lib/api'
import type { CreatePostRequest, UpdatePostRequest } from '../types'

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => fetchPost(id!),
    enabled: !!id,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostRequest) => createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostRequest }) => updatePost(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts', variables.id] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
```

- [ ] **Step 2: Create useFeedback hook**

Create `frontend/src/hooks/useFeedback.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submitFeedback, fetchFeedback } from '../lib/api'
import type { CreateFeedbackRequest } from '../types'

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => submitFeedback(data),
  })
}

export function useFeedbackList() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: fetchFeedback,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/usePosts.ts frontend/src/hooks/useFeedback.ts
git commit -m "feat(frontend): TanStack Query hooks for posts CRUD and feedback"
```

---

## Task 3: Blog Post Styles

**Files:**
- Create: `frontend/src/styles/memory.css`
- Modify: `frontend/src/index.css`

**Estimated time:** 3-4 min

- [ ] **Step 1: Create memory.css**

Create `frontend/src/styles/memory.css` with styles for the blog post detail view, markdown content, post editor, and feedback form. All styles follow the existing design system (CSS custom properties from `theme.css`).

```css
/* ===== BLOG POST DETAIL ===== */
.post-detail {
  max-width: 720px;
  padding: var(--space-lg) var(--space-xl);
}

.post-detail-date {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
  margin-bottom: var(--space-xs);
}

.post-detail-title {
  font-family: var(--font-sans);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.3;
  margin-bottom: var(--space-md);
}

.post-detail-cover {
  width: 100%;
  border-radius: var(--radius-none);
  margin-bottom: var(--space-lg);
  border: 1px solid var(--color-grid);
}

/* ===== RENDERED MARKDOWN BODY ===== */
.post-body {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--color-ink);
}

.post-body h1,
.post-body h2,
.post-body h3 {
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--color-ink);
  margin-top: var(--space-lg);
  margin-bottom: var(--space-sm);
  line-height: 1.3;
}

.post-body h1 { font-size: 1.5rem; }
.post-body h2 { font-size: 1.25rem; }
.post-body h3 { font-size: 1.1rem; }

.post-body p {
  margin-bottom: var(--space-sm);
}

.post-body a {
  color: var(--color-prism-teal);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.post-body a:hover {
  color: var(--color-prism-mint);
}

.post-body img {
  max-width: 100%;
  border-radius: var(--radius-none);
  border: 1px solid var(--color-grid);
  margin: var(--space-md) 0;
}

.post-body code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-surface-1);
  padding: 2px 6px;
  border-radius: var(--radius-subtle);
}

.post-body pre {
  background: var(--color-surface-0);
  border: 1px solid var(--color-grid);
  padding: var(--space-sm);
  overflow-x: auto;
  margin: var(--space-md) 0;
  border-radius: var(--radius-none);
}

.post-body pre code {
  background: none;
  padding: 0;
}

.post-body blockquote {
  border-left: 3px solid var(--color-prism-lavender);
  padding-left: var(--space-sm);
  margin: var(--space-md) 0;
  color: var(--color-ink-muted);
  font-style: italic;
}

.post-body ul,
.post-body ol {
  padding-left: var(--space-md);
  margin-bottom: var(--space-sm);
}

.post-body li {
  margin-bottom: 4px;
}

.post-body hr {
  border: none;
  border-top: 1px solid var(--color-grid);
  margin: var(--space-lg) 0;
}

.post-body table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-md) 0;
  font-size: 0.85rem;
}

.post-body th,
.post-body td {
  border: 1px solid var(--color-grid);
  padding: var(--space-xs) var(--space-sm);
  text-align: left;
}

.post-body th {
  background: var(--color-surface-0);
  font-weight: 600;
}

/* ===== POST EDITOR (admin) ===== */
.post-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  max-width: 720px;
}

.post-editor-title-input {
  font-family: var(--font-sans);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-ink);
  background: var(--color-surface-0);
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  width: 100%;
  outline: none;
  transition: border-color 0.15s ease;
}

.post-editor-title-input:focus {
  border-color: var(--color-prism-teal);
}

.post-editor-body-textarea {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-ink);
  background: var(--color-surface-0);
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  width: 100%;
  min-height: 400px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s ease;
}

.post-editor-body-textarea:focus {
  border-color: var(--color-prism-teal);
}

.post-editor-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.post-editor-publish-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ===== BUTTONS (reusable within memory page) ===== */
.memory-btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-md);
  background: var(--color-surface-0);
  color: var(--color-ink);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.memory-btn:hover {
  background: var(--color-surface-1);
  border-color: var(--color-ink-muted);
}

.memory-btn-primary {
  background: var(--color-prism-teal);
  color: var(--color-void);
  border-color: var(--color-prism-teal);
}

.memory-btn-primary:hover {
  background: var(--color-prism-mint);
  border-color: var(--color-prism-mint);
}

.memory-btn-danger {
  color: var(--color-prism-coral);
  border-color: var(--color-prism-coral);
}

.memory-btn-danger:hover {
  background: var(--color-prism-coral);
  color: var(--color-void);
}

/* ===== FEEDBACK FORM ===== */
.feedback-form {
  max-width: 480px;
  padding: var(--space-lg) var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.feedback-form-heading {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
  margin-bottom: var(--space-xs);
}

.feedback-form-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-ink-muted);
  margin-bottom: 4px;
}

.feedback-form-input,
.feedback-form-textarea {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--color-ink);
  background: var(--color-surface-0);
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  width: 100%;
  outline: none;
  transition: border-color 0.15s ease;
}

.feedback-form-input:focus,
.feedback-form-textarea:focus {
  border-color: var(--color-prism-teal);
}

.feedback-form-textarea {
  min-height: 120px;
  resize: vertical;
}

.feedback-form-optional {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.feedback-success {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-win);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-md);
}

.feedback-error {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-prism-coral);
}

/* ===== FEEDBACK LIST (admin) ===== */
.feedback-list {
  padding: var(--space-lg) var(--space-xl);
  max-width: 720px;
}

.feedback-list-heading {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
  margin-bottom: var(--space-md);
}

.feedback-entry {
  padding: var(--space-sm);
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-sm);
  background: var(--color-surface-0);
}

.feedback-entry-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.feedback-entry-name {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-ink);
}

.feedback-entry-date {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-ink-faint);
}

.feedback-entry-linkedin {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-prism-teal);
  text-decoration: underline;
}

.feedback-entry-message {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--color-ink-muted);
  line-height: 1.5;
}

/* ===== IMAGE UPLOAD ===== */
.image-upload {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.image-upload-preview {
  width: 60px;
  height: 60px;
  border: 1px solid var(--color-grid);
  border-radius: var(--radius-none);
  object-fit: cover;
}

.image-upload-status {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-faint);
}

/* ===== NEW ENTRY BUTTON (admin sidebar trigger) ===== */
.new-entry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-bottom: 1px solid var(--color-grid);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-prism-teal);
  cursor: pointer;
  transition: background 0.15s ease;
}

.new-entry-btn:hover {
  background: var(--color-surface-0);
}

/* ===== EMPTY STATE ===== */
.memory-empty {
  padding: var(--space-xl);
  text-align: center;
}

.memory-empty-text {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 2: Import memory.css in index.css**

Add to `frontend/src/index.css` after the existing `file-system.css` import:

```css
@import "./styles/memory.css";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/memory.css frontend/src/index.css
git commit -m "feat(frontend): blog and feedback styles for MEMORY.md page"
```

---

## Task 4: Image Upload Component

**Files:**
- Create: `frontend/src/components/memory/ImageUpload.tsx`

**Estimated time:** 3-4 min

- [ ] **Step 1: Create ImageUpload component**

Create `frontend/src/components/memory/ImageUpload.tsx`. This component handles uploading an image file to the Supabase Storage `blog-images` bucket and returns the public URL.

```typescript
import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface ImageUploadProps {
  /** Called with the public URL after a successful upload */
  onUpload: (url: string) => void
}

export default function ImageUpload({ onUpload }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setError(null)
    setUploading(true)

    // Generate unique filename: timestamp-originalname
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${timestamp}-${sanitizedName}`

    try {
      const { data, error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(data.path)

      const publicUrl = urlData.publicUrl
      setPreview(publicUrl)
      onUpload(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="image-upload">
      <button
        type="button"
        className="memory-btn"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {preview && (
        <img src={preview} alt="Uploaded preview" className="image-upload-preview" />
      )}
      {uploading && <span className="image-upload-status">Uploading...</span>}
      {error && <span className="feedback-error">{error}</span>}
    </div>
  )
}
```

Key design decisions:
- Uses Supabase JS client directly for storage upload (bypasses Go backend — storage uploads are better handled client-side with the Supabase SDK)
- Generates unique filenames with timestamp prefix to avoid collisions
- Validates file type and size client-side before uploading
- Returns the public URL via `onUpload` callback so the editor can insert it into the markdown body

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/memory/ImageUpload.tsx
git commit -m "feat(frontend): ImageUpload component for blog post images via Supabase Storage"
```

---

## Task 5: Blog Post Detail Component (Read View)

**Files:**
- Create: `frontend/src/components/memory/PostDetail.tsx`

**Estimated time:** 3-4 min

- [ ] **Step 1: Create PostDetail component**

Create `frontend/src/components/memory/PostDetail.tsx`. This component renders a single blog post with markdown content.

```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { usePost } from '../../hooks/usePosts'
import { useAuth } from '../../hooks/useAuth'

interface PostDetailProps {
  postId: string
  onEdit?: () => void
}

export default function PostDetail({ postId, onEdit }: PostDetailProps) {
  const { data: post, isLoading, error } = usePost(postId)
  const { isAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="post-detail">
        <div className="memory-empty">
          <span className="memory-empty-text">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="post-detail">
        <div className="memory-empty">
          <span className="memory-empty-text">Post not found</span>
        </div>
      </div>
    )
  }

  // Format the published date for display
  const displayDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Draft'

  return (
    <article className="post-detail">
      <div className="post-detail-date">{displayDate}</div>
      <h1 className="post-detail-title">{post.title}</h1>

      {isAdmin && onEdit && (
        <button className="memory-btn" onClick={onEdit} style={{ marginBottom: 'var(--space-md)' }}>
          Edit Post
        </button>
      )}

      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={`Cover for ${post.title}`}
          className="post-detail-cover"
        />
      )}

      <div className="post-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.body}
        </ReactMarkdown>
      </div>
    </article>
  )
}
```

Key design decisions:
- Uses `react-markdown` with `remark-gfm` for GFM support (tables, strikethrough, task lists)
- Date formatted with `toLocaleDateString` for clean display (e.g., "March 15, 2026")
- Cover image rendered above the body if present
- Admin sees an "Edit Post" button that triggers the `onEdit` callback
- Loading and error states use the same `memory-empty` pattern

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/memory/PostDetail.tsx
git commit -m "feat(frontend): PostDetail component with markdown rendering for blog posts"
```

---

## Task 6: Blog Post Editor Component (Admin)

**Files:**
- Create: `frontend/src/components/memory/PostEditor.tsx`

**Estimated time:** 4-5 min

- [ ] **Step 1: Create PostEditor component**

Create `frontend/src/components/memory/PostEditor.tsx`. This is the admin-only markdown editor for creating and editing blog posts.

```typescript
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useCreatePost, useUpdatePost } from '../../hooks/usePosts'
import ImageUpload from './ImageUpload'
import type { Post } from '../../types'

interface PostEditorProps {
  /** If provided, we are editing an existing post. Otherwise, creating new. */
  existingPost?: Post
  /** Called after successful save (create or update) */
  onSaved: (post: Post) => void
  /** Called when user cancels editing */
  onCancel: () => void
}

export default function PostEditor({ existingPost, onSaved, onCancel }: PostEditorProps) {
  const [title, setTitle] = useState(existingPost?.title ?? '')
  const [body, setBody] = useState(existingPost?.body ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(existingPost?.coverImageUrl ?? '')
  const [isPublished, setIsPublished] = useState(existingPost?.isPublished ?? false)
  const [showPreview, setShowPreview] = useState(false)

  const createMutation = useCreatePost()
  const updateMutation = useUpdatePost()

  const isEditing = !!existingPost
  const isSaving = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  // Sync state if existingPost changes (e.g., navigating between posts)
  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title)
      setBody(existingPost.body)
      setCoverImageUrl(existingPost.coverImageUrl ?? '')
      setIsPublished(existingPost.isPublished)
    }
  }, [existingPost])

  async function handleSave() {
    if (!title.trim() || !body.trim()) return

    try {
      if (isEditing && existingPost) {
        const updated = await updateMutation.mutateAsync({
          id: existingPost.id,
          data: {
            title: title.trim(),
            body: body.trim(),
            coverImageUrl: coverImageUrl || undefined,
            isPublished,
          },
        })
        onSaved(updated)
      } else {
        const created = await createMutation.mutateAsync({
          title: title.trim(),
          body: body.trim(),
          coverImageUrl: coverImageUrl || undefined,
          isPublished,
        })
        onSaved(created)
      }
    } catch {
      // Error is captured in mutation state
    }
  }

  function handleImageUploaded(url: string) {
    // Insert markdown image syntax at the end of the body
    const imageMarkdown = `\n![](${url})\n`
    setBody((prev) => prev + imageMarkdown)
  }

  return (
    <div className="post-editor">
      <input
        type="text"
        className="post-editor-title-input"
        placeholder="Post title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Toolbar: image upload, preview toggle, publish toggle */}
      <div className="post-editor-toolbar">
        <ImageUpload onUpload={handleImageUploaded} />

        <button
          type="button"
          className="memory-btn"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>

        <label className="post-editor-publish-toggle">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>

        {coverImageUrl && (
          <span className="image-upload-status">
            Cover image set
          </span>
        )}
      </div>

      {/* Cover image URL input (optional — admin can also paste a URL directly) */}
      <input
        type="text"
        className="post-editor-title-input"
        style={{ fontSize: '0.85rem', fontWeight: 400 }}
        placeholder="Cover image URL (optional, or use upload button)..."
        value={coverImageUrl}
        onChange={(e) => setCoverImageUrl(e.target.value)}
      />

      {/* Body: markdown textarea or preview */}
      {showPreview ? (
        <div className="post-body" style={{ minHeight: '400px', padding: 'var(--space-sm)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {body}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          className="post-editor-body-textarea"
          placeholder="Write your post in markdown..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      )}

      {mutationError && (
        <span className="feedback-error">
          {mutationError instanceof Error ? mutationError.message : 'Save failed'}
        </span>
      )}

      {/* Action buttons */}
      <div className="post-editor-toolbar">
        <button
          type="button"
          className="memory-btn memory-btn-primary"
          onClick={handleSave}
          disabled={isSaving || !title.trim() || !body.trim()}
        >
          {isSaving ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
        </button>
        <button type="button" className="memory-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
```

Key design decisions:
- Dual-mode: preview toggle switches between markdown textarea and rendered preview
- Image upload inserts `![](url)` markdown syntax at the end of the body (user can move it)
- Cover image can be set via the upload button or by pasting a URL directly
- Publish toggle: posts can be saved as drafts (unpublished) or published immediately
- Cancel button returns to the previous view without saving
- Validation: save button disabled when title or body is empty

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/memory/PostEditor.tsx
git commit -m "feat(frontend): PostEditor component with markdown editing, preview, and image upload"
```

---

## Task 7: Feedback Form Component (Visitor)

**Files:**
- Create: `frontend/src/components/memory/FeedbackForm.tsx`

**Estimated time:** 3-4 min

- [ ] **Step 1: Create FeedbackForm component**

Create `frontend/src/components/memory/FeedbackForm.tsx`. This is the public-facing "LEAVE A NOTE" form.

```typescript
import { useState } from 'react'
import { useSubmitFeedback } from '../../hooks/useFeedback'

export default function FeedbackForm() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useSubmitFeedback()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !message.trim()) return

    try {
      await mutation.mutateAsync({
        name: name.trim(),
        message: message.trim(),
        linkedinUrl: linkedinUrl.trim() || undefined,
      })
      setSubmitted(true)
      // Reset form
      setName('')
      setMessage('')
      setLinkedinUrl('')
    } catch {
      // Error captured in mutation state
    }
  }

  if (submitted) {
    return (
      <div className="feedback-form">
        <div className="feedback-success">
          Note received. Thank you.
        </div>
        <button
          type="button"
          className="memory-btn"
          onClick={() => setSubmitted(false)}
        >
          Leave Another Note
        </button>
      </div>
    )
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <div className="feedback-form-heading">Leave a Note</div>

      <div>
        <label className="feedback-form-label">Name</label>
        <input
          type="text"
          className="feedback-form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="feedback-form-label">Message</label>
        <textarea
          className="feedback-form-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message..."
          required
          maxLength={1000}
        />
      </div>

      <div>
        <label className="feedback-form-label">
          LinkedIn URL <span className="feedback-form-optional">(optional)</span>
        </label>
        <input
          type="url"
          className="feedback-form-input"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      {mutation.error && (
        <span className="feedback-error">
          {mutation.error instanceof Error ? mutation.error.message : 'Something went wrong. Please try again.'}
        </span>
      )}

      <button
        type="submit"
        className="memory-btn memory-btn-primary"
        disabled={mutation.isPending || !name.trim() || !message.trim()}
      >
        {mutation.isPending ? 'Sending...' : 'Send Note'}
      </button>
    </form>
  )
}
```

Key design decisions:
- Form fields: name (required), message (required), LinkedIn URL (optional with `type="url"` for browser validation)
- Client-side validation: required fields checked, max lengths enforced
- Rate limiting is handled server-side (5/hour per IP from Phase 6 `main.go` route config) — no client-side throttle needed
- Success state: shows confirmation message with option to leave another note
- No honeypot field here (that is on CONTACT.md) — feedback is simpler

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/memory/FeedbackForm.tsx
git commit -m "feat(frontend): FeedbackForm component for visitor notes on MEMORY.md"
```

---

## Task 8: Feedback List Component (Admin)

**Files:**
- Create: `frontend/src/components/memory/FeedbackList.tsx`

**Estimated time:** 2-3 min

- [ ] **Step 1: Create FeedbackList component**

Create `frontend/src/components/memory/FeedbackList.tsx`. This is the admin-only view of submitted feedback.

```typescript
import { useFeedbackList } from '../../hooks/useFeedback'

export default function FeedbackList() {
  const { data: feedbackEntries, isLoading, error } = useFeedbackList()

  if (isLoading) {
    return (
      <div className="feedback-list">
        <div className="memory-empty">
          <span className="memory-empty-text">Loading feedback...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="feedback-list">
        <span className="feedback-error">Failed to load feedback</span>
      </div>
    )
  }

  if (!feedbackEntries || feedbackEntries.length === 0) {
    return (
      <div className="feedback-list">
        <div className="feedback-list-heading">Visitor Notes</div>
        <div className="memory-empty">
          <span className="memory-empty-text">No feedback yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="feedback-list">
      <div className="feedback-list-heading">
        Visitor Notes ({feedbackEntries.length})
      </div>
      {feedbackEntries.map((entry) => (
        <div key={entry.id} className="feedback-entry">
          <div className="feedback-entry-header">
            <span className="feedback-entry-name">{entry.name}</span>
            <span className="feedback-entry-date">
              {new Date(entry.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {entry.linkedinUrl && (
              <a
                href={entry.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="feedback-entry-linkedin"
              >
                LinkedIn
              </a>
            )}
          </div>
          <div className="feedback-entry-message">{entry.message}</div>
        </div>
      ))}
    </div>
  )
}
```

Key design decisions:
- Only fetched when admin is logged in (the query hook calls `GET /api/feedback` which requires auth — if called without auth, the backend returns 401 and TanStack Query will surface the error)
- Each entry shows: name, date, LinkedIn link (if provided), and message
- Sorted by date descending (handled by the backend query: `ORDER BY created_at DESC`)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/memory/FeedbackList.tsx
git commit -m "feat(frontend): FeedbackList component for admin to view visitor notes"
```

---

## Task 9: Post List Sidebar Component

**Files:**
- Create: `frontend/src/components/memory/PostList.tsx`

**Estimated time:** 3-4 min

- [ ] **Step 1: Create PostList component**

Create `frontend/src/components/memory/PostList.tsx`. This replaces the hardcoded sidebar items for the memory tab with dynamically fetched blog posts. It renders inside the sidebar area of the FileSystemLayout.

```typescript
import { NavLink } from 'react-router-dom'
import { usePosts } from '../../hooks/usePosts'
import { useAuth } from '../../hooks/useAuth'

interface PostListProps {
  /** Currently selected post ID (from URL param), used for active state */
  activePostId?: string
  /** Called when admin clicks "+ NEW ENTRY" */
  onNewPost?: () => void
}

export default function PostList({ activePostId, onNewPost }: PostListProps) {
  const { data: posts, isLoading } = usePosts()
  const { isAdmin } = useAuth()

  return (
    <>
      {/* Admin: new entry button at top of sidebar */}
      {isAdmin && (
        <button className="new-entry-btn" onClick={onNewPost}>
          + New Entry
        </button>
      )}

      {/* Blog post items */}
      {isLoading && (
        <div className="note-item">
          <div className="note-item-title" style={{ color: 'var(--color-ink-faint)' }}>
            Loading...
          </div>
        </div>
      )}

      {posts?.map((post) => {
        const displayDate = post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
            })
          : 'Draft'

        // Generate a preview from the body (first 60 chars, strip markdown syntax)
        const preview = post.body
          .replace(/[#*_`~\[\]()>!|-]/g, '')
          .replace(/\n/g, ' ')
          .trim()
          .slice(0, 60)

        return (
          <NavLink
            key={post.id}
            to={`/files/memory/post/${post.id}`}
            className={`note-item ${activePostId === post.id ? 'active' : ''}`}
            data-interactive
          >
            <div className="note-item-date">{displayDate}</div>
            <div className="note-item-title">{post.title}</div>
            <div className="note-item-preview">{preview}...</div>
          </NavLink>
        )
      })}

      {!isLoading && posts && posts.length === 0 && (
        <div className="note-item">
          <div className="note-item-title" style={{ color: 'var(--color-ink-faint)' }}>
            No entries yet
          </div>
        </div>
      )}

      {/* "LEAVE A NOTE" as last sidebar item (always visible) */}
      <NavLink
        to="/files/memory/feedback"
        className={({ isActive }) => `note-item ${isActive ? 'active' : ''}`}
        data-interactive
      >
        <div className="note-item-title">LEAVE A NOTE</div>
        <div className="note-item-preview">Share your thoughts</div>
      </NavLink>

      {/* Admin: view feedback link */}
      {isAdmin && (
        <NavLink
          to="/files/memory/feedback-admin"
          className={({ isActive }) => `note-item ${isActive ? 'active' : ''}`}
          data-interactive
        >
          <div className="note-item-title">VIEW FEEDBACK</div>
          <div className="note-item-preview">Admin: submitted visitor notes</div>
        </NavLink>
      )}
    </>
  )
}
```

Key design decisions:
- Blog posts rendered as `.note-item` elements (same pattern as SKILL.md sidebar items from Phase 2)
- Each post links to `/files/memory/post/:id` (dynamic route)
- Preview text: strip markdown syntax characters from the body, truncate to 60 chars
- Date formatted as "Mar 2026" short format (fits sidebar width)
- "+ NEW ENTRY" button appears at the top only when admin is logged in
- "LEAVE A NOTE" is always the last sidebar item (matches UX-design.md spec)
- "VIEW FEEDBACK" is an admin-only sidebar item below "LEAVE A NOTE"
- Posts are sorted by date descending (handled by the API response)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/memory/PostList.tsx
git commit -m "feat(frontend): PostList sidebar component with dynamic blog posts from API"
```

---

## Task 10: Update Sidebar Config for Dynamic Memory Tab

**Files:**
- Modify: `frontend/src/components/navigation/sidebarConfig.ts`

**Estimated time:** 2 min

The memory tab's sidebar items were hardcoded as placeholder data in Phase 2. Now that we have a dynamic `PostList` component, update the config to mark the memory tab as having a custom/dynamic sidebar.

- [ ] **Step 1: Update sidebarConfig.ts**

Modify the memory tab entry in `sidebarConfig.ts`:

1. Remove the hardcoded placeholder `sidebarItems` (the three items: `post-placeholder-1`, `post-placeholder-2`, `leave-note`)
2. Set `sidebarItems` to an empty array
3. Add a new property `dynamicSidebar: true` to the `TabConfig` interface and set it on the memory tab

This tells the `FileSystemLayout` / `Sidebar` component that the memory tab renders its own custom sidebar content instead of using the static `sidebarItems` list.

Update the `TabConfig` interface:

```typescript
export interface TabConfig {
  id: string
  label: string
  basePath: string
  sidebarItems: SidebarItem[]
  defaultItem: string | null
  /** When true, the tab renders a custom sidebar component instead of the static sidebarItems list */
  dynamicSidebar?: boolean
}
```

Update the memory entry:

```typescript
{
  id: 'memory',
  label: 'MEMORY.md',
  basePath: '/files/memory',
  sidebarItems: [],
  defaultItem: null,
  dynamicSidebar: true,
},
```

- [ ] **Step 2: Update Sidebar component to handle dynamic tabs**

Modify `frontend/src/components/navigation/Sidebar.tsx`:

Add a `children` prop that allows the parent to inject custom sidebar content for dynamic tabs. When the tab has `dynamicSidebar: true` AND children are provided, render the children instead of the static `sidebarItems` list. When the tab has no sidebar items and no children, return null (existing behavior).

```typescript
interface SidebarProps {
  tab: TabConfig
  children?: React.ReactNode
}

export default function Sidebar({ tab, children }: SidebarProps) {
  const location = useLocation()

  // Dynamic sidebar: render children if provided
  if (tab.dynamicSidebar && children) {
    return (
      <aside className="sidebar fs-sidebar">
        <div className="sidebar-header">{tab.label}</div>
        <nav>{children}</nav>
      </aside>
    )
  }

  if (tab.sidebarItems.length === 0) return null

  // ... existing static sidebar rendering unchanged ...
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/navigation/sidebarConfig.ts frontend/src/components/navigation/Sidebar.tsx
git commit -m "refactor(frontend): make memory tab sidebar dynamic, update Sidebar to accept children"
```

---

## Task 11: Rewrite MemoryPage + Add Routes

**Files:**
- Rewrite: `frontend/src/pages/MemoryPage.tsx`
- Modify: `frontend/src/App.tsx` (add nested routes for memory sub-pages)

**Estimated time:** 5 min

This is the orchestrator task — it wires all the components together.

- [ ] **Step 1: Rewrite MemoryPage.tsx**

Replace the Phase 2 placeholder content of `frontend/src/pages/MemoryPage.tsx` with the full blog page implementation:

```typescript
import { useState } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import PostList from '../components/memory/PostList'
import PostDetail from '../components/memory/PostDetail'
import PostEditor from '../components/memory/PostEditor'
import FeedbackForm from '../components/memory/FeedbackForm'
import FeedbackList from '../components/memory/FeedbackList'
import type { Post } from '../types'

/**
 * MemoryPage is the layout component for MEMORY.md.
 *
 * The sidebar is rendered by PostList (dynamic, fetched from API).
 * The right panel shows one of:
 *   - PostDetail (reading a post)
 *   - PostEditor (creating or editing a post, admin only)
 *   - FeedbackForm (visitor "LEAVE A NOTE")
 *   - FeedbackList (admin viewing submitted feedback)
 *   - Empty state (no post selected)
 *
 * Routing:
 *   /files/memory                  → empty state (select a post)
 *   /files/memory/post/:postId     → PostDetail
 *   /files/memory/new              → PostEditor (create)
 *   /files/memory/edit/:postId     → PostEditor (edit)
 *   /files/memory/feedback         → FeedbackForm
 *   /files/memory/feedback-admin   → FeedbackList (admin)
 */
export default function MemoryPage() {
  // This component provides the sidebar content for the FileSystemLayout.
  // The actual right-panel content is rendered by nested routes (see App.tsx).
  // However, since the FileSystemLayout uses <Outlet /> for the right panel,
  // MemoryPage itself acts as a layout that feeds PostList into the sidebar.

  // The sidebar rendering is handled by passing PostList as children to Sidebar
  // inside the FileSystemLayout. See Task 10 for how Sidebar accepts children.

  // For the right panel, we use nested routes rendered via <Outlet />.
  return <Outlet />
}

// --- Sub-page components for nested routes ---

/** Default view when no post is selected */
export function MemoryIndex() {
  return (
    <div className="memory-empty" style={{ padding: 'var(--space-xl)' }}>
      <span className="memory-empty-text">
        Select an entry from the sidebar
      </span>
    </div>
  )
}

/** Post detail view */
export function MemoryPostView() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  if (!postId) return <MemoryIndex />

  return (
    <PostDetail
      postId={postId}
      onEdit={isAdmin ? () => navigate(`/files/memory/edit/${postId}`) : undefined}
    />
  )
}

/** New post editor (admin) */
export function MemoryNewPost() {
  const navigate = useNavigate()

  return (
    <PostEditor
      onSaved={(post: Post) => navigate(`/files/memory/post/${post.id}`)}
      onCancel={() => navigate('/files/memory')}
    />
  )
}

/** Edit post editor (admin) */
export function MemoryEditPost() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  // Fetch the post to prefill the editor
  // usePost is called inside PostEditor via the existingPost prop,
  // but we need to fetch it here first to pass it as a prop
  const { usePost } = require('../hooks/usePosts')
  // Better approach: pass the postId and let PostEditor fetch internally.
  // Actually, refactor: PostDetail already fetches the post. Let's have
  // MemoryEditPost fetch the post and pass it to PostEditor.

  // Corrected approach:
  return <EditPostLoader postId={postId!} onDone={(id) => navigate(`/files/memory/post/${id}`)} onCancel={() => navigate(`/files/memory/post/${postId}`)} />
}

// Helper component to load post data before rendering editor
function EditPostLoader({ postId, onDone, onCancel }: { postId: string; onDone: (id: string) => void; onCancel: () => void }) {
  // Import usePost directly
  const { data: post, isLoading } = require('../hooks/usePosts').usePost(postId)

  if (isLoading) {
    return (
      <div className="memory-empty" style={{ padding: 'var(--space-xl)' }}>
        <span className="memory-empty-text">Loading post...</span>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="memory-empty" style={{ padding: 'var(--space-xl)' }}>
        <span className="memory-empty-text">Post not found</span>
      </div>
    )
  }

  return (
    <PostEditor
      existingPost={post}
      onSaved={(updated: Post) => onDone(updated.id)}
      onCancel={onCancel}
    />
  )
}

/** Feedback form view (public) */
export function MemoryFeedback() {
  return <FeedbackForm />
}

/** Feedback admin view */
export function MemoryFeedbackAdmin() {
  return <FeedbackList />
}
```

**IMPORTANT CORRECTION:** The `require()` calls above are incorrect for a React/TypeScript project. The implementer must use proper ES module imports. The `EditPostLoader` should use the `usePost` hook imported at the top of the file:

```typescript
import { usePost } from '../hooks/usePosts'
```

And `EditPostLoader` should use it as:

```typescript
function EditPostLoader({ postId, onDone, onCancel }: { ... }) {
  const { data: post, isLoading } = usePost(postId)
  // ... rest of component
}
```

The `MemoryEditPost` component should simply render `EditPostLoader` with the URL params:

```typescript
export function MemoryEditPost() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()

  if (!postId) return <MemoryIndex />

  return (
    <EditPostLoader
      postId={postId}
      onDone={(id) => navigate(`/files/memory/post/${id}`)}
      onCancel={() => navigate(`/files/memory/post/${postId}`)}
    />
  )
}
```

- [ ] **Step 2: Update App.tsx with nested routes for memory**

Add nested routes under the `/files/memory` route in `App.tsx`. The memory route currently renders a flat `<MemoryPage />`. Change it to use nested routing:

```typescript
import MemoryPage, {
  MemoryIndex,
  MemoryPostView,
  MemoryNewPost,
  MemoryEditPost,
  MemoryFeedback,
  MemoryFeedbackAdmin,
} from './pages/MemoryPage'

// Inside the route tree:
{
  path: 'memory',
  element: <MemoryPage />,
  children: [
    { index: true, element: <MemoryIndex /> },
    { path: 'post/:postId', element: <MemoryPostView /> },
    { path: 'new', element: <MemoryNewPost /> },
    { path: 'edit/:postId', element: <MemoryEditPost /> },
    { path: 'feedback', element: <MemoryFeedback /> },
    { path: 'feedback-admin', element: <MemoryFeedbackAdmin /> },
  ],
}
```

- [ ] **Step 3: Update FileSystemLayout to pass PostList as sidebar children for memory tab**

Modify `frontend/src/components/global/FileSystemLayout.tsx` (or wherever the layout renders the Sidebar for the active tab):

When the active tab is `'memory'`, pass `<PostList>` as children to the `<Sidebar>` component:

```typescript
import PostList from '../memory/PostList'
import { useNavigate, useParams } from 'react-router-dom'

// Inside FileSystemLayout render:
const navigate = useNavigate()
const { item: activePostId } = useParams() // or however the current sub-item is extracted

// When rendering sidebar for the active tab:
{activeTab.id === 'memory' ? (
  <Sidebar tab={activeTab}>
    <PostList
      activePostId={activePostId}
      onNewPost={() => navigate('/files/memory/new')}
    />
  </Sidebar>
) : (
  <Sidebar tab={activeTab} />
)}
```

The exact integration depends on how `FileSystemLayout` currently renders the `Sidebar`. The principle is: for the memory tab, inject `PostList` as the sidebar's children prop.

- [ ] **Step 4: Verify the page loads**

Run `npm run dev`. Navigate to `/files/memory`. Verify:
- Sidebar shows "MEMORY.md" header
- If no posts exist yet, sidebar shows "No entries yet" and "LEAVE A NOTE"
- Clicking "LEAVE A NOTE" shows the feedback form in the right panel
- The right panel shows "Select an entry from the sidebar" as the default empty state

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MemoryPage.tsx frontend/src/App.tsx \
  frontend/src/components/global/FileSystemLayout.tsx
git commit -m "feat(frontend): wire MemoryPage with nested routes, dynamic sidebar, and all sub-views"
```

---

## Task 12: Admin Route Protection

**Files:**
- Modify: `frontend/src/pages/MemoryPage.tsx`

**Estimated time:** 2-3 min

Admin-only routes (`/files/memory/new`, `/files/memory/edit/:postId`, `/files/memory/feedback-admin`) should redirect non-admin users back to the memory index.

- [ ] **Step 1: Add admin guard to admin sub-pages**

Create a small `AdminGuard` wrapper component (either in `MemoryPage.tsx` or as a shared utility):

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="memory-empty" style={{ padding: 'var(--space-xl)' }}>
        <span className="memory-empty-text">Checking auth...</span>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/files/memory" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Wrap admin routes with AdminGuard**

Update the route definitions in `App.tsx`:

```typescript
{ path: 'new', element: <AdminGuard><MemoryNewPost /></AdminGuard> },
{ path: 'edit/:postId', element: <AdminGuard><MemoryEditPost /></AdminGuard> },
{ path: 'feedback-admin', element: <AdminGuard><MemoryFeedbackAdmin /></AdminGuard> },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MemoryPage.tsx frontend/src/App.tsx
git commit -m "feat(frontend): admin route guard for post editor and feedback admin views"
```

---

## Task 13: End-to-End Testing

**Estimated time:** 5 min

This task is manual verification. Run both backend and frontend, then test the full flow.

- [ ] **Step 1: Start backend and frontend**

```bash
# Terminal 1
cd backend && go run cmd/server/main.go

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Test visitor flow (unauthenticated)**

1. Navigate to `/files/memory`
2. Verify sidebar shows "MEMORY.md" header with "No entries yet" and "LEAVE A NOTE" items
3. Verify no "+ NEW ENTRY" button is visible
4. Click "LEAVE A NOTE" — verify the feedback form renders in the right panel
5. Fill in name and message, submit — verify success confirmation appears
6. Verify no "VIEW FEEDBACK" sidebar item is visible

- [ ] **Step 3: Test admin flow (authenticated)**

1. Log in as admin (use the auth mechanism from Phase 6 — either via a hidden login route, browser console, or a temporary admin login button)
2. Navigate to `/files/memory`
3. Verify "+ NEW ENTRY" button appears at top of sidebar
4. Click "+ NEW ENTRY" — verify the post editor renders in the right panel
5. Enter a title and some markdown content (include `# heading`, `**bold**`, a `![image](url)` reference)
6. Toggle "Published" checkbox ON
7. Click "Create Post" — verify the post appears in the sidebar list
8. Click the new post in the sidebar — verify full rendered markdown appears in the right panel with proper formatting
9. Click "Edit Post" — verify the editor loads with existing content
10. Change the title, click "Update Post" — verify the sidebar and detail view reflect the change
11. Click "LEAVE A NOTE" — submit a feedback entry
12. Click "VIEW FEEDBACK" — verify the admin feedback list shows the submitted entry with name, date, and message

- [ ] **Step 4: Test image upload (admin)**

1. In the post editor, click "Upload Image"
2. Select an image file (< 5MB)
3. Verify the upload completes and `![](url)` is inserted into the markdown body
4. Switch to preview mode — verify the image renders in the markdown preview
5. Save the post — verify the image appears in the published post detail view

- [ ] **Step 5: Test edge cases**

1. Try submitting the feedback form with empty name or message — verify the submit button is disabled
2. Try creating a post with empty title or body — verify the save button is disabled
3. Navigate directly to `/files/memory/new` while not logged in — verify redirect to `/files/memory`
4. Navigate directly to `/files/memory/feedback-admin` while not logged in — verify redirect
5. Navigate to `/files/memory/post/nonexistent-uuid` — verify "Post not found" message

- [ ] **Step 6: Verify build**

```bash
cd frontend && npm run build
```

Ensure zero TypeScript errors and zero build warnings.

---

## Verification Checklist (Phase 7 Complete When...)

**Blog post list (sidebar):**
- [ ] Sidebar dynamically shows posts fetched from `GET /api/posts`, sorted by date descending
- [ ] Each sidebar item shows date (short format), title, and body preview
- [ ] Clicking a sidebar item navigates to `/files/memory/post/:id` and renders the post

**Blog post detail (right panel):**
- [ ] Full post renders with date, title, and markdown body
- [ ] Markdown elements render correctly: headings, bold, links, images, code blocks, blockquotes, tables, lists
- [ ] Cover image renders if present
- [ ] `react-markdown` + `remark-gfm` used (no raw HTML injection)

**Admin: create/edit posts:**
- [ ] "+ NEW ENTRY" button visible only when logged in as admin
- [ ] Post editor has title input, markdown textarea, preview toggle, publish checkbox
- [ ] Image upload to Supabase Storage `blog-images` bucket works, inserts `![](url)` into body
- [ ] Cover image URL can be set (via upload or manual paste)
- [ ] Creating a post calls `POST /api/posts` and the new post appears in the sidebar
- [ ] Editing a post calls `PUT /api/posts/:id` and the updated post is reflected immediately
- [ ] "Edit Post" button visible only when logged in, navigates to editor with pre-filled content

**Visitor feedback:**
- [ ] "LEAVE A NOTE" is always the last standard sidebar item
- [ ] Clicking it shows a form with: name (required), message (required), LinkedIn URL (optional)
- [ ] Submitting calls `POST /api/feedback` and shows success confirmation
- [ ] Rate limiting works server-side (5 submissions per hour per IP)
- [ ] Form has client-side validation (required fields, max lengths, URL format on LinkedIn)

**Admin: view feedback:**
- [ ] "VIEW FEEDBACK" sidebar item visible only when logged in
- [ ] Feedback list shows all entries with name, date, LinkedIn link, and message
- [ ] Feedback fetched from `GET /api/feedback` (requires admin auth)

**Routing:**
- [ ] `/files/memory` shows empty state ("Select an entry")
- [ ] `/files/memory/post/:postId` shows post detail
- [ ] `/files/memory/new` shows editor (admin only, redirects if not logged in)
- [ ] `/files/memory/edit/:postId` shows editor with existing post (admin only)
- [ ] `/files/memory/feedback` shows feedback form
- [ ] `/files/memory/feedback-admin` shows feedback list (admin only)

**Build:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] No console errors in browser during normal usage
