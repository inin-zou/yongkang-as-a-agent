# Future Scalability Guide

How to keep this portfolio alive and growing without redesigning anything.

## Adding New Content (The Common Case)

### New Hackathon Entry
1. Open `backend/data/hackathons.json`
2. Add a new entry with date, name, city, coordinates, project, result, domain
3. The map auto-renders the new pin, timeline extends, stats recalculate
4. If there's a project, add it to `projects.json` too and link via `projectSlug`
5. Redeploy

### New Job / Role
1. Open `backend/data/experience.json`
2. Add entry with role, company, dates, `skillAssembled` narrative
3. If previous role had `endDate: "Present"`, update it to the actual end date
4. The trajectory section auto-extends
5. Redeploy

### New Project
1. Open `backend/data/projects.json`
2. Add entry with slug, title, description, tags, category, links
3. Optionally add a thumbnail image to the CDN
4. The projects grid auto-includes it, filters work automatically
5. Redeploy

### Update Skills
1. Open `backend/data/skills.json`
2. Add new skills to existing domains, or add a new domain
3. Update `battleTested` references to include where the skill was used
4. Redeploy

### New Photos
1. Upload photos to CDN (Cloudinary or wherever images are hosted)
2. Add URLs to the photo gallery data
3. The 3D vortex gallery auto-includes them
4. Redeploy

**Key insight: every content update is a JSON edit + redeploy. No code changes needed.**

## Medium-Term Enhancements (3-6 months)

### Blog / Writing Section
**When:** You have technical posts, hackathon retrospectives, or thought pieces to share.

**How to add:**
1. Create `backend/data/posts/` directory with markdown files
2. Add a Go handler that reads + parses markdown (goldmark library)
3. Add API endpoint: `GET /api/posts`, `GET /api/posts/:slug`
4. Frontend: new "Writing" tab in navigation, list view + detail view
5. Reuse `ContentCard` component for post cards
6. The markdown renderer handles formatting — write in .md, renders beautifully

**Effort:** ~1 day

### Admin Panel
**When:** You want to update content without editing JSON files directly.

**How to add:**
1. Add Supabase (or direct PostgreSQL) as the data store
2. Implement the `PGProjectRepository` (the interface is already designed for this)
3. Build a simple `/admin` route (password-protected) with forms for CRUD
4. The frontend doesn't change at all — it reads from the same API

**Effort:** ~2-3 days

### i18n (Multilingual)
**When:** You want the portfolio in French and/or Chinese too.

**How to add:**
1. Add `locale` field to data files or create `projects.fr.json` variants
2. Backend: accept `?lang=fr` query parameter
3. Frontend: language toggle in nav, content swaps via API
4. Static UI strings: use a simple i18n key map

**Effort:** ~2 days for structure, then ongoing translation

### Analytics Dashboard
**When:** You want to know which projects get the most views.

**How to add:**
1. Backend: add a `/api/events` POST endpoint for page views and clicks
2. Store in a lightweight table (SQLite file or Supabase)
3. Optional: `/admin/analytics` page showing view counts, popular projects
4. No third-party analytics scripts needed

**Effort:** ~1 day

## Long-Term Enhancements (6-12 months)

### AI Chatbot ("Ask the Agent")
**When:** You want visitors to ask questions about your experience and get AI-generated answers grounded in your data.

**How to add:**
1. Backend: new `/api/chat` endpoint
2. Load all portfolio data as context (projects, experience, skills)
3. Call Anthropic/OpenAI API with your data as system context + user question
4. Frontend: chat widget (floating or dedicated page)
5. Rate limit to prevent abuse

**Effort:** ~2-3 days

### Music Player Integration
**When:** You release more tracks and want a proper listening experience.

**How to add:**
1. Expand `music.json` with track list, audio URLs, album art
2. Frontend: persistent audio player component (bottom bar)
3. Plays across page navigation (SPA makes this easy)
4. Visualizer using Web Audio API

**Effort:** ~2 days

### Mobile App (React Native)
**When:** You want a native presence.

**How to add:**
1. The Go API already serves everything — React Native app is just another consumer
2. Reuse data models and types
3. The API design (repository pattern, JSON responses) is already mobile-ready

### Custom Domain + Email
**When:** You want `yongkang.dev` or similar.

**How to add:**
1. Buy domain, point DNS to Cloudflare
2. Frontend: update Vercel/CF Pages custom domain
3. Backend: update CORS allowed origins
4. Optional: set up `hello@yongkang.dev` forwarding

## Architecture Principles for Longevity

### 1. Data drives presentation
All content lives in data files/database. Components render from data. Never hardcode content in JSX.

### 2. Interface before implementation
The repository pattern means swapping data sources (JSON → PostgreSQL → Supabase) requires zero changes to handlers, services, or frontend.

### 3. Components are composable
Each UI component does one thing. New pages are assembled from existing components. Adding a blog page reuses `ContentCard`, `TabNavigation`, `GridBackground`.

### 4. Additive changes only
New features = new files + new routes. Existing code rarely needs modification. The grid system, color palette, and component library are the stable foundation.

### 5. Version your data
Keep data files in git. Every content change is a commit. You can always roll back. When you move to a database, keep JSON exports as backups.

## Update Checklist Template

When updating the portfolio:

```markdown
## Update: [What changed]
- [ ] Data file(s) updated
- [ ] New images uploaded to CDN (if any)
- [ ] Local dev tested (`make dev`)
- [ ] Hackathon count / win count still accurate
- [ ] Work experience dates are correct
- [ ] No broken links
- [ ] Mobile responsive check
- [ ] Deploy backend (if API changed)
- [ ] Deploy frontend
- [ ] Verify production site
```
