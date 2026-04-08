# Admin CRUD for Skills, Hackathons, Experience

**Date:** 2026-04-06
**Status:** Approved
**Goal:** Add create/update/delete functionality for skills, hackathons, and experience to the admin panel, reusing existing blog post CRUD patterns.

## Backend

### New Admin Routes (under existing `AdminOnly` middleware)

```
POST   /api/admin/skills          — create skill
PUT    /api/admin/skills/{id}     — update skill
DELETE /api/admin/skills/{id}     — delete skill

POST   /api/admin/hackathons      — create hackathon
PUT    /api/admin/hackathons/{id} — update hackathon
DELETE /api/admin/hackathons/{id} — delete hackathon

POST   /api/admin/experience      — create experience
PUT    /api/admin/experience/{id} — update experience
DELETE /api/admin/experience/{id} — delete experience
```

### Request Bodies

**Skills:**
```json
{ "title": "string", "slug": "string", "skills": ["string"], "battleTested": ["string"], "sortOrder": 0 }
```

**Hackathons:**
```json
{ "date": "YYYY.MM", "name": "string", "city": "string?", "country": "string?", "lat": 0.0, "lng": 0.0, "isRemote": false, "projectName": "string", "projectSlug": "string?", "projectUrl": "string?", "result": "string?", "solo": false, "domain": "string" }
```

**Experience:**
```json
{ "role": "string", "company": "string", "location": "string", "startDate": "YYYY-MM", "endDate": "string?", "skillAssembled": "string", "highlights": ["string"], "note": "string?", "sortOrder": 0 }
```

### Repository Methods (supabase_repo.go)

For each entity: `Create{Entity}(...)`, `Update{Entity}(id, ...)`, `Delete{Entity}(id)`.
Follow same pattern as `CreateBlogPost`/`UpdateBlogPost`/`DeleteBlogPost`.

### Service Methods (portfolio.go)

Thin wrappers that check `s.supabase != nil` and delegate. Same pattern as blog post service methods.

### Handler Methods (api.go)

Follow `HandleCreateBlogPost`/`HandleUpdateBlogPost`/`HandleDeleteBlogPost` pattern:
- Parse JSON body
- Validate required fields (trimmed non-empty)
- Call service
- Return 201 (create), 200 (update/delete), 400 (validation), 404 (not found)

## Frontend

### AdminPage.tsx — New Tabs

Add 3 tabs: "SKILLS", "HACKATHONS", "EXPERIENCE" to existing tab bar.
Each tab component follows PostsTab pattern:
- List items with EDIT/DELETE buttons
- "+ NEW" button opens inline editor form
- React Query for data fetching
- `queryClient.invalidateQueries()` after mutations

### Form Fields

**SkillEditor:** title, slug, skills (comma-separated input), battleTested (comma-separated), sortOrder
**HackathonEditor:** date, name, city, country, lat, lng, isRemote (checkbox), projectName, projectSlug, projectUrl, result, solo (checkbox), domain
**ExperienceEditor:** role, company, location, startDate, endDate, skillAssembled, highlights (textarea, one per line), note, sortOrder

### API Client (api.ts)

Add 9 functions following existing pattern:
- `createSkill(token, data)`, `updateSkill(token, id, data)`, `deleteSkill(token, id)`
- `createHackathon(token, data)`, `updateHackathon(token, id, data)`, `deleteHackathon(token, id)`
- `createExperience(token, data)`, `updateExperience(token, id, data)`, `deleteExperience(token, id)`

### CSS

Reuse all existing admin classes. No new styles needed.

## Files Changed

| File | Change |
|------|--------|
| `backend/pkg/repository/supabase_repo.go` | Add 9 CRUD methods |
| `backend/pkg/service/portfolio.go` | Add 9 service methods |
| `backend/pkg/handler/api.go` | Add 9 handler methods + register routes |
| `api/index.go` | Register new admin routes |
| `frontend/src/lib/api.ts` | Add 9 API client functions |
| `frontend/src/pages/AdminPage.tsx` | Add 3 tab components with editor forms |
