# Phase 4: SOUL.md + CONTACT.md — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SOUL.md and CONTACT.md pages as full content views inside the Phase 2 file system shell. Both are single-panel pages (no sidebar). SOUL.md is the first file visitors see after entering the file system — a brief, impactful intro. CONTACT.md provides contact info, social links, and a working form that calls the existing `/api/contact` endpoint.

**Depends on:** Phase 2 (File System Shell) must be complete. The Note App layout with `.md` tab navigation, sidebar + editor panel structure, and breadcrumb must exist.

**Architecture notes:**
- Both pages render inside the editor panel of the file system shell
- Neither page uses the sidebar (single-view pages)
- SOUL.md is the default active tab when entering `/files`
- CONTACT.md replaces the existing Phase 1 `/contact` page, migrating it into the file system shell

**Reference docs:**
- `.claude/docs/UX-design.md` — SOUL.md spec (section 3), CONTACT.md spec (section 6)
- `.claude/docs/UI-implement-design.md` — CSS tokens, frosted glass, edge shape system, component specs
- `.claude/docs/portfolio-design-principles.md` — typography, color, edge shapes, anti-patterns
- `.claude/docs/yongkang-profile.md` — all profile data (identity, contact, stats)

**Design constraints:**
- Edge shape system: inputs = `var(--radius-sm)` (6px), submit button = `var(--radius-md)` (8px), static panels/cards = `var(--radius-none)` (0px), non-clickable tags = `var(--radius-subtle)` (2px)
- Typography: Space Mono for labels/data, Inter for narrative text
- Color: achromatic base, prismatic accents only on interaction (hover) or semantic meaning
- No sidebar on either page — the editor panel occupies the full width normally given to sidebar + panel
- Animation: content enters with fade-from-blur (not slide, not bounce)

---

## File Structure (Phase 4)

```
frontend/src/
├── pages/
│   ├── Soul.tsx                    # NEW — SOUL.md page component
│   └── Contact.tsx                 # MODIFY — refactor into file system shell style
├── components/
│   └── contact/
│       ├── ContactForm.tsx         # NEW — extracted contact form component
│       └── SocialLinks.tsx         # NEW — extracted social links component
```

**Routing change (in App.tsx or wherever Phase 2 defines file system routes):**
- `/files` or `/files/soul` → `Soul.tsx` (default tab)
- `/files/contact` → `Contact.tsx`

---

## Task 1: Create SOUL.md Page Component

**Time estimate:** 3-5 min

**Files:**
- Create: `frontend/src/pages/Soul.tsx`

**Content source:** `.claude/docs/yongkang-profile.md` — Identity section, Hackathons summary, Domains Explored

- [ ] **Step 1: Build the Soul component**

Create `frontend/src/pages/Soul.tsx` with the following structure, rendered inside the file system editor panel (no sidebar):

**Layout (top to bottom):**

1. **Name block** — large heading
   - "Yongkang ZOU" in Inter, `font-size: 2rem`, `font-weight: 600`, `color: var(--color-ink)`
   - Below: "AI Engineer / Creative Technologist" in Space Mono, `0.85rem`, `color: var(--color-ink-muted)`, uppercase, `letter-spacing: 0.1em`

2. **Thesis paragraph** — one paragraph, the core pitch
   - Font: Inter, `1rem`, `line-height: 1.8`, `color: var(--color-ink)`
   - Content (draft — adjust wording during implementation):
     > "Creative technologist assembling skills across domains — from enterprise RAG pipelines and multi-agent orchestration to 3D spatial intelligence and music AI. Part engineer, part artist. 24 hackathons, 9 wins, a record of going from zero to demo in under 20 hours. Every role, every hackathon, every domain shift was equipping the agent with a new capability."
   - Max-width: `640px` for comfortable reading line length
   - Margin: `var(--space-lg)` top and bottom

3. **Stats row** — key numbers, displayed in a horizontal grid
   - Container: `display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-md)`
   - Each stat is a small block:
     - Value: Space Mono, `1.5rem`, `font-weight: 700`, `color: var(--color-ink)`
     - Label: Space Mono, `0.7rem`, `color: var(--color-ink-muted)`, uppercase, `letter-spacing: 0.05em`
   - Stats to show:
     - `24` — HACKATHONS
     - `9` — WINS
     - `< 20H` — ZERO TO DEMO
     - `PARIS, FR` — BASE
     - `8+` — DOMAINS EXPLORED
   - Container: `border-radius: var(--radius-none)` (static, informational)
   - Optional: thin `border-top: 1px solid var(--color-grid)` above the stats row for separation

4. **See also links** — navigation to other .md tabs
   - Section header: "SEE ALSO" in Space Mono, `0.75rem`, `color: var(--color-ink-muted)`, uppercase
   - Links displayed as inline items with `>` separator:
     - `SKILL.md` → navigates to `/files/skill`
     - `MEMORY.md` → navigates to `/files/memory`
     - `CONTACT.md` → navigates to `/files/contact`
     - `MUSIC.md` → navigates to `/files/music`
   - Links use React Router `<Link>` (not `<a>`)
   - Link styling: Space Mono, `0.85rem`, `color: var(--color-ink)`, `text-decoration: none`, `border-bottom: 1px solid var(--color-ink-faint)`, on hover: `border-color: var(--color-ink)` and subtle prismatic color bleed via `color: var(--color-prism-teal)`
   - `cursor: none` (custom crosshair cursor is global)
   - Add `data-interactive` attribute for cursor expansion

**Overall page styling:**
- Padding: `var(--space-lg)` on all sides (or follow whatever Phase 2 editor panel padding convention is)
- Max-width: `720px` — content should not stretch across the full editor panel on wide screens
- Entrance animation: entire page content fades in from blur — use `@keyframes fadeInSlow { from { opacity: 0; filter: blur(10px) } to { opacity: 1; filter: blur(0) } }` with `animation: fadeInSlow 0.6s ease forwards`

- [ ] **Step 2: Verify SOUL.md renders**

Manually check:
- Navigate to `/files` (or `/files/soul`) — SOUL.md tab should be active
- Name, thesis, stats, and "see also" links render correctly
- Content fades in from blur on page load
- "See also" links navigate to other file system tabs
- No sidebar visible — editor panel takes full width
- Edge shapes: all elements are sharp corners (0px radius) — nothing on this page is interactive except the "see also" links

---

## Task 2: Extract Contact Form and Social Links Components

**Time estimate:** 3-5 min

**Files:**
- Create: `frontend/src/components/contact/ContactForm.tsx`
- Create: `frontend/src/components/contact/SocialLinks.tsx`

This task extracts reusable components from the existing `Contact.tsx` page (Phase 1), adapting them for the file system shell aesthetic.

- [ ] **Step 1: Create ContactForm component**

Create `frontend/src/components/contact/ContactForm.tsx`:

Extract the form logic from the existing `frontend/src/pages/Contact.tsx`. The component should be self-contained:

**Props:** none (manages its own state)

**State:**
- `formData: { name: string; email: string; message: string; website: string }` (website = honeypot)
- `status: 'idle' | 'sending' | 'success' | 'error'`
- `statusMessage: string`

**Form fields:**
- **Name** input: `type="text"`, required
- **Email** input: `type="email"`, required
- **Message** textarea: required, `rows={5}`, `resize: vertical`
- **Honeypot** input: `name="website"`, `tabIndex={-1}`, `autoComplete="off"`, `style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, overflow: 'hidden' }}` (hidden but accessible to bots — do NOT use `display: none` as sophisticated bots may skip those)

**Input styling (all form fields):**
- `border: 1px solid var(--color-ink-faint)`
- `background: var(--color-surface-0)`
- `color: var(--color-ink)`
- `padding: 12px`
- `border-radius: var(--radius-sm)` (6px — interactive elements)
- `font-family: var(--font-sans)`
- `font-size: 0.9rem`
- `outline: none`
- `width: 100%`
- `box-sizing: border-box`
- `transition: border-color 0.15s ease`
- On focus: `border-color: var(--color-ink)`
- On blur: `border-color: var(--color-ink-faint)`

**Labels:**
- Space Mono, `0.75rem`, uppercase, `letter-spacing: 0.05em`, `color: var(--color-ink-muted)`
- `display: block`, `margin-bottom: 6px`

**Submit button:**
- Text: "SEND" (or "SENDING..." when submitting)
- `padding: 1rem 2.5rem`
- `background: var(--color-ink)`
- `color: var(--color-void)`
- `border: none`
- `border-radius: var(--radius-md)` (8px — primary interactive)
- Space Mono, `0.85rem`, uppercase, `letter-spacing: 0.1em`
- `cursor: none`
- `align-self: flex-start`
- `opacity: 0.6` when disabled/sending, `1` otherwise
- Hover: `opacity: 0.8`
- `data-interactive` attribute for cursor expansion

**On submit:**
- Check honeypot — if `formData.website` is filled, silently return (do nothing)
- Call `submitContact(formData)` from `frontend/src/lib/api.ts`
- On success: set status to `'success'`, clear form fields, show success message
- On error: set status to `'error'`, show error message

**Success state:**
- Green text: `color: var(--color-win)` (#69f0ae)
- Space Mono, `0.8rem`
- Message: "Message sent successfully." (or whatever the API returns)

**Error state:**
- Pink/highlight text: `color: var(--color-highlight)` (#ff6b9d)
- Space Mono, `0.8rem`
- Message: error message from API or "Something went wrong."

- [ ] **Step 2: Create SocialLinks component**

Create `frontend/src/components/contact/SocialLinks.tsx`:

**Props:** none (data is hardcoded — this is personal contact info, not API-driven)

**Contact data:**
- Email: `yongkang.zou1999@gmail.com` (mailto link)
- GitHub: `github.com/inin-zou` (external link)
- LinkedIn: `linkedin.com/in/yongkang-zou` (external link)

**Layout:**
- Section header: "ELSEWHERE" in Space Mono, `0.75rem`, uppercase, `letter-spacing: 0.1em`, `color: var(--color-ink-muted)`
- Links in a grid or flex row with `gap: var(--space-md)`
- Each link shows a label (e.g., "GitHub") with the URL below or beside it

**Link styling:**
- Space Mono, `0.85rem`
- `color: var(--color-ink)`
- `text-decoration: none`
- `border-bottom: 1px solid var(--color-ink-faint)`
- `padding-bottom: 2px`
- Hover: `border-color: var(--color-ink)`
- `cursor: none`
- `data-interactive` attribute
- External links: `target="_blank"`, `rel="noopener noreferrer"`
- Email link: `href="mailto:yongkang.zou1999@gmail.com"`

**Alternative layout (grid-aligned, more structured):**
If the flex row feels too sparse, use a vertical list with label > value pairs:
```
EMAIL     > yongkang.zou1999@gmail.com
GITHUB    > inin-zou
LINKEDIN  > yongkang-zou
```
Using Space Mono, grid columns: `80px 20px 1fr` (label, separator `>`, value). This mirrors the Symmetry Breaking data grid pattern from the UI design doc.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/contact/
git commit -m "feat(contact): extract ContactForm and SocialLinks components"
```

---

## Task 3: Refactor Contact.tsx for File System Shell

**Time estimate:** 3-5 min

**Files:**
- Modify: `frontend/src/pages/Contact.tsx`

- [ ] **Step 1: Rewrite Contact.tsx using extracted components**

Replace the existing `Contact.tsx` with a clean composition of the extracted components. The page renders inside the file system editor panel (no sidebar).

**Structure:**

```tsx
// Contact.tsx — CONTACT.md page
import ContactForm from '../components/contact/ContactForm'
import SocialLinks from '../components/contact/SocialLinks'

export default function Contact() {
  return (
    <div style={{ /* page container */ }}>
      {/* Contact info section */}
      <SocialLinks />

      {/* Divider */}
      <div style={{ /* texture divider */ }} />

      {/* Contact form section */}
      <section>
        <h2>{ /* "LEAVE A MESSAGE" header */ }</h2>
        <ContactForm />
      </section>
    </div>
  )
}
```

**Page container styling:**
- `padding: var(--space-lg)` (or match Phase 2 editor panel convention)
- `max-width: 640px`
- Entrance animation: fade-in from blur, same as SOUL.md (`animation: fadeInSlow 0.6s ease forwards`)

**Section headers:**
- Space Mono, `0.85rem`, uppercase, `letter-spacing: 0.1em`, `color: var(--color-ink-muted)`, `margin-bottom: var(--space-lg)`

**Texture divider between sections:**
- A thin horizontal rule or a repeated-character pattern (e.g., `|` characters) in `var(--color-ink-faint)`, `opacity: 0.2`, `letter-spacing: 1px` — matching the Symmetry Breaking texture divider from the UI design doc
- `margin: var(--space-xl) 0`

**Key differences from the Phase 1 Contact page:**
1. Correct email/GitHub/LinkedIn URLs (Phase 1 used placeholder URLs like `github.com/yongkangc` and `mailto:yongkang@example.com` — replace with real data from profile doc)
2. Better honeypot hiding (position off-screen instead of `display: none`)
3. Entrance animation
4. Texture divider between info and form sections
5. Rendered inside file system shell, not the old Layout

- [ ] **Step 2: Verify Contact.md renders in the file system shell**

Manually check:
- Navigate to `/files/contact` — CONTACT.md tab should be active
- Social links show correct email, GitHub, LinkedIn URLs
- Contact form renders with proper input styling (6px radius inputs, 8px radius button)
- Honeypot field is invisible but present in DOM
- Submit works — sends POST to `/api/contact` and shows success/error state
- Fade-in animation plays on page entry
- No sidebar visible
- Breadcrumb shows `~/agent/CONTACT.md`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Contact.tsx
git commit -m "feat(contact): refactor CONTACT.md page for file system shell"
```

---

## Task 4: Wire Routes + Update Tab Navigation

**Time estimate:** 2-3 min

**Files:**
- Modify: `frontend/src/App.tsx` (or wherever Phase 2 defines file system routes)
- Modify: Tab navigation config (wherever Phase 2 defines the `.md` tabs)

- [ ] **Step 1: Add SOUL.md and CONTACT.md routes**

Update the router configuration (in `App.tsx` or the Phase 2 file system router):

- `/files` → redirects to `/files/soul` (SOUL.md is default)
- `/files/soul` → renders `Soul.tsx` inside the file system layout (no sidebar)
- `/files/contact` → renders `Contact.tsx` inside the file system layout (no sidebar)

Ensure the file system layout detects that SOUL.md and CONTACT.md are "no sidebar" pages and renders the editor panel at full width.

**How to handle "no sidebar" pages:**
- Option A: Pass a prop or route meta flag (e.g., `noSidebar: true`) that the file system layout reads
- Option B: The file system layout checks the current route and maintains a list of sidebar-less tabs
- Option C: Each page renders itself without sidebar awareness — the file system layout always provides the full panel and the sidebar is a per-page concern

Choose whichever pattern Phase 2 established. The important thing is that SOUL.md and CONTACT.md get the full editor panel width — no empty sidebar taking up space.

- [ ] **Step 2: Verify tab navigation includes SOUL.md and CONTACT.md**

The Phase 2 tab navigation should already include all five `.md` tabs (`SOUL.md | SKILL.md | MEMORY.md | CONTACT.md | MUSIC.md`). Verify that:
- Clicking `SOUL.md` navigates to `/files/soul` and renders the Soul component
- Clicking `CONTACT.md` navigates to `/files/contact` and renders the Contact component
- Active tab state highlights correctly
- Breadcrumb updates: `~/agent/SOUL.md` and `~/agent/CONTACT.md`

If Phase 2 only has placeholder tabs (About, Projects, Contact from Phase 1), update the tab config to the full `.md` set:

```typescript
const tabs = [
  { label: 'SOUL.md', to: '/files/soul' },
  { label: 'SKILL.md', to: '/files/skill' },
  { label: 'MEMORY.md', to: '/files/memory' },
  { label: 'CONTACT.md', to: '/files/contact' },
  { label: 'MUSIC.md', to: '/files/music' },
]
```

- [ ] **Step 3: Remove old `/contact` route (if still present)**

If the Phase 1 `/contact` route still exists outside the file system, remove it. All contact functionality now lives at `/files/contact`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/global/TabNavigation.tsx
git commit -m "feat(routes): wire SOUL.md and CONTACT.md into file system shell"
```

---

## Task 5: Fade-In Animation + Polish

**Time estimate:** 2-3 min

**Files:**
- Modify: `frontend/src/styles/theme.css`
- Modify: `frontend/src/pages/Soul.tsx`
- Modify: `frontend/src/pages/Contact.tsx`

- [ ] **Step 1: Add fade-from-blur keyframes to theme.css**

Add to `frontend/src/styles/theme.css`:

```css
/* Content entrance — fade in from blur */
@keyframes fadeInFromBlur {
  from {
    opacity: 0;
    filter: blur(10px);
  }
  to {
    opacity: 1;
    filter: blur(0px);
  }
}

.animate-fade-in {
  animation: fadeInFromBlur 0.6s ease forwards;
}
```

This is the standard entrance animation from the design principles — "Entrance: Content fades in from blur (not slide, not bounce)".

- [ ] **Step 2: Apply animation to both pages**

Ensure both `Soul.tsx` and `Contact.tsx` use the `animate-fade-in` class (or inline the animation style) on their outermost container.

If using inline styles (matching the existing codebase pattern):
```typescript
const pageStyle: React.CSSProperties = {
  animation: 'fadeInFromBlur 0.6s ease forwards',
}
```

If Phase 2 already provides a page-transition mechanism, use that instead and skip this step.

- [ ] **Step 3: Verify `prefers-reduced-motion` is respected**

Add a media query to `theme.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in {
    animation: none;
    opacity: 1;
    filter: none;
  }
}
```

This follows the design doc requirement: "All WebGL effects respect `prefers-reduced-motion`". The same applies to CSS animations.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/theme.css frontend/src/pages/Soul.tsx frontend/src/pages/Contact.tsx
git commit -m "feat(ui): add fade-from-blur entrance animation for content pages"
```

---

## Verification Checklist (Phase 4 Complete When...)

### SOUL.md
- [ ] Navigating to `/files` (or `/files/soul`) shows the SOUL.md page
- [ ] SOUL.md tab is active in the tab navigation
- [ ] Name "Yongkang ZOU" displays prominently with role subtitle
- [ ] Thesis paragraph is readable, max-width constrains line length to ~640-720px
- [ ] Stats row shows: 24 hackathons, 9 wins, < 20h zero-to-demo, Paris FR, 8+ domains
- [ ] "See also" links navigate to the correct file system tabs
- [ ] "See also" links have hover effects (border + subtle color shift)
- [ ] No sidebar is visible — editor panel uses full width
- [ ] Breadcrumb shows `~/agent/SOUL.md`
- [ ] Page content fades in from blur on entry

### CONTACT.md
- [ ] Navigating to `/files/contact` shows the CONTACT.md page
- [ ] CONTACT.md tab is active in the tab navigation
- [ ] Contact info displays correct email: `yongkang.zou1999@gmail.com`
- [ ] Contact info displays correct GitHub: `github.com/inin-zou`
- [ ] Contact info displays correct LinkedIn: `linkedin.com/in/yongkang-zou`
- [ ] Contact form has name, email, message fields
- [ ] Form inputs have `6px` border-radius (`var(--radius-sm)`)
- [ ] Submit button has `8px` border-radius (`var(--radius-md)`)
- [ ] Hidden honeypot field exists in DOM but is invisible (positioned off-screen, NOT `display: none`)
- [ ] Submitting the form calls `POST /api/contact` and shows success state (green text)
- [ ] Submitting with empty fields shows client-side validation
- [ ] Submitting with honeypot filled silently does nothing (bot protection)
- [ ] Error state shows pink/highlight text
- [ ] No sidebar is visible — editor panel uses full width
- [ ] Breadcrumb shows `~/agent/CONTACT.md`
- [ ] Page content fades in from blur on entry

### General
- [ ] Old `/contact` route (Phase 1) is removed or redirects to `/files/contact`
- [ ] Edge shape system is correct throughout: static elements = sharp (0px), inputs = 6px, submit button = 8px
- [ ] Typography is correct: Space Mono for labels/data, Inter for narrative body text
- [ ] All interactive elements have `data-interactive` attribute (for crosshair cursor expansion)
- [ ] `cursor: none` is set on all interactive elements (custom cursor is global)
- [ ] `prefers-reduced-motion` disables fade-in animation
- [ ] No anti-patterns present: no corporate energy, no bouncing/sliding animations, no terminal/hacker cliches
