# Portfolio Website — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Yongkang's portfolio site as a Go + React monorepo with architectural file-system aesthetic, prismatic iridescent color accents, and data-driven content.

**Architecture:** Go backend serves JSON data via REST API. React/TS SPA consumes API, renders pages with Three.js 3D scenes, COORDINATE-style grid layout, and glassmorphism effects. Content lives in JSON files — no database initially.

**Tech Stack:** Go (chi router), React 19, Vite, Tailwind CSS, Three.js, @react-three/fiber, GSAP, Mapbox GL JS, TanStack Query, React Router v7

---

## Phase Overview

| Phase | Name | Description | Depends On |
|-------|------|-------------|------------|
| 1 | **Foundation** | Go backend + React scaffold + theme + grid layout + routing + data files | None |
| 2 | **Landing Page** | Three.js point cloud + blur-reveal + hero + scroll-to-grid transition | Phase 1 |
| 3 | **About Page** | Skills grid + trajectory blocks + music section | Phase 1 |
| 4 | **Projects Page** | Ticket-style cards + filters + detail view + glassmorphism | Phase 1 |
| 5 | **Hackathon Map & Timeline** | Mapbox map + GSAP timeline animation + data ribbons | Phase 3 |
| 6 | **Contact + Polish** | Contact form + responsive + performance + deploy | Phase 1 |

**Phases 2, 3, 4 can run in parallel after Phase 1 completes.**
**Phase 5 depends on Phase 3 (it's a section within the About page).**
**Phase 6 runs last.**

---

## Phase 1: Foundation

See: `2026-04-03-phase1-foundation.md`

## Phase 2-6: TBD

Written after Phase 1 is implemented and validated. Each phase gets its own plan document.
