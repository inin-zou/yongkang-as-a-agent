# UI Implementation Design

## Design References & How They Map to Pages

### Reference 1: LUMO Studios → Landing Page
**What to reuse:**
- 3D point cloud (Three.js) rendered in prismatic/iridescent colors on grey background
- Blur-reveal interaction: `backdrop-filter: blur()` with radial mask following cursor position
- Noise/grain overlay via SVG filter
- Fluid cursor animation (dot + outline with crosshair)
- Typography: large hero text with fade-in from blur animation
- Scroll indicator at bottom

**What to adapt:**
- Color palette: warm cream/orange → grey + prismatic iridescent
- Font: Inter for narrative/body text, Space Mono for data/labels (Playfair Display from LUMO is not carried over — too ornamental for the grid aesthetic)
- Point cloud model: human bust PCD → abstract particle formation or custom shape

### Reference 2: COORDINATE → Core Layout System (All Pages)
**What to reuse:**
- Grid background layer with configurable cell size (CSS `background-image` linear gradients)
- X/Y rulers with tick marks and labels (spreadsheet-style)
- Corner piece (black square at ruler intersection)
- Content cards with white background, subtle grid overlay, drop shadow
- Active cell indicator following cursor (snapping to grid)
- Coordinates display in bottom corner (current grid position)
- Pixel-art brush strokes as decorative elements scattered on the canvas

**What to adapt:**
- Color: black ink → dark grey (#2A2A2A), grid lines use the grey palette
- Navigation: fixed nav cards → tab system (from Note App reference)
- Project table grid: reuse the structured row layout for project listings

### Reference 3: Temporal Anomaly → Hackathon Timeline Animation
**What to reuse:**
- Timeline ruler with major/minor tick marks at top and bottom
- Flowing data ribbons (Three.js line geometry with animated vertex positions)
- Particle system with additive blending (rising from data points)
- Dynamic timecode display
- Warning/highlight indicators for special events (wins)

**What to adapt:**
- Color: red/purple/cyan → prismatic spectrum on grey
- Context: generic timeline → hackathon dates mapped to real events
- Add: geographic map layer underneath the timeline
- Ribbon intensity corresponds to hackathon activity density

### Reference 4: Symmetry Breaking Pass → Project Cards
**What to reuse:**
- Split layout: visual zone (left) + data zone (right)
- WebGL halftone shader for visual zone background
- Space Mono typography for all data labels
- Data grid layout: label > value pairs
- Texture divider (repeated character pattern)
- Footer block with ID and status

**What to adapt:**
- Context: event ticket → project card
- Data fields: TYPE → category, DATE → project date, VENUE → tech stack, ACT → key features
- Color: dark grey bg → adapt to prismatic card variants by category

### Reference 5: Abyssal Telemetry → Skills Visualization (Optional Enhancement)
**What to reuse:**
- Isometric 3D wireframe rendering with bloom post-processing
- Animated data line graph (for skill depth/usage visualization)
- Floating text labels in 3D space
- Grid helper as ground plane

**What to adapt:**
- This is an optional enhancement for the Arsenal section
- Could render skill domains as 3D wireframe objects in isometric view
- Each object's size/complexity reflects depth in that domain

### Reference 6: Note App → Navigation System & Content Layout
**What to reuse:**
- Tab system with layered tab shapes (active tab connects to body)
- Sidebar + main content split for project detail pages
- Note list items: meta (date) + title + preview pattern
- Clean scrollbar styling
- Section header with icon button pattern

**What to adapt:**
- Tabs: Notes/Projects/Archive → About/Projects/Contact
- Color: warm cream (#EAEAE6) → grey palette
- The sidebar pattern works for projects list → project detail view

### Reference 7: Vortex Portfolio → Photo Gallery (Music/About Section)
**What to reuse:**
- 3D cylinder/tube arrangement of image cards (Three.js)
- Scroll-to-rotate + drag interaction
- Wireframe spiral connecting cards
- Click-to-expand modal with image + data split
- Auto-rotation when idle
- Category color-coded borders on cards

**What to adapt:**
- Context: general portfolio → hackathon photos + music/personal photos
- Color borders: type colors → prismatic accent per category
- Modal: adapt to show photo context (event name, date, location)

## Reusable Elements Inventory (Cross-Reference Extraction)

Concrete elements extracted from all 7 references that we carry into the portfolio:

### From LUMO Studios
| Element | CSS/JS Technique | Where Used |
|---------|-----------------|------------|
| 3D point cloud | Three.js `Points` + `PointsMaterial` with custom colors | Landing hero |
| Blur-reveal layer | `backdrop-filter: blur(20px)` + CSS `mask-image: radial-gradient()` following `--x`, `--y` vars | Landing page |
| Noise/grain overlay | SVG `<feTurbulence>` filter as background-image, `mix-blend-mode: overlay`, `opacity: 0.15` | Global (all pages) |
| Custom cursor (dot + outline) | Two fixed divs, dot follows mouse instantly, outline follows with easing (`lerp`), crosshair via `::before`/`::after` pseudo-elements | Global |
| Fade-from-blur entrance | `@keyframes fadeInSlow { from { opacity:0; filter:blur(10px) } to { opacity:1; filter:blur(0) } }` | Hero text, section entrances |

### From COORDINATE
| Element | CSS/JS Technique | Where Used |
|---------|-----------------|------------|
| Grid background | `background-image: linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, ...)` with `background-size: var(--cell-size)` | Global layout |
| X ruler (horizontal) | Fixed top bar, child `<span>` elements each `width: var(--cell-size)`, labels generated via JS (A, B, C... or numbers) | All pages (top) |
| Y ruler (vertical) | Fixed left bar, child `<span>` elements each `height: var(--cell-size)`, numbered | All pages (left) |
| Corner piece | Fixed `div`, `width: 30px; height: 20px; background: var(--ink-color)` at top-left | All pages |
| Content cards | `background: white; border: 1px solid var(--grid-line); box-shadow: 10px 10px 0px rgba(0,0,0,0.05)` + inner grid overlay via `::after` pseudo-element | About sections, project cards |
| Active cell indicator | Fixed div snapping to grid: `transform: translate(${x * cellSize + offset}px, ${y * cellSize + offset}px)` on mousemove | Global (desktop only) |
| Coordinates display | Fixed bottom-right, mono font, shows `X: {col} | Y: {row}` | Global |
| Pixel-art brushstrokes | Absolutely positioned `div` clusters (`width/height: var(--cell-size); background: var(--ink-color)`) placed procedurally | Decorative, scattered |

### From Temporal Anomaly
| Element | CSS/JS Technique | Where Used |
|---------|-----------------|------------|
| Timeline ruler | Three.js `LineSegments` with tick geometry, or pure CSS with absolute-positioned tick marks | Hackathon timeline |
| Data ribbons | Three.js `Line` with animated `BufferGeometry` positions updated per frame via sine/noise functions | Hackathon timeline background |
| Particle rise | Three.js `Points` with custom `ShaderMaterial` (vertex shader moves particles upward based on lifetime) | Hackathon timeline accent |
| Dynamic timecode | Text updated per frame showing current date position | Timeline scrubber label |

### From Symmetry Breaking Pass
| Element | CSS/JS Technique | Where Used |
|---------|-----------------|------------|
| Split card layout | `flex-direction: row` — visual zone (50%) + data zone (50%), `border-right` divider | Project cards |
| Data grid | `display: grid; grid-template-columns: 70px 20px 1fr` with `.col-label`, `.col-sep (>)`, `.col-value` | Project card data side |
| Texture divider | `white-space: nowrap; overflow: hidden; letter-spacing: 1px; opacity: 0.2` — repeated `L` or `|` chars | Section separators |
| Footer block | `border-top`, mono font, flex row with ID + status | Project card footer |
| Halftone shader (Enhancement) | WebGL fragment shader with simplex noise controlling dot radius per grid cell | Project card visual zone (v2) |

### From Note App
| Element | CSS/JS Technique | Where Used |
|---------|-----------------|------------|
| Tab system | `clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%)` for trapezoid shape, `.active` tab gets higher z-index + connected background | Main navigation |
| Sidebar list | `width: 320px; border-right: 1px solid; overflow-y: auto` with items: meta + title + preview | Project list view |
| List item pattern | `.note-item` with `border-left: 3px solid transparent` → active gets solid left border + subtle bg | Project list items |
| Scrollbar styling | `::-webkit-scrollbar { width: 6px }`, thumb `#CCC`, track transparent | Global |

### From Vortex Portfolio (Enhancement — v2)
| Element | CSS/JS Technique | Where Used |
|---------|-----------------|------------|
| 3D card tube | Three.js `PlaneGeometry` cards positioned via `cos/sin` spiral, `lookAt` center | Photo gallery (v2) |
| Click-to-expand modal | Two-panel modal: image left + data right, GSAP scale + opacity animation | Photo/project detail |
| Color-coded borders | `MeshBasicMaterial` border mesh behind card mesh | Category indicators |

## Color System Implementation

### CSS Custom Properties (Theme Tokens)

```css
:root {
  /* Achromatic base */
  --color-void: #1a1a1a;         /* Deepest background */
  --color-surface-0: #2A2A2A;    /* Primary surface (cards bg in dark mode) */
  --color-surface-1: #3a3a3a;    /* Elevated surface */
  --color-surface-2: #4a4a4a;    /* Higher elevation */
  --color-grid: #333333;         /* Grid lines */
  --color-grid-major: #444444;   /* Major grid lines / ruler ticks */
  --color-ink: #E8E4DC;          /* Primary text (warm off-white) */
  --color-ink-muted: #8a8a8a;    /* Secondary text */
  --color-ink-faint: #555555;    /* Tertiary / disabled */

  /* Prismatic accent spectrum */
  --color-prism-pink: #ff6b9d;
  --color-prism-coral: #ff8a65;
  --color-prism-teal: #4dd0e1;
  --color-prism-mint: #69f0ae;
  --color-prism-lavender: #b388ff;

  /* Functional */
  --color-win: #69f0ae;          /* Hackathon win indicator */
  --color-highlight: #ff6b9d;    /* Active/selected state */

  /* Grid system */
  --cell-size: 20px;
  --ruler-x-height: 20px;
  --ruler-y-width: 30px;

  /* Frosted glass */
  --glass-bg: rgba(42, 42, 42, 0.6);
  --glass-blur: 20px;
  --glass-border: rgba(255, 255, 255, 0.08);

  /* Border radius scale — sharp default, round = interactive */
  --radius-none: 0px;            /* Default for all static elements */
  --radius-subtle: 2px;          /* Non-interactive glass panels, static tags */
  --radius-sm: 6px;              /* Secondary buttons, inputs, tooltips */
  --radius-md: 8px;              /* Primary buttons, modals, interactive cards */
  --radius-lg: 12px;             /* Clickable pills / filter tags */
  --radius-full: 9999px;         /* Fully rounded pills */
  --radius-circle: 50%;          /* Avatars */

  /* Shadows — Apple-style soft and diffused */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-card: 10px 10px 0px rgba(0, 0, 0, 0.05);  /* COORDINATE-style offset */

  /* Spacing — generous Apple-style whitespace */
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 32px;
  --space-xl: 48px;
  --space-2xl: 64px;
  --space-section: 96px;         /* Between major page sections */
}
```

### Iridescent / Prismatic Gradient Implementation

The prismatic effect is NOT a single gradient — it's a **shifting multi-stop gradient** that creates the light-splitting-through-prism look.

#### Technique 1: CSS `conic-gradient` (static iridescence)
```css
.prismatic-accent {
  background: conic-gradient(
    from 180deg,
    var(--color-prism-pink),
    var(--color-prism-coral),
    var(--color-prism-teal),
    var(--color-prism-mint),
    var(--color-prism-lavender),
    var(--color-prism-pink)
  );
  opacity: 0.6;
  filter: blur(40px);  /* Soft, diffused — not sharp rainbow */
}
```

#### Technique 2: Animated CSS gradient (hover/interaction iridescence)
```css
.prismatic-hover {
  background: linear-gradient(
    var(--prism-angle, 135deg),
    transparent 0%,
    rgba(255, 107, 157, 0.15) 20%,
    rgba(77, 208, 225, 0.15) 40%,
    rgba(105, 240, 174, 0.1) 60%,
    rgba(179, 136, 255, 0.15) 80%,
    transparent 100%
  );
  transition: --prism-angle 0.6s ease, opacity 0.3s ease;
  opacity: 0;
}

.element:hover .prismatic-hover {
  opacity: 1;
  --prism-angle: 225deg; /* Rotates the gradient on hover */
}
```
Note: `--prism-angle` animation requires `@property` registration:
```css
@property --prism-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 135deg;
}
```

#### Technique 3: Three.js shader (point cloud / 3D iridescence)
```glsl
// Fragment shader for prismatic particles
varying vec3 vPosition;
uniform float uTime;

void main() {
  // Map position to spectral color
  float t = sin(vPosition.x * 0.5 + uTime * 0.3) * 0.5 + 0.5;

  // Spectral color ramp: pink → coral → teal → mint → lavender
  vec3 pink = vec3(1.0, 0.42, 0.62);
  vec3 coral = vec3(1.0, 0.54, 0.40);
  vec3 teal = vec3(0.30, 0.82, 0.88);
  vec3 mint = vec3(0.41, 0.94, 0.68);
  vec3 lavender = vec3(0.70, 0.53, 1.0);

  vec3 color = mix(pink, coral, smoothstep(0.0, 0.25, t));
  color = mix(color, teal, smoothstep(0.25, 0.5, t));
  color = mix(color, mint, smoothstep(0.5, 0.75, t));
  color = mix(color, lavender, smoothstep(0.75, 1.0, t));

  gl_FragColor = vec4(color, 0.8);
}
```

#### When to use each technique:
| Context | Technique | Why |
|---------|-----------|-----|
| Background glow / ambient accent | CSS `conic-gradient` + heavy blur | Performant, no JS needed |
| Hover states / interaction feedback | CSS animated gradient with `@property` | Smooth, GPU-accelerated |
| Landing point cloud / 3D elements | GLSL shader | Full control over per-particle color |
| Skill grid hover highlights | CSS animated gradient | Simple, per-element |

## Frosted Glass (Glassmorphism) System

Reference: 雾霾玻璃 — the plant photography layout where sharp HD photos sit behind frosted panels.

### The Display Logic

```
┌──────────────────────────────────────────┐
│  LAYER 0: Full HD photo (sharp, crisp)   │  ← position: absolute; object-fit: cover
│                                          │
│  ┌────────────────────┐                  │
│  │  LAYER 1: Frosted  │                  │  ← backdrop-filter: blur(20px)
│  │  glass panel       │                  │     background: rgba(42,42,42,0.6)
│  │                    │                  │     border: 1px solid rgba(255,255,255,0.08)
│  │  TEXT / DATA HERE  │                  │  ← LAYER 2: Content (sharp, readable)
│  │                    │                  │
│  └────────────────────┘                  │
│                                          │
│        Sharp photo visible in gaps       │  ← Full resolution, not blurred
│                                          │
└──────────────────────────────────────────┘
```

**Key principle:** The photo itself is NEVER blurred. Only the `backdrop-filter` on the glass panel blurs what's *behind* it. Gaps between panels show the sharp photo. This creates a push-pull depth effect — clarity vs mystery.

### CSS Implementation

```css
/* The container holding the sharp photo */
.photo-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

/* Full HD photo — always sharp */
.photo-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* NO blur on the image itself */
}

/* Frosted glass panel overlaid on the photo */
.glass-panel {
  position: absolute;
  backdrop-filter: blur(var(--glass-blur, 20px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 20px));
  background: var(--glass-bg);             /* Semi-transparent */
  border: 1px solid var(--glass-border);   /* Subtle edge */
  border-radius: 8px;
  padding: 16px 20px;

  /* Optional: subtle inner shadow for depth */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Text on glass — must be high contrast */
.glass-panel .label {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-ink);
  opacity: 0.8;
}

.glass-panel .value {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: var(--color-ink);
}
```

### Usage Patterns Across the Portfolio

| Where | Photo Layer | Glass Panel Content |
|-------|------------|-------------------|
| **Project cards** | Project screenshot/thumbnail (sharp) | Title, tags, date, result — frosted panel at bottom or side |
| **Hackathon map pins (expanded)** | Hackathon event photo | Event name, date, result, domain tag |
| **Photo gallery modal** | Full-res photo (Vortex click-to-expand) | Photo context: event name, date, location |
| **Music section** | Artist/performance photo | Artist name, genre, status, platform links |
| **About hero** | Atmospheric personal photo or cityscape | Name, role, tagline |

### Blur Levels by Context

| Context | `--glass-blur` | `--glass-bg` alpha | Reasoning |
|---------|---------------|-------------------|-----------|
| Over busy photo (many details) | `24px` | `0.7` | Heavier blur for readability |
| Over simple/dark photo | `12px` | `0.4` | Lighter — let photo texture show through |
| Interactive hover (reveal) | `0px → 20px` | `0 → 0.6` | Animate: sharp photo blurs under panel on hover |
| Landing blur-reveal | `20px → 0px` | Full → 0 | Inverse: content starts blurred, cursor reveals sharp |

### Performance Notes

- `backdrop-filter` is GPU-accelerated in modern browsers
- Avoid stacking more than 2-3 glass panels (compositing cost)
- On mobile, reduce blur radius to `12px` and increase `--glass-bg` alpha for readability
- Fallback for unsupported browsers: solid `--glass-bg` without blur (graceful degradation)
- Test on Safari specifically — `-webkit-backdrop-filter` prefix still required

### Interaction: Frosted → Sharp Reveal

For photos that deserve to be seen in full clarity (hackathon wins, key moments):

```css
/* Default: glass panel covers photo */
.reveal-card .glass-panel {
  transition: backdrop-filter 0.4s ease, background 0.4s ease;
}

/* Hover: glass clears, photo becomes fully sharp */
.reveal-card:hover .glass-panel {
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  background: rgba(0, 0, 0, 0.1);  /* Very light overlay, sharp photo shows */
}

/* Text fades down on reveal so photo is the focus */
.reveal-card:hover .glass-panel .label,
.reveal-card:hover .glass-panel .value {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}
```

This creates the "declassification" moment — hover reveals the sharp truth behind the frosted surface.

## Component Architecture

### Global Components
- `GridBackground` — configurable grid with rulers, coordinates display
- `CrosshairCursor` — custom cursor snapping to grid cells
- `TabNavigation` — file-system drawer tabs
- `ContentCard` — white card on grid with inner grid overlay + shadow
- `NoiseOverlay` — SVG-based grain texture
- `PrismaticAccent` — reusable iridescent color effect (CSS gradient or WebGL)

### Landing Components
- `PointCloudScene` — Three.js particle system with prismatic colors
- `BlurRevealLayer` — backdrop-filter blur with cursor-following mask
- `HeroText` — animated name + tagline with blur→sharp entrance
- `ScrollTransition` — morphs atmospheric void into grid layout

### About Components
- `SkillGrid` — structured domain grid with hover-activated prismatic color
- `HackathonMap` — interactive map of Europe with animated pins
- `TimelineScrubber` — playable timeline ruler (Temporal Anomaly-inspired)
- `TrajectoryBlock` — narrative work experience cards
- `MusicSection` — artist bio + platform links (external embeds, no self-hosted audio in v1)
- `PhotoVortex` — 3D rotating gallery (Vortex-inspired)

### Project Components
- `ProjectFilter` — category tab bar
- `ProjectCard` — Symmetry Breaking ticket-style card
- `ProjectDetail` — sidebar list + main content split
- `HalftoneShader` — WebGL shader for card visual backgrounds

### Contact Components
- `ContactForm` — name, email, message with file-system styled inputs
- `SocialLinks` — GitHub, LinkedIn, email with grid-aligned layout

## MVP vs Enhancement (Three.js Scope)

| Feature | Priority | Notes |
|---------|----------|-------|
| Point cloud landing (LUMO) | **MVP** | Core first impression |
| Blur-reveal cursor interaction | **MVP** | Signature interaction |
| Grid background + rulers (COORDINATE) | **MVP** | Core layout system |
| Hackathon map + timeline (Mapbox + GSAP) | **MVP** | Key differentiating section |
| Project cards (Symmetry Breaking) | **MVP** | But halftone shader is Enhancement — use CSS fallback for v1 |
| 3D photo vortex gallery | **Enhancement** | Use flat grid gallery for v1, add vortex later |
| Isometric wireframe skills viz | **Enhancement** | Use styled HTML grid for v1 |
| Halftone WebGL shader on cards | **Enhancement** | CSS gradient/pattern fallback for v1 |

## Key Libraries / Dependencies

| Purpose | Library |
|---------|---------|
| 3D rendering | Three.js |
| 3D post-processing | Three.js EffectComposer + UnrealBloomPass |
| Animation | GSAP (GreenSock) |
| Map | Mapbox GL JS |
| Fonts | Google Fonts (Space Mono, Inter or similar sans-serif) |
| Icons | Lucide React |

## Animation Principles

- **Entrance:** Content fades in from blur (not slide, not bounce)
- **Transitions:** Dissolve/blur between states
- **Hover:** Grey → prismatic iridescence (color shift, not scale change)
- **Scroll:** Parallax depth on grid layers, content reveals progressively
- **Idle:** Subtle particle drift, auto-rotation on 3D elements
- **Performance:** All WebGL effects respect `prefers-reduced-motion`
