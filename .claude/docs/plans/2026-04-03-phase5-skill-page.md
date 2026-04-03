# Phase 5: SKILL.md — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SKILL.md page with four views inside the Phase 2 file system shell: a GSAP progressive skill animation (default), an experience/resume timeline, an interactive Mapbox hackathon map with GSAP timeline scrubber, and a certifications/education view.

**Depends on:** Phase 2 (File System Shell) must be complete. The Note App layout with `.md` tab navigation, sidebar + editor panel structure, breadcrumb, and nested routing (`/files/skill/:item?`) must exist. Phase 1 backend endpoints (`/api/skills`, `/api/experience`, `/api/hackathons`) must be serving data.

**Architecture notes:**
- SKILL.md uses the Phase 2 sidebar with four note-items: SKILLS (default), RESUME, HACKATHONS, CERTIFICATIONS
- The sidebar config from Phase 2 (`sidebarConfig.ts`) already defines these items with route segments `''`, `'resume'`, `'hackathons'`, `'certifications'`
- Routes: `/files/skill` (skills default), `/files/skill/resume`, `/files/skill/hackathons`, `/files/skill/certifications`
- Each view renders in the editor panel (right side of the file system layout)
- Data is fetched from the Go backend via TanStack Query using the existing `api.ts` functions (`fetchSkills`, `fetchExperience`, `fetchHackathons`)
- Certifications/education data is hardcoded (static, from profile doc)
- GSAP animations use `gsap-core` for tweens/timelines, `gsap-react` for `useGSAP` hook

**Reference docs:**
- `.claude/docs/UX-design.md` -- SKILL.md spec (section 4)
- `.claude/docs/UI-implement-design.md` -- GSAP animation, Temporal Anomaly elements for timeline, component specs
- `.claude/docs/portfolio-design-principles.md` -- edge shapes (sharp default, round = interactive), typography (Space Mono for labels, Inter for body), Apple-style clean design
- `.claude/docs/yongkang-profile.md` -- all skills, hackathons, experience, education data
- `.claude/design-refs/3-temporal-anomaly.html` -- timeline ruler/ribbon visual reference for hackathon timeline

**Design constraints:**
- Edge shape system: static cards/panels = `var(--radius-none)` (0px), interactive elements (buttons, map pins) = `var(--radius-sm)` to `var(--radius-md)` (6-8px), non-clickable tags = `var(--radius-subtle)` (2px)
- Typography: Space Mono for labels/data/dates, Inter for narrative/body text
- Color: achromatic base. Prismatic accents only on interaction (hover) or semantic meaning (win = `--color-win`)
- Animation: fade-from-blur entrance, GSAP stagger for progressive reveal. No bounce, no slide.
- All animations respect `prefers-reduced-motion`

**GSAP packages required:**
- `gsap` (core) -- `gsap.to()`, `gsap.timeline()`, `stagger`
- `@gsap/react` -- `useGSAP` hook for React lifecycle cleanup
- Optionally `ScrollTrigger` if scroll-based reveal is desired within the panel

---

## File Structure (Phase 5)

```
frontend/src/
├── pages/
│   └── skill/
│       ├── SkillsView.tsx              # NEW -- default SKILLS view with GSAP progressive animation
│       ├── ResumeView.tsx              # NEW -- experience timeline view
│       ├── HackathonsView.tsx          # NEW -- Mapbox map + GSAP timeline scrubber
│       └── CertificationsView.tsx      # NEW -- education + certifications view
├── components/
│   └── skill/
│       ├── SkillDomainCard.tsx         # NEW -- single skill domain card with GSAP materialization
│       ├── SkillTag.tsx                # NEW -- individual skill tag with hover prismatic effect
│       ├── ExperienceBlock.tsx         # NEW -- single experience entry (narrative block)
│       ├── HackathonMap.tsx            # NEW -- Mapbox GL map with animated pins
│       ├── TimelineScrubber.tsx        # NEW -- GSAP-powered timeline ruler with playhead
│       ├── HackathonPin.tsx            # NEW -- map pin popup content
│       └── HackathonStats.tsx          # NEW -- computed stats display (total, wins, countries, etc.)
├── styles/
│   └── skill.css                       # NEW -- styles for skill page views
├── pages/
│   └── SkillPage.tsx                   # MODIFY -- wire sub-routes to the four views (or create if Phase 2 left a placeholder)
```

**Package installs required:**
```bash
npm install gsap @gsap/react mapbox-gl
npm install -D @types/mapbox-gl
```

**Environment variable:**
- `VITE_MAPBOX_TOKEN` -- Mapbox public access token (add to `.env` and `.env.example`)

---

## Task 1: Install Dependencies + Environment Setup

**Time estimate:** 2 min

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Create or modify: `frontend/.env.example`

- [ ] **Step 1: Install GSAP, @gsap/react, and mapbox-gl**

```bash
cd frontend
npm install gsap @gsap/react mapbox-gl
npm install -D @types/mapbox-gl
```

GSAP is free for non-commercial use. The portfolio qualifies. `@gsap/react` provides the `useGSAP` hook that handles cleanup automatically (replaces manual `gsap.context()` + `revert()` pattern).

- [ ] **Step 2: Add Mapbox token to environment**

Add `VITE_MAPBOX_TOKEN` to `frontend/.env.example`:

```
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

Create or update `frontend/.env` with the real Mapbox public token. This token is safe to expose client-side (Mapbox public tokens are URL-restricted).

- [ ] **Step 3: Register GSAP plugins**

Create a GSAP registration file at `frontend/src/lib/gsap.ts` (or add to the entry point). This ensures plugins are registered once globally:

```typescript
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

// Register the useGSAP hook so it uses our gsap instance
gsap.registerPlugin(useGSAP)

export { gsap, useGSAP }
```

Import this in `frontend/src/main.tsx` (or at the top of the GSAP-using components). The registration pattern ensures GSAP plugins are available before any component mounts.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/.env.example frontend/src/lib/gsap.ts
git commit -m "feat(deps): add gsap, @gsap/react, and mapbox-gl for SKILL.md page"
```

---

## Task 2: Create skill.css Stylesheet

**Time estimate:** 3-4 min

**Files:**
- Create: `frontend/src/styles/skill.css`
- Modify: `frontend/src/index.css` (add import)
- Possibly modify: `frontend/src/styles/theme.css` (if tokens are missing)

- [ ] **Step 0: Verify required CSS tokens exist in theme.css**

Before creating `skill.css`, verify these CSS custom properties exist in `frontend/src/styles/theme.css`: `--color-grid-major`, `--radius-circle`. They should already be defined from Phase 1. If missing, add them to the `:root` block in `theme.css`:

```css
--color-grid-major: #444444;
--radius-circle: 50%;
```

- [ ] **Step 1: Create skill.css with all SKILL.md view styles**

> **Dependency note:** The `fadeInFromBlur` keyframe animation used below is defined in `frontend/src/styles/theme.css` (added by Phase 4). If Phase 5 is implemented before Phase 4, you must add the following keyframe to `frontend/src/styles/theme.css` as part of this task:
> ```css
> @keyframes fadeInFromBlur {
>   from { opacity: 0; filter: blur(8px); }
>   to   { opacity: 1; filter: blur(0); }
> }
> ```

Create `frontend/src/styles/skill.css`:

```css
/* ===== SKILL PAGE SHARED ===== */
/* NOTE: fadeInFromBlur keyframe is defined in theme.css (Phase 4). */
.skill-page {
  animation: fadeInFromBlur 0.6s ease forwards;
  padding: var(--space-lg);
  max-width: 900px;
}

/* ===== SKILLS VIEW — Domain Cards ===== */
.skill-domains {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.skill-domain-card {
  background: var(--color-surface-0);
  border-radius: var(--radius-none);  /* Static container = sharp */
  padding: var(--space-md);
  box-shadow: var(--shadow-card);
  opacity: 0;  /* Hidden by default, GSAP reveals */
}

.skill-domain-title {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink);
  margin-bottom: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.skill-domain-title .icon {
  color: var(--color-ink-muted);
  font-size: 1rem;
}

.skill-subcategory-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-ink-muted);
  margin-top: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  padding: 4px 10px;
  border: 1px solid var(--color-ink-faint);
  border-radius: var(--radius-subtle);  /* Non-clickable label = 2px */
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-ink);
  cursor: none;
  opacity: 0;  /* Hidden by default, GSAP reveals */
  transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Prismatic hover effect */
.skill-tag::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    var(--prism-angle, 135deg),
    rgba(255, 107, 157, 0.15) 0%,
    rgba(77, 208, 225, 0.15) 33%,
    rgba(105, 240, 174, 0.1) 66%,
    rgba(179, 136, 255, 0.15) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease, --prism-angle 0.6s ease;
}

.skill-tag:hover::before {
  opacity: 1;
  --prism-angle: 225deg;
}

.skill-tag:hover {
  border-color: var(--color-ink);
}

.skill-battle-tested {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-ink-faint);
  margin-top: var(--space-xs);
  letter-spacing: 0.02em;
}

.skill-battle-tested span {
  color: var(--color-ink-muted);
}

/* ===== RESUME VIEW — Experience Timeline ===== */
.resume-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

/* Vertical line connecting experience blocks */
.resume-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-grid);
}

.experience-block {
  position: relative;
  padding-left: 36px;
  padding-bottom: var(--space-xl);
}

.experience-block:last-child {
  padding-bottom: 0;
}

/* Timeline dot */
.experience-block::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 4px;
  width: 11px;
  height: 11px;
  border-radius: var(--radius-circle);
  background: var(--color-surface-0);
  border: 2px solid var(--color-ink-muted);
}

.experience-block:first-child::before {
  border-color: var(--color-highlight);
  background: var(--color-highlight);
}

.experience-date {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.experience-role {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 2px;
}

.experience-company {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  margin-bottom: var(--space-xs);
}

.experience-skill-assembled {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-ink);
  margin-bottom: var(--space-sm);
  max-width: 600px;
}

.experience-highlights {
  list-style: none;
  padding: 0;
  margin: 0;
}

.experience-highlights li {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  line-height: 1.6;
  padding-left: 16px;
  position: relative;
  margin-bottom: 4px;
}

.experience-highlights li::before {
  content: '>';
  position: absolute;
  left: 0;
  color: var(--color-ink-faint);
  font-family: var(--font-mono);
}

.experience-note {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-faint);
  font-style: italic;
  margin-top: var(--space-xs);
}

/* ===== HACKATHONS VIEW ===== */
.hackathons-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.hackathon-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-grid);
}

.hackathon-stat-value {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-ink);
}

.hackathon-stat-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hackathon-map-container {
  width: 100%;
  height: 420px;
  border-radius: var(--radius-none);  /* Static container */
  overflow: hidden;
  background: var(--color-surface-0);
  position: relative;
}

.hackathon-remote-sidebar {
  background: var(--color-surface-0);
  border-radius: var(--radius-none);
  padding: var(--space-md);
  box-shadow: var(--shadow-card);
}

.hackathon-remote-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
  margin-bottom: var(--space-sm);
}

.hackathon-remote-item {
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--color-grid);
}

.hackathon-remote-item:last-child {
  border-bottom: none;
}

.hackathon-remote-name {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--color-ink);
}

.hackathon-remote-meta {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-muted);
}

.hackathon-remote-result {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-win);
  font-weight: 600;
}

/* Timeline scrubber */
.timeline-scrubber {
  position: relative;
  height: 60px;
  background: var(--color-surface-0);
  border-radius: var(--radius-none);
  overflow: hidden;
  user-select: none;
  cursor: none;
}

.timeline-ruler {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
}

.timeline-tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  background: var(--color-grid);
}

.timeline-tick.major {
  height: 20px;
  background: var(--color-grid-major);
}

.timeline-tick.minor {
  height: 10px;
}

.timeline-tick-label {
  position: absolute;
  top: 4px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-ink-muted);
  transform: translateX(-50%);
  white-space: nowrap;
}

.timeline-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-highlight);
  z-index: 2;
  pointer-events: none;
}

.timeline-playhead::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  width: 10px;
  height: 10px;
  background: var(--color-highlight);
  border-radius: var(--radius-circle);
}

.timeline-event-marker {
  position: absolute;
  bottom: 22px;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-circle);
  background: var(--color-ink-muted);
  transform: translateX(-50%);
  transition: background 0.2s ease, transform 0.2s ease;
}

.timeline-event-marker.win {
  background: var(--color-win);
}

.timeline-event-marker.active {
  transform: translateX(-50%) scale(1.8);
  background: var(--color-highlight);
}

/* Map pin popup */
.map-popup {
  font-family: var(--font-sans);
  background: var(--color-surface-0);
  border: 1px solid var(--color-grid);
  padding: var(--space-sm);
  min-width: 180px;
}

.map-popup-name {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-ink);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.map-popup-project {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--color-ink);
  margin-bottom: 4px;
}

.map-popup-date {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-ink-muted);
}

.map-popup-result {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-win);
  font-weight: 600;
  margin-top: 4px;
}

/* ===== CERTIFICATIONS VIEW ===== */
.certifications-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.cert-section-title {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink-muted);
  margin-bottom: var(--space-md);
}

/* Education entries use same timeline pattern as resume */
.cert-entry {
  padding-left: 36px;
  position: relative;
  padding-bottom: var(--space-lg);
}

.cert-entry::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 4px;
  width: 11px;
  height: 11px;
  border-radius: var(--radius-circle);
  background: var(--color-surface-0);
  border: 2px solid var(--color-ink-muted);
}

.cert-degree {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 2px;
}

.cert-institution {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-muted);
  margin-bottom: 2px;
}

.cert-date {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-ink-faint);
}

.cert-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-grid);
}

.cert-item:last-child {
  border-bottom: none;
}

.cert-item-name {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--color-ink);
}

.cert-item-issuer {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-ink-muted);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .hackathon-map-container {
    height: 280px;
  }

  .hackathon-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .skill-page {
    padding: var(--space-md);
  }
}

/* ===== REDUCED MOTION ===== */
@media (prefers-reduced-motion: reduce) {
  .skill-domain-card,
  .skill-tag {
    opacity: 1 !important;
    transform: none !important;
  }

  .skill-page {
    animation: none;
    opacity: 1;
  }

  .timeline-playhead {
    transition: none;
  }
}
```

- [ ] **Step 2: Import skill.css in index.css**

Add to `frontend/src/index.css` after the existing imports:

```css
@import "./styles/skill.css";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/skill.css frontend/src/index.css
git commit -m "feat(skill): add skill.css stylesheet for all SKILL.md views"
```

---

## Task 3: Build SkillTag + SkillDomainCard Components

**Time estimate:** 4-5 min

**Files:**
- Create: `frontend/src/components/skill/SkillTag.tsx`
- Create: `frontend/src/components/skill/SkillDomainCard.tsx`

These are the atomic building blocks for the SKILLS default view.

- [ ] **Step 1: Create SkillTag component**

Create `frontend/src/components/skill/SkillTag.tsx`:

```typescript
interface SkillTagProps {
  name: string
}

export default function SkillTag({ name }: SkillTagProps) {
  return (
    <span className="skill-tag" data-interactive>
      {name}
    </span>
  )
}
```

The prismatic hover effect is handled entirely via CSS (`.skill-tag::before`). The tag starts with `opacity: 0` and is revealed by the parent GSAP animation. The `data-interactive` attribute enables the custom crosshair cursor expansion on hover.

- [ ] **Step 2: Create SkillDomainCard component**

Create `frontend/src/components/skill/SkillDomainCard.tsx`:

```typescript
import { useRef } from 'react'
import type { SkillDomain } from '../../types/index'
import SkillTag from './SkillTag'

interface SkillDomainCardProps {
  domain: SkillDomain
}

export default function SkillDomainCard({ domain }: SkillDomainCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={cardRef} className="skill-domain-card">
      <div className="skill-domain-title">
        {domain.title}
      </div>

      {/* If domain has subcategories, render grouped */}
      {domain.subcategories && domain.subcategories.map((sub) => (
        <div key={sub.name}>
          <div className="skill-subcategory-label">{sub.name}</div>
          <div className="skill-tags">
            {sub.skills.map((skill) => (
              <SkillTag key={skill} name={skill} />
            ))}
          </div>
        </div>
      ))}

      {/* If domain has flat skills (no subcategories), render directly */}
      {domain.skills && domain.skills.length > 0 && (
        <div className="skill-tags">
          {domain.skills.map((skill) => (
            <SkillTag key={skill} name={skill} />
          ))}
        </div>
      )}

      {/* Battle-tested references */}
      {domain.battleTested && domain.battleTested.length > 0 && (
        <div className="skill-battle-tested">
          battle-tested: <span>{domain.battleTested.join(' / ')}</span>
        </div>
      )}
    </div>
  )
}
```

Key design decisions:
- The card renders both subcategorized domains (like "LLM & AI" with Fine-Tuning, Model Optimization) and flat domains (like "LLM Frameworks" with a direct skills array)
- `battleTested` references are shown as subtle annotations below the skills, matching the UX spec: "battleTested references shown as subtle annotations below each skill"
- The card starts at `opacity: 0` (via CSS) and is revealed by the parent GSAP timeline
- `ref` is attached for GSAP targeting from the parent

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/skill/SkillTag.tsx frontend/src/components/skill/SkillDomainCard.tsx
git commit -m "feat(skill): add SkillTag and SkillDomainCard components"
```

---

## Task 4: Build SkillsView with GSAP Progressive Animation

**Time estimate:** 5 min

**Files:**
- Create: `frontend/src/pages/skill/SkillsView.tsx`

This is the default view for SKILL.md -- the GSAP progressive skill animation where domains appear one at a time and skills within each domain "materialize" like token generation.

- [ ] **Step 1: Create SkillsView with GSAP timeline**

Create `frontend/src/pages/skill/SkillsView.tsx`:

```typescript
import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { fetchSkills } from '../../lib/api'
import SkillDomainCard from '../../components/skill/SkillDomainCard'

export default function SkillsView() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: domains, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  })

  // GSAP progressive animation
  useGSAP(() => {
    if (!domains || !containerRef.current) return

    const cards = containerRef.current.querySelectorAll('.skill-domain-card')
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

    // Phase 1: Domain cards appear one at a time with staggered timing
    tl.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.15,
    })

    // Phase 2: Within each card, skill tags "materialize" like token generation
    cards.forEach((card, i) => {
      const tags = card.querySelectorAll('.skill-tag')
      if (tags.length > 0) {
        tl.to(tags, {
          opacity: 1,
          duration: 0.2,
          stagger: 0.04,  // Fast stagger = token generation feel
        }, `-=${0.3 - i * 0.02}`)  // Overlapping with previous card for fluid feel
      }
    })
  }, { scope: containerRef, dependencies: [domains] })

  if (isLoading) {
    return (
      <div className="skill-page">
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-ink-muted)',
        }}>
          Loading skills...
        </div>
      </div>
    )
  }

  return (
    <div className="skill-page" ref={containerRef}>
      <div className="skill-domains">
        {domains?.map((domain) => (
          <SkillDomainCard key={domain.title} domain={domain} />
        ))}
      </div>
    </div>
  )
}
```

Key GSAP decisions:
- `useGSAP` from `@gsap/react` handles automatic cleanup when the component unmounts -- no manual `context.revert()` needed
- `scope: containerRef` scopes all GSAP selectors to this component (prevents leaking into other components)
- `dependencies: [domains]` re-runs the animation when data loads
- The timeline creates a two-phase reveal: first cards appear (staggered 150ms apart), then skill tags within each card materialize (staggered 40ms apart, overlapping with the next card)
- Cards start with `opacity: 0` and `y: 20` (set via CSS `opacity: 0` and GSAP `fromTo` defaults), then animate to `opacity: 1, y: 0`
- The `stagger: 0.04` on skill tags creates the "token generation" effect -- skills appear one by one very quickly, like an AI generating tokens

**Important:** The GSAP `fromTo`/`to` targets use CSS class selectors scoped by `containerRef`. The initial state (`opacity: 0`) is set via CSS in `skill.css`. GSAP animates `to` the final visible state. This way, if GSAP fails to load or `prefers-reduced-motion` is active, the CSS fallback in the `@media` query sets everything to `opacity: 1`.

- [ ] **Step 2: Verify GSAP animation plays correctly**

Run `npm run dev`. Navigate to `/files/skill`. The default view should show:
1. Domain cards appearing one at a time from top to bottom
2. Within each card, skill tags "typewriting" in from left to right
3. Battle-tested annotations visible below skills
4. Hover on any skill tag triggers prismatic color bleed
5. Animation does not play if `prefers-reduced-motion: reduce` is set in OS settings

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/skill/SkillsView.tsx
git commit -m "feat(skill): add SkillsView with GSAP progressive token-generation animation"
```

---

## Task 5: Build ExperienceBlock + ResumeView

**Time estimate:** 4-5 min

**Files:**
- Create: `frontend/src/components/skill/ExperienceBlock.tsx`
- Create: `frontend/src/pages/skill/ResumeView.tsx`

- [ ] **Step 1: Create ExperienceBlock component**

Create `frontend/src/components/skill/ExperienceBlock.tsx`:

```typescript
import type { Experience } from '../../types/index'

interface ExperienceBlockProps {
  experience: Experience
}

export default function ExperienceBlock({ experience }: ExperienceBlockProps) {
  const formatDate = (dateStr: string) => {
    // "2025-05" -> "May 2025"
    const [year, month] = dateStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const dateRange = experience.endDate
    ? `${formatDate(experience.startDate)} — ${formatDate(experience.endDate)}`
    : `${formatDate(experience.startDate)} — Present`

  return (
    <div className="experience-block">
      <div className="experience-date">{dateRange}</div>
      <div className="experience-role">{experience.role}</div>
      <div className="experience-company">
        {experience.company}, {experience.location}
      </div>
      <div className="experience-skill-assembled">
        {experience.skillAssembled}
      </div>
      {experience.highlights && experience.highlights.length > 0 && (
        <ul className="experience-highlights">
          {experience.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      {experience.note && (
        <div className="experience-note">{experience.note}</div>
      )}
    </div>
  )
}
```

Key decisions:
- The date formatting converts "2025-05" to "May 2025" for readable display
- `skillAssembled` is the narrative paragraph (matches the UX spec: "Each role as a narrative block: what skill was assembled")
- Highlights use `>` prefix (matching the file system aesthetic) via CSS `::before`
- The `note` field handles special cases like Epiminds "Team restructured"
- Framed as progression: data is expected to arrive sorted from newest to oldest (or the view sorts it)

- [ ] **Step 2: Create ResumeView**

Create `frontend/src/pages/skill/ResumeView.tsx`:

```typescript
import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { fetchExperience } from '../../lib/api'
import ExperienceBlock from '../../components/skill/ExperienceBlock'

export default function ResumeView() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: experiences, isLoading } = useQuery({
    queryKey: ['experience'],
    queryFn: fetchExperience,
  })

  // Sort by start date descending (most recent first)
  const sorted = experiences
    ? [...experiences].sort((a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
    : []

  // Staggered fade-in for experience blocks
  useGSAP(() => {
    if (!sorted.length || !containerRef.current) return

    const blocks = containerRef.current.querySelectorAll('.experience-block')
    gsap.from(blocks, {
      opacity: 0,
      x: -10,
      duration: 0.4,
      stagger: 0.12,
      ease: 'power2.out',
    })
  }, { scope: containerRef, dependencies: [sorted.length] })

  if (isLoading) {
    return (
      <div className="skill-page">
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-ink-muted)',
        }}>
          Loading experience...
        </div>
      </div>
    )
  }

  return (
    <div className="skill-page" ref={containerRef}>
      <div className="resume-timeline">
        {sorted.map((exp) => (
          <ExperienceBlock key={`${exp.company}-${exp.startDate}`} experience={exp} />
        ))}
      </div>
    </div>
  )
}
```

Key decisions:
- Experiences are sorted most-recent-first so the visitor sees the latest role at the top
- The timeline has a vertical connecting line (via `resume-timeline::before` in CSS) running down the left side
- The first entry (most recent) gets a highlighted dot (pink accent) via CSS `.experience-block:first-child::before`
- GSAP `from` animation fades blocks in with a slight leftward slide (subtle, not bouncy)
- The Note App "editor panel" style is achieved by the `.skill-page` container with appropriate padding and max-width

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/skill/ExperienceBlock.tsx frontend/src/pages/skill/ResumeView.tsx
git commit -m "feat(skill): add ResumeView with experience timeline and staggered entrance"
```

---

## Task 6: Build HackathonStats Component

**Time estimate:** 2-3 min

**Files:**
- Create: `frontend/src/components/skill/HackathonStats.tsx`

- [ ] **Step 1: Create HackathonStats that computes stats from data at render time**

Create `frontend/src/components/skill/HackathonStats.tsx`:

```typescript
import { useMemo } from 'react'
import type { Hackathon } from '../../types/index'

interface HackathonStatsProps {
  hackathons: Hackathon[]
}

export default function HackathonStats({ hackathons }: HackathonStatsProps) {
  const stats = useMemo(() => {
    const total = hackathons.length
    const wins = hackathons.filter(h =>
      h.result && (
        h.result.toLowerCase().includes('1st') ||
        h.result.toLowerCase().includes('2nd') ||
        h.result.toLowerCase().includes('3rd') ||
        h.result.toLowerCase().includes('community win')
      )
    ).length
    const countries = new Set(
      hackathons
        .filter(h => h.country)
        .map(h => h.country)
    ).size
    const cities = new Set(
      hackathons
        .filter(h => h.city)
        .map(h => h.city)
    ).size
    const soloWins = hackathons.filter(h => h.solo && h.result).length
    const domains = new Set(hackathons.map(h => h.domain)).size

    return [
      { value: total.toString(), label: 'HACKATHONS' },
      { value: wins.toString(), label: 'PODIUM FINISHES' },
      { value: countries.toString(), label: 'COUNTRIES' },
      { value: cities.toString(), label: 'CITIES' },
      { value: domains.toString(), label: 'DOMAINS' },
      { value: soloWins.toString(), label: 'SOLO WINS' },
    ]
  }, [hackathons])

  return (
    <div className="hackathon-stats-row">
      {stats.map((stat) => (
        <div key={stat.label}>
          <div className="hackathon-stat-value">{stat.value}</div>
          <div className="hackathon-stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
```

Key decisions:
- All stats are computed from the data at render time (not hardcoded) -- matching UX spec: "Stats computed from data at render time"
- Win detection uses pattern matching on the `result` field (includes 1st/2nd/3rd or community win)
- The stats grid uses `auto-fit` with `minmax(120px, 1fr)` so it wraps on narrow screens

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/skill/HackathonStats.tsx
git commit -m "feat(skill): add HackathonStats component with dynamic stat computation"
```

---

## Task 7: Build TimelineScrubber Component

**Time estimate:** 5 min

**Files:**
- Create: `frontend/src/components/skill/TimelineScrubber.tsx`

This component is inspired by the Temporal Anomaly reference -- a horizontal timeline ruler with tick marks, event markers, and a draggable/auto-playing playhead.

- [ ] **Step 1: Create TimelineScrubber**

Create `frontend/src/components/skill/TimelineScrubber.tsx`:

```typescript
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { Hackathon } from '../../types/index'

interface TimelineScrubberProps {
  hackathons: Hackathon[]
  /** Called when playhead reaches a hackathon event */
  onEventHighlight: (hackathon: Hackathon | null) => void
  /** Whether the timeline auto-plays */
  autoPlay?: boolean
}

export default function TimelineScrubber({
  hackathons,
  onEventHighlight,
  autoPlay = true,
}: TimelineScrubberProps) {
  const scrubberRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(autoPlay)

  // Parse dates and compute positions
  const { events, dateRange, ticks } = useMemo(() => {
    // Sort chronologically (oldest first)
    const sorted = [...hackathons].sort((a, b) => {
      const [aY, aM] = a.date.split('.')
      const [bY, bM] = b.date.split('.')
      return (parseInt(aY) * 12 + parseInt(aM)) - (parseInt(bY) * 12 + parseInt(bM))
    })

    if (sorted.length === 0) return { events: [], dateRange: { min: 0, max: 1 }, ticks: [] }

    const parseDate = (d: string) => {
      const [y, m] = d.split('.')
      return parseInt(y) * 12 + parseInt(m)
    }

    const minMonth = parseDate(sorted[0].date) - 1  // Pad start
    const maxMonth = parseDate(sorted[sorted.length - 1].date) + 1  // Pad end
    const range = maxMonth - minMonth

    const events = sorted.map(h => ({
      hackathon: h,
      position: (parseDate(h.date) - minMonth) / range,  // 0-1 normalized
      isWin: Boolean(h.result && (
        h.result.includes('1st') || h.result.includes('2nd') || h.result.includes('3rd')
        || h.result.includes('Community Win')
      )),
    }))

    // Generate tick marks for each month in range
    const ticks = []
    for (let m = minMonth; m <= maxMonth; m++) {
      const year = Math.floor(m / 12)
      const month = m % 12
      const isMajor = month === 0 || month === 6  // Jan and Jul are major ticks
      const isYear = month === 0
      ticks.push({
        position: (m - minMonth) / range,
        isMajor,
        label: isYear ? year.toString() : (isMajor ? `${year}.${String(month + 1).padStart(2, '0')}` : ''),
      })
    }

    return { events, dateRange: { min: minMonth, max: maxMonth }, ticks }
  }, [hackathons])

  // GSAP auto-play animation
  useGSAP(() => {
    if (!scrubberRef.current || !playheadRef.current || events.length === 0) return

    const scrubberWidth = scrubberRef.current.offsetWidth
    const tl = gsap.timeline({
      paused: !isPlaying,
      onUpdate: () => {
        // Find the event closest to the current playhead position
        if (!playheadRef.current || !scrubberRef.current) return
        const playheadX = gsap.getProperty(playheadRef.current, 'left') as number
        const progress = playheadX / scrubberWidth

        // Highlight the nearest event within a threshold
        let nearest: Hackathon | null = null
        let minDist = Infinity
        events.forEach(ev => {
          const dist = Math.abs(ev.position - progress)
          if (dist < 0.02 && dist < minDist) {
            minDist = dist
            nearest = ev.hackathon
          }
        })
        onEventHighlight(nearest)
      },
    })

    // Animate playhead from left to right, pausing briefly near each event
    let prevPos = 0
    events.forEach((ev, i) => {
      const leftPx = ev.position * scrubberWidth
      const duration = (ev.position - prevPos) * 8  // Total ~8s for full timeline
      tl.to(playheadRef.current, {
        left: leftPx,
        duration: Math.max(duration, 0.1),
        ease: 'none',
      })
      tl.to({}, { duration: 0.3 })  // Brief pause at each event
      prevPos = ev.position
    })

    // Animate to end
    tl.to(playheadRef.current, {
      left: scrubberWidth,
      duration: (1 - prevPos) * 8,
      ease: 'none',
    })

    tlRef.current = tl
  }, { scope: scrubberRef, dependencies: [events, isPlaying] })

  // Manual scrubbing via click/drag
  const handleScrub = useCallback((clientX: number) => {
    if (!scrubberRef.current || !playheadRef.current) return
    const rect = scrubberRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const progress = x / rect.width

    // Pause auto-play when user scrubs
    if (tlRef.current) tlRef.current.pause()
    setIsPlaying(false)

    gsap.set(playheadRef.current, { left: x })

    // Find nearest event
    let nearest: Hackathon | null = null
    let minDist = Infinity
    events.forEach(ev => {
      const dist = Math.abs(ev.position - progress)
      if (dist < 0.03 && dist < minDist) {
        minDist = dist
        nearest = ev.hackathon
      }
    })
    onEventHighlight(nearest)
  }, [events, onEventHighlight])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    handleScrub(e.clientX)
  }, [handleScrub])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => handleScrub(e.clientX)
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleScrub])

  return (
    <div
      ref={scrubberRef}
      className="timeline-scrubber"
      onMouseDown={handleMouseDown}
      data-interactive
    >
      {/* Tick marks */}
      <div className="timeline-ruler">
        {ticks.map((tick, i) => (
          <div key={i}>
            <div
              className={`timeline-tick ${tick.isMajor ? 'major' : 'minor'}`}
              style={{ left: `${tick.position * 100}%` }}
            />
            {tick.label && (
              <div
                className="timeline-tick-label"
                style={{ left: `${tick.position * 100}%` }}
              >
                {tick.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Event markers */}
      {events.map((ev, i) => (
        <div
          key={i}
          className={`timeline-event-marker ${ev.isWin ? 'win' : ''}`}
          style={{ left: `${ev.position * 100}%` }}
          title={`${ev.hackathon.name} — ${ev.hackathon.projectName}`}
        />
      ))}

      {/* Playhead */}
      <div ref={playheadRef} className="timeline-playhead" style={{ left: 0 }} />
    </div>
  )
}
```

Key design decisions:
- The scrubber auto-plays by default, animating the playhead across the timeline via GSAP. The playhead pauses briefly at each hackathon event
- Users can click or drag to scrub manually, which pauses auto-play
- Event markers are colored: `--color-win` (green) for podium finishes, `--color-ink-muted` for others
- The playhead is a vertical line with a circle top, colored `--color-highlight` (pink)
- `onEventHighlight` callback tells the parent which hackathon the playhead is near (for map pin highlighting)
- Temporal Anomaly reference: tick marks at top/bottom, major/minor divisions, dynamic timecode-like positioning
- When `prefers-reduced-motion` is active, the playhead starts at the end (no animation) and only responds to manual scrub

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/skill/TimelineScrubber.tsx
git commit -m "feat(skill): add TimelineScrubber with GSAP auto-play and manual scrubbing"
```

---

## Task 8: Build HackathonMap + HackathonPin Components

**Time estimate:** 5 min

**Files:**
- Create: `frontend/src/components/skill/HackathonMap.tsx`
- Create: `frontend/src/components/skill/HackathonPin.tsx`

- [ ] **Step 1: Create HackathonPin (popup content)**

Create `frontend/src/components/skill/HackathonPin.tsx`:

```typescript
import type { Hackathon } from '../../types/index'

interface HackathonPinProps {
  hackathon: Hackathon
}

export default function HackathonPin({ hackathon }: HackathonPinProps) {
  return (
    <div className="map-popup">
      <div className="map-popup-name">{hackathon.name}</div>
      <div className="map-popup-project">{hackathon.projectName}</div>
      <div className="map-popup-date">
        {hackathon.date} {hackathon.city && `/ ${hackathon.city}`}
      </div>
      {hackathon.result && (
        <div className="map-popup-result">{hackathon.result}</div>
      )}
    </div>
  )
}
```

Note: This component renders HTML content that will be injected into the Mapbox popup. Since Mapbox popups accept raw HTML strings, we will render this component to a string using `renderToStaticMarkup` from `react-dom/server` (or build the HTML manually). See the HackathonMap component for the integration approach.

- [ ] **Step 2: Create HackathonMap with Mapbox GL**

Create `frontend/src/components/skill/HackathonMap.tsx`:

```typescript
import { useRef, useEffect, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Hackathon } from '../../types/index'

interface HackathonMapProps {
  hackathons: Hackathon[]
  /** The currently highlighted hackathon (from timeline scrubber) */
  highlightedHackathon: Hackathon | null
}

export default function HackathonMap({ hackathons, highlightedHackathon }: HackathonMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  // Filter to only in-person hackathons with coordinates
  const inPerson = hackathons.filter(h => h.coordinates && !h.isRemote)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',  // Dark theme matches portfolio
      center: [10, 50],    // Center on Europe
      zoom: 3.5,
      attributionControl: false,
      interactive: true,
    })

    // Disable scroll zoom to prevent conflicts with page scroll
    map.scrollZoom.disable()

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Add markers when data is available
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Wait for map to load
    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()

      // Group hackathons by location (multiple events at same coordinates)
      const byLocation = new Map<string, Hackathon[]>()
      inPerson.forEach(h => {
        if (!h.coordinates) return
        const key = h.coordinates.join(',')
        if (!byLocation.has(key)) byLocation.set(key, [])
        byLocation.get(key)!.push(h)
      })

      byLocation.forEach((events, key) => {
        const [lng, lat] = key.split(',').map(Number)
        // For the coordinates stored as [lat, lng], swap if needed
        // The hackathons.json stores as [lat, lng] based on the data
        const coords = events[0].coordinates!

        const hasWin = events.some(e => e.result &&
          (e.result.includes('1st') || e.result.includes('2nd') || e.result.includes('3rd'))
        )

        // Create custom marker element
        const el = document.createElement('div')
        el.style.width = '12px'
        el.style.height = '12px'
        el.style.borderRadius = '50%'
        el.style.border = '2px solid'
        el.style.borderColor = hasWin ? 'var(--color-win)' : 'var(--color-ink-muted)'
        el.style.background = hasWin ? 'var(--color-win)' : 'var(--color-surface-0)'
        el.style.cursor = 'none'
        el.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease'
        el.dataset.interactive = 'true'

        // Show count if multiple events at same location
        if (events.length > 1) {
          el.style.width = '18px'
          el.style.height = '18px'
          el.style.display = 'flex'
          el.style.alignItems = 'center'
          el.style.justifyContent = 'center'
          el.style.fontSize = '0.55rem'
          el.style.fontFamily = 'var(--font-mono)'
          el.style.color = hasWin ? 'var(--color-void)' : 'var(--color-ink)'
          el.textContent = events.length.toString()
        }

        // Build popup HTML
        const popupHTML = events.map(h => `
          <div class="map-popup" style="margin-bottom: 8px;">
            <div class="map-popup-name">${h.name}</div>
            <div class="map-popup-project">${h.projectName}</div>
            <div class="map-popup-date">${h.date}</div>
            ${h.result ? `<div class="map-popup-result">${h.result}</div>` : ''}
          </div>
        `).join('')

        const popup = new mapboxgl.Popup({
          offset: 15,
          closeButton: false,
          maxWidth: '240px',
        }).setHTML(popupHTML)

        // Note: coordinates in the JSON are [lat, lng] but Mapbox expects [lng, lat]
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([coords[1], coords[0]])
          .setPopup(popup)
          .addTo(map)

        // Store marker with a key based on hackathon names for highlighting
        events.forEach(h => {
          markersRef.current.set(h.name, marker)
        })
      })
    }

    if (map.isStyleLoaded()) {
      addMarkers()
    } else {
      map.on('load', addMarkers)
    }
  }, [inPerson])

  // Highlight marker when timeline scrubber points to a hackathon
  useEffect(() => {
    if (!highlightedHackathon) {
      // Reset all markers
      markersRef.current.forEach(m => {
        const el = m.getElement()
        el.style.transform = ''
        el.style.boxShadow = ''
      })
      if (popupRef.current) popupRef.current.remove()
      return
    }

    const marker = markersRef.current.get(highlightedHackathon.name)
    if (marker && mapRef.current) {
      // Pulse the highlighted marker
      const el = marker.getElement()
      el.style.transform = 'scale(1.8)'
      el.style.boxShadow = '0 0 12px rgba(255, 107, 157, 0.6)'

      // Open its popup
      marker.togglePopup()
      popupRef.current = marker.getPopup()

      // Fly to the location
      if (highlightedHackathon.coordinates) {
        mapRef.current.flyTo({
          center: [highlightedHackathon.coordinates[1], highlightedHackathon.coordinates[0]],
          zoom: 5,
          duration: 1000,
        })
      }
    }
  }, [highlightedHackathon])

  return (
    <div ref={mapContainer} className="hackathon-map-container" />
  )
}
```

Key design decisions:
- Mapbox dark-v11 style matches the portfolio's dark aesthetic
- Map is centered on Europe at zoom 3.5 (shows Europe + eastern US for MIT)
- Markers are custom DOM elements styled with CSS variables (not default Mapbox pins)
- Locations with multiple hackathons show a count badge
- Win locations get green markers (`--color-win`), others get muted markers
- When the timeline scrubber highlights a hackathon, the map flies to that location and pulses the marker
- `scrollZoom.disable()` prevents accidental scroll hijacking
- Coordinates in `hackathons.json` are stored as `[lat, lng]` but Mapbox expects `[lng, lat]` -- the component swaps them

**Important coordinate note:** The `hackathons.json` stores coordinates as `[latitude, longitude]` (e.g., `[48.86, 2.35]` for Paris). Mapbox GL expects `[longitude, latitude]`. The component must swap: `[coords[1], coords[0]]`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/skill/HackathonPin.tsx frontend/src/components/skill/HackathonMap.tsx
git commit -m "feat(skill): add HackathonMap with Mapbox GL pins and timeline-linked highlighting"
```

---

## Task 9: Build HackathonsView (Composition)

**Time estimate:** 4-5 min

**Files:**
- Create: `frontend/src/pages/skill/HackathonsView.tsx`

This view composes the stats, map, timeline scrubber, and remote hackathons sidebar into a single view.

- [ ] **Step 1: Create HackathonsView**

Create `frontend/src/pages/skill/HackathonsView.tsx`:

```typescript
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchHackathons } from '../../lib/api'
import HackathonStats from '../../components/skill/HackathonStats'
import HackathonMap from '../../components/skill/HackathonMap'
import TimelineScrubber from '../../components/skill/TimelineScrubber'
import type { Hackathon } from '../../types/index'

export default function HackathonsView() {
  const [highlightedHackathon, setHighlightedHackathon] = useState<Hackathon | null>(null)

  const { data: hackathons, isLoading } = useQuery({
    queryKey: ['hackathons'],
    queryFn: fetchHackathons,
  })

  const remoteHackathons = useMemo(() =>
    hackathons?.filter(h => h.isRemote) || [],
    [hackathons]
  )

  const inPersonHackathons = useMemo(() =>
    hackathons?.filter(h => !h.isRemote && h.coordinates) || [],
    [hackathons]
  )

  if (isLoading || !hackathons) {
    return (
      <div className="skill-page">
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-ink-muted)',
        }}>
          Loading hackathons...
        </div>
      </div>
    )
  }

  return (
    <div className="skill-page">
      <div className="hackathons-view">
        {/* Stats row */}
        <HackathonStats hackathons={hackathons} />

        {/* Map + Remote sidebar layout */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          {/* Map (takes most of the width) */}
          <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
            <HackathonMap
              hackathons={inPersonHackathons}
              highlightedHackathon={highlightedHackathon}
            />
          </div>

          {/* Remote hackathons sidebar */}
          <div style={{ flex: '1 1 30%', minWidth: '200px' }}>
            <div className="hackathon-remote-sidebar">
              <div className="hackathon-remote-title">REMOTE</div>
              {remoteHackathons.map((h) => (
                <div key={h.name} className="hackathon-remote-item">
                  <div className="hackathon-remote-name">{h.projectName}</div>
                  <div className="hackathon-remote-meta">
                    {h.name} / {h.date}
                  </div>
                  {h.result && (
                    <div className="hackathon-remote-result">{h.result}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline scrubber */}
        <TimelineScrubber
          hackathons={hackathons}
          onEventHighlight={setHighlightedHackathon}
          autoPlay={true}
        />

        {/* Currently highlighted hackathon detail (below scrubber) */}
        {highlightedHackathon && (
          <div style={{
            padding: 'var(--space-sm)',
            background: 'var(--color-surface-0)',
            borderRadius: 'var(--radius-none)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-xs)',
          }}>
            <div>
              <span style={{ color: 'var(--color-ink)' }}>{highlightedHackathon.name}</span>
              <span style={{ color: 'var(--color-ink-faint)', margin: '0 8px' }}>/</span>
              <span style={{ color: 'var(--color-ink-muted)' }}>{highlightedHackathon.projectName}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-ink-faint)' }}>{highlightedHackathon.date}</span>
              {highlightedHackathon.result && (
                <span style={{ color: 'var(--color-win)', fontWeight: 600 }}>
                  {highlightedHackathon.result}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

Key design decisions:
- The layout is: stats row at top, map + remote sidebar in the middle (flex row, responsive), timeline scrubber at bottom, detail bar below scrubber
- `highlightedHackathon` state is shared between `TimelineScrubber` (sets it) and `HackathonMap` (reacts to it)
- Remote hackathons appear in a sidebar panel next to the map (per UX spec: "Remote hackathons in a 'REMOTE' section alongside map")
- The detail bar below the scrubber shows the currently highlighted hackathon's name, project, date, and result -- visible as the timeline plays
- The flex layout wraps on mobile so the remote sidebar stacks below the map

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/skill/HackathonsView.tsx
git commit -m "feat(skill): add HackathonsView composing stats, map, timeline, and remote sidebar"
```

---

## Task 10: Build CertificationsView

**Time estimate:** 3 min

**Files:**
- Create: `frontend/src/pages/skill/CertificationsView.tsx`

- [ ] **Step 1: Create CertificationsView with static data**

Create `frontend/src/pages/skill/CertificationsView.tsx`:

```typescript
export default function CertificationsView() {
  return (
    <div className="skill-page">
      <div className="certifications-view">
        {/* Education */}
        <section>
          <div className="cert-section-title">EDUCATION</div>
          <div style={{ position: 'relative' }}>
            {/* Vertical connecting line */}
            <div style={{
              position: 'absolute',
              left: '11px',
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'var(--color-grid)',
            }} />

            <div className="cert-entry">
              <div className="cert-degree">M.S. Computer Science (2nd Year)</div>
              <div className="cert-institution">Universite Paris Dauphine - PSL</div>
              <div className="cert-date">Sept 2023 — Oct 2024</div>
            </div>

            <div className="cert-entry">
              <div className="cert-degree">M.S. Computer Science (1st Year)</div>
              <div className="cert-institution">Universite Paris-Saclay</div>
              <div className="cert-date">Sept 2022 — Aug 2023</div>
            </div>

            <div className="cert-entry">
              <div className="cert-degree">B.S. Computer Science</div>
              <div className="cert-institution">Universite Toulouse 1 Capitole</div>
              <div className="cert-date">Sept 2019 — Aug 2022</div>
            </div>
          </div>
        </section>

        {/* Awards / Olympiad */}
        <section>
          <div className="cert-section-title">AWARDS</div>
          <div className="cert-item">
            <div>
              <div className="cert-item-name">National Chemistry Olympiad of China</div>
              <div className="cert-item-issuer">National Second Prize, Top 5% / Nov 2017</div>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section>
          <div className="cert-section-title">CERTIFICATIONS</div>
          <div className="cert-item">
            <div>
              <div className="cert-item-name">Machine Learning in Production</div>
              <div className="cert-item-issuer">Coursera</div>
            </div>
          </div>
          <div className="cert-item">
            <div>
              <div className="cert-item-name">Certificate of Excellence in AI Agents</div>
              <div className="cert-item-issuer">Hugging Face</div>
            </div>
          </div>
        </section>

        {/* Languages */}
        <section>
          <div className="cert-section-title">LANGUAGES</div>
          <div className="cert-item">
            <div>
              <div className="cert-item-name">Chinese</div>
              <div className="cert-item-issuer">Native</div>
            </div>
          </div>
          <div className="cert-item">
            <div>
              <div className="cert-item-name">French</div>
              <div className="cert-item-issuer">DALF C2</div>
            </div>
          </div>
          <div className="cert-item">
            <div>
              <div className="cert-item-name">English</div>
              <div className="cert-item-issuer">IELTS 7.0</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
```

Key decisions:
- All data is hardcoded (static, from profile doc) -- this is personal credential data that doesn't change frequently
- Education uses the same timeline pattern as the resume (vertical line + dots) for visual consistency
- Sections are separated with labeled headers (Education, Awards, Certifications, Languages)
- The page has no API calls and no loading state -- it renders immediately
- Languages are included here as they are part of the "credentials" picture

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/skill/CertificationsView.tsx
git commit -m "feat(skill): add CertificationsView with education, awards, certs, and languages"
```

---

## Task 11: Wire Routes + SkillPage Shell

**Time estimate:** 3-4 min

**Files:**
- Modify or create: `frontend/src/pages/SkillPage.tsx` (the shell that renders sub-views)
- Modify: `frontend/src/App.tsx` (add nested routes under `/files/skill`)

- [ ] **Step 1: Create/Modify SkillPage.tsx as a layout route**

Replace the Phase 2 placeholder `SkillPage.tsx` (or create it) with **exactly** this content — nothing else:

```typescript
import { Outlet } from 'react-router-dom'

export default function SkillPage() {
  return <Outlet />
}
```

`SkillPage` is a **layout route component**. It renders no UI of its own — the sidebar is already provided by the Phase 2 `FileSystemLayout`. Its sole job is to act as a nested `<Outlet />` so React Router can render the matched child view (SkillsView, ResumeView, HackathonsView, or CertificationsView).

- [ ] **Step 2: Replace the flat `skill` route in App.tsx with a nested layout route**

Phase 2 originally wired the `skill` branch as a flat route via `TabRouter`. That must be replaced with a proper nested layout route so that `SkillPage` acts as a parent with children.

In `frontend/src/App.tsx`, find the existing `skill` route (e.g. `{ path: 'skill', element: <SkillPage /> }`) and **replace it** with:

```typescript
import SkillPage from './pages/SkillPage'
import SkillsView from './pages/skill/SkillsView'
import ResumeView from './pages/skill/ResumeView'
import HackathonsView from './pages/skill/HackathonsView'
import CertificationsView from './pages/skill/CertificationsView'

// Inside the route tree, under the file system layout, replace the flat skill route with:
{
  path: 'skill',
  element: <SkillPage />,
  children: [
    { index: true, element: <SkillsView /> },
    { path: 'resume', element: <ResumeView /> },
    { path: 'hackathons', element: <HackathonsView /> },
    { path: 'certifications', element: <CertificationsView /> },
  ],
}
```

This is the **complete** replacement for the `skill` branch. Do NOT keep the old flat route alongside it. The `index: true` child renders `SkillsView` when the user navigates to `/files/skill` (the default view).

- [ ] **Step 3: Verify sidebar integration**

The Phase 2 sidebar config (`sidebarConfig.ts`) already defines these items:

```typescript
sidebarItems: [
  { id: 'skills', label: 'SKILLS', preview: 'Arsenal overview — all domains', routeSegment: '' },
  { id: 'resume', label: 'RESUME', preview: 'Experience timeline', routeSegment: 'resume' },
  { id: 'hackathons', label: 'HACKATHONS', preview: 'Map + timeline animation', routeSegment: 'hackathons' },
  { id: 'certifications', label: 'CERTIFICATIONS', preview: 'Education + certs', routeSegment: 'certifications' },
],
```

Verify that clicking each sidebar item navigates to the correct view and the sidebar highlights the active item. The breadcrumb should show `~/agent/SKILL.md/RESUME`, etc.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SkillPage.tsx frontend/src/App.tsx
git commit -m "feat(skill): wire SKILL.md sub-routes for skills, resume, hackathons, certifications"
```

---

## Task 12: Mapbox CSS Import + Dark Theme Overrides

**Time estimate:** 2 min

**Files:**
- Modify: `frontend/src/index.css` (or `skill.css`)

- [ ] **Step 1: Import Mapbox GL CSS**

Mapbox GL requires its CSS to be imported for the map to render correctly. Add to `frontend/src/index.css`:

```css
@import "mapbox-gl/dist/mapbox-gl.css";
```

Place it near the top, before the local stylesheets.

- [ ] **Step 2: Override Mapbox popup styles**

Add to `frontend/src/styles/skill.css` to override Mapbox's default popup styling to match the portfolio aesthetic:

```css
/* Mapbox popup overrides */
.mapboxgl-popup-content {
  background: var(--color-surface-0) !important;
  color: var(--color-ink) !important;
  border-radius: var(--radius-none) !important;
  box-shadow: var(--shadow-md) !important;
  padding: 0 !important;
  border: 1px solid var(--color-grid);
}

.mapboxgl-popup-tip {
  border-top-color: var(--color-surface-0) !important;
  border-bottom-color: var(--color-surface-0) !important;
}

.mapboxgl-ctrl-group {
  background: var(--color-surface-0) !important;
  border-radius: var(--radius-none) !important;
  border: 1px solid var(--color-grid) !important;
}

.mapboxgl-ctrl-group button {
  background-color: transparent !important;
  border-bottom-color: var(--color-grid) !important;
}

.mapboxgl-ctrl-group button:hover {
  background-color: var(--color-surface-1) !important;
}

.mapboxgl-ctrl-group button .mapboxgl-ctrl-icon {
  filter: invert(1);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css frontend/src/styles/skill.css
git commit -m "feat(skill): import Mapbox CSS and override popup styles for dark theme"
```

---

## Task 13: End-to-End Verification + Polish

**Time estimate:** 3-5 min

**Files:** Multiple (minor tweaks as needed)

- [ ] **Step 1: Test SKILLS default view**

Navigate to `/files/skill`. Verify:
- Domain cards appear one at a time with stagger
- Skill tags "materialize" within each card like token generation
- Battle-tested annotations visible
- Hover on any skill tag shows prismatic color bleed
- Page fades in from blur on entry

- [ ] **Step 2: Test RESUME view**

Click "RESUME" in the sidebar. Verify:
- Experience timeline renders with vertical connecting line
- Most recent role (Epiminds) appears at top
- Each block shows date range, role, company, skillAssembled narrative, highlights
- Epiminds shows "Team restructured" note
- Sidebar highlights RESUME as active

- [ ] **Step 3: Test HACKATHONS view**

Click "HACKATHONS" in the sidebar. Verify:
- Stats row shows dynamically computed numbers (24 hackathons, correct wins, etc.)
- Mapbox map renders centered on Europe
- Map pins appear at correct locations (Paris, London, Berlin, Helsinki, Stockholm, Cambridge, Versailles)
- Paris pin shows a count badge (many hackathons there)
- Win-location pins are green
- Remote hackathons appear in the sidebar panel next to the map
- Timeline scrubber auto-plays: playhead moves across the ruler
- When playhead reaches an event, the map flies to that location and the pin pulses
- Clicking/dragging the scrubber pauses auto-play and allows manual scrubbing
- Detail bar below scrubber shows currently highlighted hackathon

- [ ] **Step 4: Test CERTIFICATIONS view**

Click "CERTIFICATIONS" in the sidebar. Verify:
- Education timeline shows 3 entries (Dauphine, Saclay, Toulouse)
- Chemistry Olympiad award visible
- ML in Production and HuggingFace AI Agents certificates listed
- Languages section shows Chinese (Native), French (DALF C2), English (IELTS 7.0)

- [ ] **Step 5: Test navigation flow**

- Tab navigation: clicking SKILL.md tab navigates to skills default view
- Sidebar: clicking each note-item navigates to the correct sub-view
- Breadcrumb: shows correct path (e.g., `~/agent/SKILL.md/HACKATHONS`)
- Back/forward browser buttons work correctly
- Direct URL access works (e.g., entering `/files/skill/resume` directly)

- [ ] **Step 6: Test accessibility + reduced motion**

- Enable `prefers-reduced-motion` in OS/browser settings
- GSAP animations should not play (skill cards and tags should be immediately visible)
- Page fade-in should be instant
- Map should still be interactive (no animation concern)
- Timeline scrubber should still be manually scrubbable

- [ ] **Step 7: Polish pass — fix any spacing, typography, or color issues**

Check against the design principles:
- All static elements have `border-radius: 0px` (cards, panels, map container, scrubber)
- Non-clickable tags have `border-radius: 2px`
- Map pins (interactive) have `border-radius: 50%`
- Space Mono used for all labels, dates, and data values
- Inter used for narrative text (skillAssembled, descriptions)
- Colors match: `--color-win` for wins, `--color-highlight` for active states, `--color-ink-muted` for secondary text
- No corporate energy, no bouncing, no terminal cliches

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat(skill): polish SKILL.md page — verify all views, navigation, and animations"
```

---

## Verification Checklist (Phase 5 Complete When...)

### SKILLS (Default View)
- [ ] Navigating to `/files/skill` renders the skills domain cards
- [ ] GSAP timeline plays: cards stagger in, then skill tags materialize within each card
- [ ] All 10 skill domains from `/api/skills` are rendered (LLM & AI, LLM Frameworks, AI Providers, Data & Viz, ML Frameworks, Databases, Cloud, DevOps, Backend, Frontend)
- [ ] Domains with subcategories (LLM & AI, Data & Viz, Cloud) show grouped skills under subcategory labels
- [ ] Domains with flat skills (LLM Frameworks, AI Providers, etc.) render skill tags directly
- [ ] `battleTested` annotations visible below skills in each card
- [ ] Hover on skill tag triggers prismatic color bleed (CSS `::before` gradient)
- [ ] Skill tag hover also changes border color to `--color-ink`
- [ ] Cards have `border-radius: 0px` and `box-shadow: var(--shadow-card)`

### RESUME
- [ ] Navigating to `/files/skill/resume` renders the experience timeline
- [ ] 6 experience entries rendered (Epiminds, Mozart, Misogi, SocGen, Smart Gadget, CITIC)
- [ ] Entries sorted most-recent-first (Epiminds at top)
- [ ] Vertical connecting line runs along left side
- [ ] First entry dot is highlighted pink (`--color-highlight`)
- [ ] Each entry shows: date range, role, company+location, skillAssembled narrative, highlights with `>` prefix
- [ ] Epiminds entry shows "Team restructured" note in italic faint text
- [ ] GSAP staggered entrance plays on page load

### HACKATHONS
- [ ] Navigating to `/files/skill/hackathons` renders the hackathon view
- [ ] Stats row shows correct computed values (24 total, correct podium count, correct country/city/domain counts)
- [ ] Mapbox map renders in dark theme centered on Europe
- [ ] Map pins appear at correct geographic locations
- [ ] Paris cluster shows count badge (many events)
- [ ] Win-location pins are green (`--color-win`), others are muted
- [ ] Clicking a pin shows popup with hackathon name, project, date, result
- [ ] Remote hackathons sidebar shows: Mistral Online, Pond Speedrun, AMD Hackathon, ShipItSunday, GeoAI Hack, Mistral AI MCP
- [ ] Remote hackathons with results (Pond Speedrun 1st, AMD Finalist) show green result text
- [ ] Timeline scrubber renders with tick marks and event markers
- [ ] Auto-play works: playhead moves from 2024.11 to 2026.03
- [ ] When playhead reaches an event, map flies to location and pin pulses
- [ ] Clicking/dragging scrubber pauses auto-play and allows manual control
- [ ] Detail bar below scrubber shows currently highlighted hackathon info
- [ ] Map scroll zoom is disabled (prevents scroll hijack)

### CERTIFICATIONS
- [ ] Navigating to `/files/skill/certifications` renders education + certs
- [ ] 3 education entries (Dauphine, Saclay, Toulouse) with timeline dots
- [ ] Chemistry Olympiad entry in Awards section
- [ ] 2 certification entries (Coursera ML, HuggingFace AI Agents)
- [ ] 3 language entries (Chinese, French, English) with proficiency levels

### Navigation + Integration
- [ ] SKILL.md tab is active in tab navigation when on any skill sub-route
- [ ] Sidebar shows 4 note-items: SKILLS, RESUME, HACKATHONS, CERTIFICATIONS
- [ ] Active sidebar item highlights correctly with pink left border
- [ ] Breadcrumb shows correct path for each view
- [ ] Browser back/forward navigation works between sub-views
- [ ] Direct URL access works for all sub-routes

### Design System Compliance
- [ ] All static elements have `border-radius: 0px`
- [ ] Non-clickable skill tags have `border-radius: 2px`
- [ ] Interactive elements (map pins) have appropriate rounded radius
- [ ] Space Mono used for all labels, dates, data values, section titles
- [ ] Inter used for narrative text (skillAssembled, descriptions)
- [ ] `data-interactive` attribute on all hoverable elements (skill tags, map pins)
- [ ] `cursor: none` on interactive elements (custom cursor is global)
- [ ] `prefers-reduced-motion` respected: no GSAP animations, no page fade-in
- [ ] No anti-patterns: no corporate energy, no bouncing animations, no terminal cliches
