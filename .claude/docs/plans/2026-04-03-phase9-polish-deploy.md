# Phase 9: Polish + Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Final polish pass — responsive design across all breakpoints, glassmorphism frosted-glass effects on photo-backed content, performance optimization (Three.js cleanup, lazy loading, reduced-motion), deployment to Vercel (frontend) + Fly.io (backend) with custom domain `yongkang.dev`, basic SEO, and a full QA checklist.

**Depends on:** All prior phases (1-8) must be complete. The full file system shell, landing page, all five `.md` pages, Supabase integration, blog system, music player, and hackathon map must exist and work locally.

**Architecture notes:**
- Frontend SPA deployed as static files to Vercel at `yongkang.dev`
- Go backend deployed as Docker container to Fly.io at `api.yongkang.dev`
- Cloudflare manages DNS for both subdomains
- CORS on backend updated from `localhost:5173` to `yongkang.dev`
- Environment variables configured on both platforms (Supabase keys, SendGrid, Mapbox token)

**Reference docs:**
- `.claude/docs/UX-design.md` — responsive strategy, interaction patterns, frosted glass usage
- `.claude/docs/UI-implement-design.md` — frosted glass system, blur levels, glassmorphism CSS, animation principles, performance notes
- `.claude/docs/architecture.md` — deployment architecture (Vercel + Fly.io + Cloudflare), tech stack
- `.claude/docs/portfolio-design-principles.md` — Apple-style clean design, edge shape system, touch targets (44x44px minimum)

**Design constraints:**
- Breakpoints: 768px (tablet), 480px (mobile)
- Touch targets: minimum 44x44px on mobile (Apple HIG standard)
- Edge shape system preserved at all breakpoints — sharp default, round = interactive
- `prefers-reduced-motion`: disable ALL animations (CSS + Three.js + GSAP), show static content
- Lighthouse target: 90+ performance score

---

## File Structure (Phase 9)

```
yongkang-as-a-agent/
├── backend/
│   ├── Dockerfile                          # NEW — multi-stage Go build
│   ├── fly.toml                            # NEW — Fly.io deployment config
│   └── internal/
│       └── middleware/middleware.go         # MODIFY — production CORS origins
├── frontend/
│   ├── public/
│   │   ├── favicon.ico                     # NEW — site favicon
│   │   ├── favicon-16x16.png               # NEW
│   │   ├── favicon-32x32.png               # NEW
│   │   ├── apple-touch-icon.png            # NEW — 180x180
│   │   ├── og-image.png                    # NEW — Open Graph preview image (1200x630)
│   │   ├── robots.txt                      # NEW
│   │   └── sitemap.xml                     # NEW
│   ├── index.html                          # MODIFY — meta tags, favicon links, og tags
│   ├── src/
│   │   ├── components/
│   │   │   ├── global/
│   │   │   │   ├── CrosshairCursor.tsx     # MODIFY — disable on mobile/tablet
│   │   │   │   ├── GridBackground.tsx      # MODIFY — hide rulers on mobile, simplify grid
│   │   │   │   ├── TabNavigation.tsx       # MODIFY — bottom nav on mobile
│   │   │   │   ├── Layout.tsx              # MODIFY — responsive layout wrapper
│   │   │   │   └── GlassPanel.tsx          # NEW — reusable frosted glass component
│   │   │   ├── landing/                    # MODIFY — responsive + reduced particles on mobile
│   │   │   ├── about/                      # MODIFY — responsive sidebar, map → vertical timeline
│   │   │   └── projects/                   # MODIFY — responsive card grid
│   │   ├── pages/
│   │   │   ├── Soul.tsx                    # MODIFY — responsive stats grid
│   │   │   ├── Skill.tsx                   # MODIFY — lazy load, map → vertical timeline on mobile
│   │   │   ├── Memory.tsx                  # MODIFY — responsive blog layout
│   │   │   ├── Music.tsx                   # MODIFY — lazy load, responsive player + photo
│   │   │   └── Contact.tsx                 # MODIFY — responsive form layout
│   │   ├── hooks/
│   │   │   ├── useBreakpoint.ts            # NEW — responsive breakpoint hook
│   │   │   └── useReducedMotion.ts         # NEW — prefers-reduced-motion hook
│   │   └── styles/
│   │       └── theme.css                   # MODIFY — responsive variables, media queries
│   └── vite.config.ts                      # MODIFY — build optimization, manual chunks
├── Makefile                                # MODIFY — add deploy commands
```

---

## Task 1: Responsive Hooks + CSS Foundation

**Time estimate:** 3-5 min

**Files:**
- Create: `frontend/src/hooks/useBreakpoint.ts`
- Create: `frontend/src/hooks/useReducedMotion.ts`
- Modify: `frontend/src/styles/theme.css`

- [ ] **Step 1: Create useBreakpoint hook**

Create `frontend/src/hooks/useBreakpoint.ts`:

```typescript
import { useState, useEffect } from 'react'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop'
    if (window.innerWidth <= 480) return 'mobile'
    if (window.innerWidth <= 768) return 'tablet'
    return 'desktop'
  })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 480) setBreakpoint('mobile')
      else if (window.innerWidth <= 768) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}
```

Export convenience booleans: `useIsMobile()`, `useIsTablet()`, `useIsDesktop()` as thin wrappers.

- [ ] **Step 2: Create useReducedMotion hook**

Create `frontend/src/hooks/useReducedMotion.ts`:

```typescript
import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}
```

- [ ] **Step 3: Add responsive CSS custom properties and media queries to theme.css**

Add to `frontend/src/styles/theme.css`:

```css
/* Responsive overrides */
@media (max-width: 768px) {
  :root {
    --cell-size: 16px;
    --ruler-x-height: 0px;    /* Hide rulers on tablet */
    --ruler-y-width: 0px;
    --space-section: 64px;
    --glass-blur: 16px;       /* Slightly reduced blur for performance */
  }
}

@media (max-width: 480px) {
  :root {
    --cell-size: 12px;
    --ruler-x-height: 0px;
    --ruler-y-width: 0px;
    --space-section: 48px;
    --space-xl: 32px;
    --space-lg: 24px;
    --glass-blur: 12px;       /* Reduced blur for mobile performance */
  }
}

/* Reduced motion — disable ALL animations */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .animate-fade-in {
    animation: none;
    opacity: 1;
    filter: none;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/ frontend/src/styles/theme.css
git commit -m "feat(responsive): add breakpoint/reduced-motion hooks and responsive CSS variables"
```

---

## Task 2: Responsive Global Layout Components

**Time estimate:** 4-5 min

**Files:**
- Modify: `frontend/src/components/global/CrosshairCursor.tsx`
- Modify: `frontend/src/components/global/GridBackground.tsx`
- Modify: `frontend/src/components/global/TabNavigation.tsx`
- Modify: `frontend/src/components/global/Layout.tsx`

- [ ] **Step 1: Disable cursor effects on touch devices**

Modify `CrosshairCursor.tsx`:
- Check `window.matchMedia('(pointer: fine)')` — if false, render nothing
- Also check `useBreakpoint()` — if mobile or tablet, render nothing
- This removes the crosshair cursor, active cell indicator, and coordinates display on touch devices
- Restore default `cursor: auto` on body for mobile/tablet (currently `cursor: none` globally)

- [ ] **Step 2: Simplify grid on mobile/tablet**

Modify `GridBackground.tsx`:
- On mobile: hide X ruler, Y ruler, corner piece, and coordinates display entirely. Grid lines become very subtle (`opacity: 0.03`) or hidden.
- On tablet: hide rulers and corner piece. Grid lines at reduced opacity (`opacity: 0.05`). No coordinates display.
- On desktop: no changes — full rulers, grid, corner piece, coordinates.
- Use CSS media queries in the component's styles rather than JS to avoid flicker on load.

- [ ] **Step 3: Convert tabs to bottom navigation on mobile**

Modify `TabNavigation.tsx`:

**Desktop (>768px):** No changes — trapezoid `.md` file tabs at the top.

**Tablet (481-768px):** Tabs remain at top but switch to a horizontal scrollable row. Tabs use smaller font (`0.7rem`) and reduced padding. No trapezoid clip-path — simple rectangular tabs.

**Mobile (<=480px):** Tabs become a fixed bottom navigation bar:
- Position: `fixed`, `bottom: 0`, `left: 0`, `right: 0`
- Background: `var(--color-void)` with `border-top: 1px solid var(--color-grid)`
- Display: `flex`, `justify-content: space-around`
- Each tab: column layout with truncated label (e.g., "SOUL", "SKILL", "MEM", "CNTCT", "MUSIC") — or abbreviated `.md` names
- Active tab: `color: var(--color-ink)`, subtle top border indicator `border-top: 2px solid var(--color-ink)`
- Inactive tab: `color: var(--color-ink-muted)`
- Font: Space Mono, `0.65rem`, uppercase
- Each tab item: minimum 44x44px touch target (Apple HIG)
- `z-index: 100` to stay above content
- Safe area inset: `padding-bottom: env(safe-area-inset-bottom)` for notched devices

- [ ] **Step 4: Update Layout for responsive structure**

Modify `Layout.tsx`:
- On mobile: add `padding-bottom: 64px` (or height of bottom nav) to main content area to prevent content being hidden behind fixed bottom nav
- On mobile/tablet: remove `margin-top: var(--ruler-x-height)` and `margin-left: var(--ruler-y-width)` since rulers are hidden
- Sidebar behavior per breakpoint:
  - Desktop: sidebar visible at `320px`, panel fills remaining width
  - Tablet: sidebar collapses — replace with a top selector (dropdown or horizontal pill row) above the editor panel. Panel takes full width.
  - Mobile: no sidebar. If a page has sub-items (like SKILL.md's SKILLS/RESUME/HACKATHONS/CERTS), they appear as a horizontal scrollable tab row above the panel content.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/global/
git commit -m "feat(responsive): mobile bottom nav, hide rulers/cursor on touch, responsive layout"
```

---

## Task 3: Responsive Page Adjustments

**Time estimate:** 4-5 min

**Files:**
- Modify: `frontend/src/pages/Soul.tsx`
- Modify: `frontend/src/pages/Skill.tsx` (and related sub-components)
- Modify: `frontend/src/pages/Memory.tsx`
- Modify: `frontend/src/pages/Music.tsx`
- Modify: `frontend/src/pages/Contact.tsx`

- [ ] **Step 1: SOUL.md responsive**

Modify `Soul.tsx`:
- Stats grid: on mobile, switch from `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` to `grid-template-columns: repeat(2, 1fr)` with the "PARIS, FR" stat spanning full width
- Thesis paragraph: on mobile, reduce `max-width` constraint (allow full width with side padding `var(--space-sm)`)
- "See also" links: on mobile, stack vertically instead of inline with `>` separator
- Name heading: reduce `font-size` from `2rem` to `1.5rem` on mobile

- [ ] **Step 2: SKILL.md responsive — map becomes vertical timeline**

Modify Skill page and its sub-components:
- **SKILLS view:** skill domain cards stack single-column on mobile (already should with `auto-fit` grid, verify)
- **RESUME view:** experience timeline stays single-column (should already be responsive, verify padding)
- **HACKATHONS view — critical change:**
  - Desktop: Mapbox interactive map + timeline scrubber (no change)
  - Tablet: map reduced to 60% height, timeline below
  - Mobile: **Replace the Mapbox map entirely with a vertical timeline.** Render hackathons as a chronological vertical list with:
    - Left: date in Space Mono (`0.75rem`)
    - Right: event name, city, project, result
    - Win events get a `var(--color-win)` left border accent
    - A thin vertical line connects all events (classic timeline layout)
    - Remote hackathons interspersed in chronological order (labeled "REMOTE")
  - Use `useBreakpoint()` to conditionally render map vs. vertical timeline — do NOT load Mapbox JS at all on mobile
- **CERTIFICATIONS view:** single-column list (should already work, verify)

- [ ] **Step 3: MEMORY.md responsive**

Modify Memory page:
- Sidebar (blog post list): on tablet, collapses to a horizontal scrollable list of post titles above the editor panel. On mobile, becomes a dropdown selector or full-width list that the user taps to select a post.
- Blog post content: max-width removed on mobile, full-width with `padding: var(--space-sm)`
- Blog images: `max-width: 100%` (should already be set, verify)

- [ ] **Step 4: MUSIC.md responsive**

Modify Music page:
- Artist photo: on mobile, full-width above content instead of side-by-side
- Track list sidebar: on mobile, becomes a horizontal scrollable row of track pills below the photo
- Mini player: on mobile, fixed to bottom of MUSIC.md panel (above bottom nav). Simplified: just play/pause + track name + progress bar
- Audio visualizer ribbons (Three.js): on mobile, reduce particle count (see Task 5) or disable entirely

- [ ] **Step 5: CONTACT.md responsive**

Modify Contact page:
- Form fields: `width: 100%` at all breakpoints (should already be set)
- Social links grid: on mobile, stack vertically instead of horizontal row
- Submit button: on mobile, `width: 100%` for easier tap target
- Verify all touch targets >= 44x44px

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ frontend/src/components/
git commit -m "feat(responsive): adapt all pages for tablet/mobile — map to timeline, stacked layouts"
```

---

## Task 4: Glassmorphism / Frosted Glass System

**Time estimate:** 4-5 min

**Files:**
- Create: `frontend/src/components/global/GlassPanel.tsx`
- Modify: components that display photos with overlaid data (project cards, hackathon map pins, music page)

- [ ] **Step 1: Create reusable GlassPanel component**

Create `frontend/src/components/global/GlassPanel.tsx`:

```tsx
interface GlassPanelProps {
  children: React.ReactNode
  blurLevel?: 'heavy' | 'light' | 'none'  // maps to 24px, 12px, 0px
  className?: string
  revealOnHover?: boolean   // frosted → sharp on hover ("declassification" interaction)
  style?: React.CSSProperties
}
```

Implementation:
- Default `backdrop-filter: blur(var(--glass-blur, 20px))` with `-webkit-backdrop-filter` prefix for Safari
- `background: var(--glass-bg)` (semi-transparent)
- `border: 1px solid var(--glass-border)` (subtle white edge)
- `border-radius: var(--radius-subtle)` (2px — non-interactive glass panels are static per edge shape system; if the panel IS a clickable card, consumer passes `var(--radius-md)`)
- Inner shadow for depth: `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.2)`

**Blur levels:**
- `heavy` (busy photo behind): `--glass-blur: 24px`, `--glass-bg` alpha `0.7`
- `light` (simple/dark photo behind): `--glass-blur: 12px`, `--glass-bg` alpha `0.4`
- `none` (revealed state): `--glass-blur: 0px`, `--glass-bg` alpha `0.1`

**Reveal on hover interaction ("declassification"):**
When `revealOnHover` is true:
- Default: frosted (blur active, text fully visible)
- On hover: `backdrop-filter: blur(0px)`, `background: rgba(0, 0, 0, 0.1)`, text labels fade to `opacity: 0.3`
- Transition: `backdrop-filter 0.4s ease, background 0.4s ease`
- This reveals the sharp photo underneath — "declassifying" the content

**Performance fallback:**
```css
/* Fallback for browsers without backdrop-filter support */
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel {
    background: rgba(42, 42, 42, 0.85); /* Solid semi-transparent bg, no blur */
  }
}
```

**Safari prefix:**
Always include both `backdrop-filter` and `-webkit-backdrop-filter`. The component must set both.

- [ ] **Step 2: Apply GlassPanel to project cards**

Modify project card components:
- Where project cards have a thumbnail image, overlay a `<GlassPanel>` at the bottom or side of the card containing: title, tags, date, result
- Use `blurLevel="heavy"` for cards with busy screenshots
- Use `revealOnHover={true}` for hackathon project cards with results (hover reveals the full screenshot)
- Cards without thumbnails: no glass panel, use the existing COORDINATE-style card layout

- [ ] **Step 3: Apply GlassPanel to hackathon map pins (expanded)**

Modify hackathon map pin popup/expanded view:
- When a map pin is clicked/expanded, show the event photo (if available) with a `<GlassPanel>` overlaid containing: event name, date, result, domain tag
- `blurLevel="heavy"` for event photos
- `revealOnHover={true}` — hovering the expanded pin reveals the event photo in full clarity

- [ ] **Step 4: Apply GlassPanel to MUSIC.md artist photo**

Modify Music page:
- The vertical artist/performance photo has a `<GlassPanel>` overlaid at the bottom with: artist name "inhibitor", genre, status, platform links
- `blurLevel="light"` (the photo is likely a single subject, not busy)
- `revealOnHover={true}` — hover reveals the full photo

- [ ] **Step 5: Mobile adjustments for glass panels**

On mobile:
- Reduce blur radius: use `--glass-blur` from the responsive CSS variables (already set to `12px` on mobile in Task 1)
- Increase `--glass-bg` alpha to `0.75` for better readability on small screens
- Disable `revealOnHover` on touch devices — the "declassification" is a hover interaction that doesn't translate to touch. On mobile, the photo stays frosted (or use a tap-to-reveal toggle)
- Limit stacking: never more than 2 glass panels visible simultaneously on mobile (performance)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/global/GlassPanel.tsx frontend/src/components/ frontend/src/pages/
git commit -m "feat(glassmorphism): reusable GlassPanel with blur levels, hover reveal, Safari fallback"
```

---

## Task 5: Performance Optimization

**Time estimate:** 4-5 min

**Files:**
- Modify: Three.js scene components (landing point cloud, music visualizer, any other WebGL)
- Modify: `frontend/vite.config.ts`
- Modify: pages that lazy-load heavy components
- Modify: image-rendering components

- [ ] **Step 1: Three.js cleanup — dispose on unmount**

For every component that creates a Three.js scene (landing PointCloudScene, music audio visualizer, any others):
- In the cleanup function of `useEffect` (or `useGSAP` / R3F equivalent), call:
  - `renderer.dispose()`
  - `scene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); })`
  - `renderer.forceContextLoss()` — releases the WebGL context
- Remove the canvas element from the DOM
- Cancel any `requestAnimationFrame` loop via `cancelAnimationFrame(rafId)`

This prevents WebGL context leaks when navigating between pages.

- [ ] **Step 2: Reduce Three.js complexity on mobile**

In Three.js scene components, check `useBreakpoint()`:
- **Landing point cloud:**
  - Desktop: full particle count (e.g., 10,000 points)
  - Tablet: 50% particles (5,000)
  - Mobile: 25% particles (2,500) OR replace with a static CSS gradient background (prismatic `conic-gradient` with heavy blur, which is the CSS fallback from the UI design doc)
- **Music audio visualizer ribbons:**
  - Desktop: full ribbon geometry + particle system
  - Mobile: disable entirely — show a simple CSS audio waveform visualization or static prismatic gradient

- [ ] **Step 3: Respect prefers-reduced-motion for all animation systems**

Check `useReducedMotion()` in:
- **Three.js scenes:** If reduced motion, don't animate particles/ribbons. Render a single static frame and stop the animation loop.
- **GSAP animations:** If reduced motion, set `gsap.globalTimeline.timeScale(0)` or skip the timeline entirely and show the final state immediately.
- **CSS animations:** Already handled by the media query in Task 1 (`animation-duration: 0.01ms !important`).
- **Mapbox:** Disable fly-to animations, use `jumpTo` instead.
- **Scroll-triggered animations:** Show all content immediately without entrance animation.

- [ ] **Step 4: Image optimization**

For all `<img>` elements:
- Add `loading="lazy"` to all images below the fold (everything except landing hero content)
- Add `decoding="async"`
- Use `srcset` and `sizes` attributes for responsive images where applicable
- Convert images to WebP format during build (or serve WebP versions from Supabase Storage)
- Add `width` and `height` attributes to prevent layout shift (CLS)
- For the artist photo on MUSIC.md and any hackathon event photos, ensure they are served at appropriate sizes (not loading a 4000px image on a 375px mobile screen)

- [ ] **Step 5: Code splitting with React.lazy**

Modify `frontend/src/App.tsx` (or routing file):

```typescript
import { lazy, Suspense } from 'react'

// Heavy pages loaded lazily
const Skill = lazy(() => import('./pages/Skill'))    // Mapbox + GSAP timeline
const Music = lazy(() => import('./pages/Music'))    // Three.js audio visualizer
const Landing = lazy(() => import('./pages/Landing')) // Three.js point cloud

// Light pages loaded eagerly
import Soul from './pages/Soul'
import Contact from './pages/Contact'
import Memory from './pages/Memory'
```

Wrap lazy-loaded routes in `<Suspense>` with a minimal fallback (e.g., a subtle loading indicator matching the grid aesthetic — a pulsing grid cell or a simple Space Mono "LOADING..." text).

- [ ] **Step 6: Vite build optimization**

Modify `frontend/vite.config.ts` — add manual chunk splitting:

```typescript
export default defineConfig({
  // ... existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'gsap': ['gsap'],
          'mapbox': ['mapbox-gl'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'tanstack': ['@tanstack/react-query'],
        }
      }
    }
  }
})
```

This ensures Three.js (~600KB), GSAP, and Mapbox are separate chunks that only load when needed (via React.lazy).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/ frontend/vite.config.ts
git commit -m "perf: Three.js dispose, mobile particle reduction, lazy loading, image optimization"
```

---

## Task 6: SEO Basics

**Time estimate:** 3-4 min

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/public/robots.txt`
- Create: `frontend/public/sitemap.xml`
- Create/add: favicon files to `frontend/public/`
- Create/add: `frontend/public/og-image.png`

- [ ] **Step 1: Update index.html with meta tags**

Modify `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>Yongkang ZOU — Creative Technologist</title>
    <meta name="description" content="AI Engineer and Creative Technologist. 24 hackathons, 9 wins. Building at the intersection of engineering and art." />

    <!-- Open Graph / Social -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://yongkang.dev/" />
    <meta property="og:title" content="Yongkang ZOU — Creative Technologist" />
    <meta property="og:description" content="AI Engineer and Creative Technologist. 24 hackathons, 9 wins. Building at the intersection of engineering and art." />
    <meta property="og:image" content="https://yongkang.dev/og-image.png" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Yongkang ZOU — Creative Technologist" />
    <meta name="twitter:description" content="AI Engineer and Creative Technologist. 24 hackathons, 9 wins." />
    <meta name="twitter:image" content="https://yongkang.dev/og-image.png" />

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

    <!-- Theme color (matches --color-void) -->
    <meta name="theme-color" content="#1a1a1a" />

    <!-- Preconnect to external services -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://api.mapbox.com" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create robots.txt**

Create `frontend/public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://yongkang.dev/sitemap.xml
```

- [ ] **Step 3: Create sitemap.xml**

Create `frontend/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapschemas.org/sitemap/0.9">
  <url>
    <loc>https://yongkang.dev/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yongkang.dev/files/soul</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://yongkang.dev/files/skill</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yongkang.dev/files/memory</loc>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://yongkang.dev/files/contact</loc>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://yongkang.dev/files/music</loc>
    <priority>0.6</priority>
  </url>
</urlset>
```

- [ ] **Step 4: Create favicon**

Generate favicons from the portfolio's visual identity. Options:
- A minimal "Y" lettermark in Space Mono on `--color-void` background, or
- A small prismatic gradient square, or
- A crosshair `+` symbol (matching the grid cursor aesthetic)

Files needed:
- `frontend/public/favicon.ico` — 48x48 multi-size ICO
- `frontend/public/favicon-16x16.png`
- `frontend/public/favicon-32x32.png`
- `frontend/public/apple-touch-icon.png` — 180x180

Use a tool like realfavicongenerator.net or create programmatically. Keep the design minimal — dark background, light mark.

- [ ] **Step 5: Create Open Graph image**

Create `frontend/public/og-image.png` (1200x630):
- Dark grey (`--color-void`) background
- "YONGKANG ZOU" in large Inter font, centered
- Subtitle: "Creative Technologist" in Space Mono
- Subtle grid lines visible in background
- Optional: faint prismatic gradient accent

This is the image that appears when the link is shared on LinkedIn, Twitter, Slack, etc.

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html frontend/public/
git commit -m "feat(seo): meta tags, Open Graph, favicon, robots.txt, sitemap"
```

---

## Task 7: Backend Dockerfile + Fly.io Configuration

**Time estimate:** 3-4 min

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/fly.toml`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create Dockerfile**

Create `backend/Dockerfile` — multi-stage build for minimal image:

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /server cmd/server/main.go

# Stage 2: Run
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /server .

# Copy data files
COPY --from=builder /app/data ./data

# Expose port
EXPOSE 8080

# Run
CMD ["./server"]
```

- [ ] **Step 2: Create .dockerignore**

Create `backend/.dockerignore`:

```
bin/
*.md
.git
.gitignore
```

- [ ] **Step 3: Create fly.toml**

Create `backend/fly.toml`:

```toml
app = "yongkang-api"
primary_region = "cdg"  # Paris — closest to user's base

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  DATA_DIR = "./data"
  # FRONTEND_URL, SUPABASE_URL, SUPABASE_KEY, SENDGRID_API_KEY
  # set via `fly secrets set` — NOT in this file

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

Key choices:
- `primary_region = "cdg"` — Paris Charles de Gaulle, closest to Yongkang's base
- `auto_stop_machines = true` — scale to zero when idle (cost saving)
- `auto_start_machines = true` — cold start on first request
- `min_machines_running = 0` — can scale to zero (free tier friendly)
- `memory_mb = 256` — Go binary + JSON files need minimal memory

- [ ] **Step 4: Test Docker build locally**

```bash
cd backend && docker build -t yongkang-api . && docker run -p 8080:8080 yongkang-api
curl http://localhost:8080/api/health
```

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore backend/fly.toml
git commit -m "feat(deploy): Dockerfile and Fly.io config for Go backend"
```

---

## Task 8: Production CORS + Environment Variables

**Time estimate:** 2-3 min

**Files:**
- Modify: `backend/internal/middleware/middleware.go`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Update CORS middleware for production**

Modify `backend/internal/middleware/middleware.go`:

The CORS middleware currently allows `http://localhost:5173`. Update it to read from `FRONTEND_URL` environment variable and support multiple origins:

```go
func CORS() func(http.Handler) http.Handler {
    allowedOrigins := []string{"http://localhost:5173"} // dev default

    if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
        allowedOrigins = append(allowedOrigins, frontendURL)
    }

    return cors.Handler(cors.Options{
        AllowedOrigins:   allowedOrigins,
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
        AllowCredentials: true,
        MaxAge:           300,
    })
}
```

In production, `FRONTEND_URL` will be set to `https://yongkang.dev` via `fly secrets set`.

- [ ] **Step 2: Update frontend API base URL for production**

Modify `frontend/src/lib/api.ts`:

The API client currently uses `/api` (proxied by Vite dev server). In production, the frontend is on Vercel and the backend is on Fly.io — different domains.

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api'
```

In Vercel, set `VITE_API_URL=https://api.yongkang.dev/api`.

In development, `VITE_API_URL` is unset, so it falls back to `/api` (proxied by Vite to `localhost:8080`).

Update all `fetch()` calls to use `API_BASE`:

```typescript
export async function fetchProjects(category?: string) {
  const url = category
    ? `${API_BASE}/projects?category=${category}`
    : `${API_BASE}/projects`
  const res = await fetch(url)
  // ...
}
```

- [ ] **Step 3: Add Vercel SPA rewrites**

Create `frontend/vercel.json` (if it doesn't exist):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures all routes (e.g., `/files/skill`) are handled by the SPA router instead of returning 404.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/middleware/ frontend/src/lib/api.ts frontend/vercel.json
git commit -m "feat(deploy): production CORS, API base URL config, Vercel SPA rewrites"
```

---

## Task 9: Deploy to Fly.io (Backend)

**Time estimate:** 3-5 min

**Files:** No new files — CLI operations only.

- [ ] **Step 1: Deploy backend to Fly.io**

```bash
cd backend
fly launch --name yongkang-api --region cdg --no-deploy  # Create app (first time only)
fly secrets set FRONTEND_URL=https://yongkang.dev
fly secrets set SUPABASE_URL=<your-supabase-url>
fly secrets set SUPABASE_KEY=<your-supabase-service-key>
fly secrets set SENDGRID_API_KEY=<your-sendgrid-key>
fly deploy
```

- [ ] **Step 2: Verify backend is running**

```bash
fly status
curl https://yongkang-api.fly.dev/api/health
curl https://yongkang-api.fly.dev/api/projects | head -c 200
```

- [ ] **Step 3: Set up custom domain on Fly.io**

```bash
fly certs create api.yongkang.dev
```

Fly will provide a CNAME target. Note this for Cloudflare DNS setup in Task 11.

---

## Task 10: Deploy to Vercel (Frontend)

**Time estimate:** 3-5 min

**Files:** No new files — CLI and dashboard operations.

- [ ] **Step 1: Deploy frontend to Vercel**

```bash
cd frontend
npx vercel --prod
```

Or connect the GitHub repository to Vercel:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`

- [ ] **Step 2: Set environment variables in Vercel**

In Vercel project settings → Environment Variables:
- `VITE_API_URL` = `https://api.yongkang.dev/api`
- `VITE_MAPBOX_TOKEN` = `<your-mapbox-public-token>`
- `VITE_SUPABASE_URL` = `<your-supabase-url>`
- `VITE_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`

Redeploy after setting environment variables.

- [ ] **Step 3: Verify frontend is deployed**

Open the Vercel preview URL — should see the landing page, navigate to `/files/soul`, verify API calls work against the Fly.io backend.

- [ ] **Step 4: Set up custom domain on Vercel**

In Vercel project settings → Domains → Add `yongkang.dev` and `www.yongkang.dev`.

Vercel will provide:
- An A record for `yongkang.dev` → `76.76.21.21` (Vercel's IP)
- A CNAME for `www.yongkang.dev` → `cname.vercel-dns.com`

Note these for Cloudflare DNS setup in Task 11.

---

## Task 11: Cloudflare DNS + Custom Domain

**Time estimate:** 3-5 min

**Files:** No code changes — Cloudflare dashboard operations.

- [ ] **Step 1: Add DNS records in Cloudflare**

In Cloudflare dashboard for `yongkang.dev`:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` (root) | `76.76.21.21` | DNS only (grey cloud) |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only (grey cloud) |
| CNAME | `api` | `<fly-app-name>.fly.dev` | DNS only (grey cloud) |

**Important:** Set Cloudflare proxy to "DNS only" (grey cloud) for all records. Vercel and Fly.io handle their own SSL/TLS. Proxying through Cloudflare can cause SSL conflicts.

- [ ] **Step 2: Verify SSL certificates**

After DNS propagation (usually 5-30 minutes):

```bash
curl -I https://yongkang.dev          # Should return 200 from Vercel
curl -I https://api.yongkang.dev/api/health  # Should return 200 from Fly.io
```

Both should show valid HTTPS certificates.

- [ ] **Step 3: Verify CORS works end-to-end**

Open `https://yongkang.dev` in a browser:
- Open DevTools → Network tab
- Navigate to `/files/skill` — API calls to `https://api.yongkang.dev/api/skills` should succeed without CORS errors
- Check response headers include `Access-Control-Allow-Origin: https://yongkang.dev`

- [ ] **Step 4: Test all routes with custom domain**

Verify these URLs all work:
- `https://yongkang.dev/` — landing page
- `https://yongkang.dev/files/soul` — SOUL.md
- `https://yongkang.dev/files/skill` — SKILL.md with API data
- `https://yongkang.dev/files/memory` — MEMORY.md with blog posts
- `https://yongkang.dev/files/contact` — CONTACT.md with working form
- `https://yongkang.dev/files/music` — MUSIC.md with tracks
- `https://www.yongkang.dev/` — redirects to `yongkang.dev`

---

## Task 12: Update Makefile with Deploy Commands

**Time estimate:** 2 min

**Files:**
- Modify: `Makefile`

- [ ] **Step 1: Add deployment targets**

Add to `Makefile`:

```makefile
deploy-backend:
	cd backend && fly deploy

deploy-frontend:
	cd frontend && npx vercel --prod

deploy: deploy-backend deploy-frontend

# Quick check that both services are healthy
health-check:
	@echo "Backend:" && curl -s https://api.yongkang.dev/api/health | python3 -m json.tool
	@echo "Frontend:" && curl -s -o /dev/null -w "%{http_code}" https://yongkang.dev/
```

- [ ] **Step 2: Commit**

```bash
git add Makefile
git commit -m "chore: add deploy and health-check targets to Makefile"
```

---

## Manual Steps (User Action Required)

These steps cannot be automated by an agentic worker and must be done by the user:

### Before starting Phase 9:
1. **Purchase domain `yongkang.dev`** — via Cloudflare Registrar, Namecheap, Google Domains, or any registrar. If using a non-Cloudflare registrar, update nameservers to Cloudflare's.
2. **Create Cloudflare account** (if not already) — add the `yongkang.dev` domain zone.
3. **Create Fly.io account** — install the `flyctl` CLI (`brew install flyctl` on macOS). Run `fly auth login`.
4. **Create Vercel account** — install the Vercel CLI (`npm i -g vercel`). Run `vercel login`.
5. **Have API keys ready:**
   - Supabase project URL and keys (from Phase 6)
   - SendGrid API key (or Resend) for contact form emails
   - Mapbox public token (from Phase 5)

### During deployment:
6. **Create favicon and OG image** — design or generate the favicon set and the 1200x630 Open Graph preview image. Place in `frontend/public/`.
7. **Verify DNS propagation** — after adding Cloudflare DNS records, wait for propagation (5-30 min). Check with `dig yongkang.dev` and `dig api.yongkang.dev`.
8. **SSL certificate verification** — Fly.io and Vercel auto-provision Let's Encrypt certificates. Verify HTTPS works on both domains.

### After deployment:
9. **Run Lighthouse audit** — open Chrome DevTools → Lighthouse → run Performance + Accessibility + Best Practices + SEO audits on `https://yongkang.dev/`. Target: 90+ on Performance.
10. **Test on real devices** — test on iPhone (Safari), Android (Chrome), iPad (Safari) for responsive layout, touch interactions, and bottom nav.
11. **Share the link** — test Open Graph preview by pasting `https://yongkang.dev` into LinkedIn, Twitter, and Slack message composers. Verify the preview image, title, and description render correctly.

---

## Verification Checklist (Phase 9 Complete When...)

### Responsive Design
- [ ] **Desktop (>768px):** Full file system with sidebar + editor panel, rulers visible, crosshair cursor active, grid coordinates display working
- [ ] **Tablet (481-768px):** Sidebar collapses to top selector, panel takes full width, rulers hidden, cursor effects disabled, tabs remain at top (smaller)
- [ ] **Mobile (<=480px):** Single column layout, tabs become fixed bottom nav with .md names, no cursor effects, no rulers, grid lines minimal/hidden
- [ ] **Mobile bottom nav:** all five tabs visible, minimum 44x44px touch targets, `safe-area-inset-bottom` padding for notched devices
- [ ] **HACKATHONS on mobile:** Mapbox map replaced with vertical timeline (Mapbox JS not loaded at all)
- [ ] **MUSIC.md on mobile:** photo full-width above content, track list horizontal, mini player simplified
- [ ] **SOUL.md stats grid on mobile:** 2-column layout, readable without horizontal scroll
- [ ] **All form inputs on mobile:** full-width, touch-friendly sizing

### Glassmorphism
- [ ] `GlassPanel` component renders with frosted blur effect on all project cards with thumbnails
- [ ] Hover reveals sharp photo underneath (the "declassification" interaction) on desktop
- [ ] Hackathon map pin expanded view uses `GlassPanel` with event photo
- [ ] MUSIC.md artist photo has `GlassPanel` overlay with artist info
- [ ] Safari: `-webkit-backdrop-filter` prefix works correctly
- [ ] Fallback: browsers without `backdrop-filter` support show solid semi-transparent background
- [ ] Mobile: blur radius reduced, `revealOnHover` disabled

### Performance
- [ ] Three.js scenes call `dispose()` on all geometries, materials, and renderers on component unmount
- [ ] Three.js animation loops are cancelled with `cancelAnimationFrame` on unmount
- [ ] Mobile: particle count reduced by 50-75% (or WebGL disabled entirely and CSS fallback shown)
- [ ] `prefers-reduced-motion: reduce`: ALL animations disabled — CSS, Three.js, GSAP. Content shows in final state immediately.
- [ ] Images use `loading="lazy"` below the fold
- [ ] Images have explicit `width`/`height` to prevent CLS
- [ ] SKILL.md (with Mapbox + GSAP) and MUSIC.md (with Three.js) are code-split via `React.lazy`
- [ ] Landing page (with Three.js) is code-split via `React.lazy`
- [ ] Vite build produces separate chunks for `three`, `gsap`, `mapbox-gl`
- [ ] Lighthouse Performance score: 90+ on desktop, 80+ on mobile

### Deployment
- [ ] Backend Docker image builds successfully
- [ ] Backend deployed to Fly.io, `https://api.yongkang.dev/api/health` returns 200
- [ ] Frontend deployed to Vercel, `https://yongkang.dev/` loads the landing page
- [ ] SPA routing works: refreshing `https://yongkang.dev/files/skill` loads the page (not 404)
- [ ] CORS: API calls from `yongkang.dev` to `api.yongkang.dev` succeed without errors
- [ ] Environment variables set on both platforms (Supabase keys, SendGrid, Mapbox token, FRONTEND_URL)
- [ ] `www.yongkang.dev` redirects to `yongkang.dev`
- [ ] SSL certificates valid on both `yongkang.dev` and `api.yongkang.dev`

### SEO
- [ ] Page title: "Yongkang ZOU — Creative Technologist"
- [ ] Meta description present and accurate
- [ ] Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`
- [ ] Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] Favicon appears in browser tab
- [ ] `robots.txt` accessible at `https://yongkang.dev/robots.txt`
- [ ] `sitemap.xml` accessible at `https://yongkang.dev/sitemap.xml`
- [ ] OG image preview works when URL is shared on LinkedIn/Twitter/Slack
- [ ] `theme-color` meta tag set to `#1a1a1a`

### Final QA
- [ ] All pages load without console errors (no WebGL context lost, no 404s, no CORS failures)
- [ ] Contact form works end-to-end: submit → API → email delivery
- [ ] Blog posts load from Supabase on MEMORY.md
- [ ] Music tracks play from Supabase Storage on MUSIC.md
- [ ] Admin login works: can create/edit posts, upload tracks
- [ ] No sensitive data in client-side code (no Supabase service keys, no admin credentials)
- [ ] `.env` files not committed to git
- [ ] Edge shape system consistent across all pages: static = sharp (0px), interactive = rounded (6-12px)
- [ ] Typography consistent: Space Mono for labels/data, Inter for narrative text
- [ ] Color: achromatic base with prismatic accents only on interaction or semantic meaning
- [ ] No anti-patterns: no corporate energy, no bouncing animations, no terminal cliches
- [ ] `make deploy` successfully deploys both backend and frontend
- [ ] `make health-check` confirms both services are up
