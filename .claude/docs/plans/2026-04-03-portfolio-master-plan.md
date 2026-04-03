# Portfolio Website — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Yongkang's portfolio as a Go + React monorepo. Landing page with Temporal Anomaly ribbons + Symmetry Breaking ticket. Inner pages use Note App file system (.md tabs). Supabase for auth, blog, feedback, and music storage.

**Architecture:** Go backend serves static JSON data + proxies Supabase for dynamic content. React/TS SPA with Three.js, GSAP, Mapbox.

**Tech Stack:** Go (chi), React 19, Vite, Tailwind, Three.js, GSAP, Mapbox GL JS, Supabase (Auth + DB + Storage), TanStack Query

---

## Phase Overview

| Phase | Name | Description | Status |
|-------|------|-------------|--------|
| 1 | **Foundation** | Go backend + React scaffold + theme + grid + routing + data | DONE |
| 2 | **File System Shell** | Refactor to Note App layout with .md tabs, sidebar + panel | TODO |
| 3 | **Landing Page** | Temporal Anomaly ribbons (prismatic) + Symmetry Breaking ticket + transition | TODO |
| 4 | **SOUL.md + CONTACT.md** | Brief intro page + contact form | TODO |
| 5 | **SKILL.md** | GSAP progressive animation + resume + hackathon map + certs | TODO |
| 6 | **Supabase Integration** | Auth, blog posts table, feedback table, music storage | TODO |
| 7 | **MEMORY.md** | Blog system + admin upload + visitor feedback | TODO |
| 8 | **MUSIC.md** | Music player + audio visualizer ribbons + track storage | TODO |
| 9 | **Polish + Deploy** | Responsive, glassmorphism, performance, Vercel + Fly.io + domain | TODO |

**Dependencies:**
- Phase 2 depends on Phase 1 (done)
- Phase 3 depends on Phase 2 (needs the transition target)
- Phases 4, 5 can run in parallel after Phase 2
- Phase 6 is independent (infra setup)
- Phases 7, 8 depend on Phase 2 + Phase 6
- Phase 9 runs last

**Parallelizable after Phase 2:**
- Phase 3 (landing) + Phase 4 (soul/contact) + Phase 5 (skills) + Phase 6 (supabase) can all run concurrently

---

## Phase 1: Foundation — COMPLETED

See: `2026-04-03-phase1-foundation.md`

Backend: Go API serving all static data (projects, hackathons, experience, skills, music artist info)
Frontend: React SPA with grid layout, rulers, cursor, tab navigation, 4 pages with live API data

## Phases 2-9: Detailed plans written per-phase before execution
