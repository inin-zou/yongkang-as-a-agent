# Phase 3: Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder landing page with a cinematic entry experience: Temporal Anomaly data ribbons in prismatic iridescent colors as the Three.js background, a Symmetry Breaking ticket/pass overlaid as the entry point, and a transition animation that morphs the scene into the file system shell.

**Architecture:** The landing page is a full-viewport Three.js canvas (orthographic camera, no orbit controls) rendering animated data ribbons + particles. A DOM-based ticket component is absolutely positioned over the canvas, styled after the Symmetry Breaking pass with split visual/data zones. On "ACCESS FILE SYSTEM" click, GSAP orchestrates the converge-and-morph transition. The Three.js scene is self-contained — it mounts on landing, unmounts on route change, and respects `prefers-reduced-motion`. The existing `NoiseOverlay` component already renders globally and covers the landing page.

**Tech Stack:** Three.js (BufferGeometry, Line, Points, ShaderMaterial), GSAP (timeline, morphing), React 19, TypeScript

**Reference docs:**
- `.claude/docs/UX-design.md` — Section 1: landing page spec, ticket content, transition description
- `.claude/docs/UI-implement-design.md` — Temporal Anomaly reusable elements, Symmetry Breaking elements, color tokens, iridescent GLSL shader (Technique 3), noise overlay
- `.claude/docs/portfolio-design-principles.md` — prismatic palette, edge shape system (8px for interactive buttons), typography (Space Mono for data, Inter for narrative)
- `.claude/design-refs/3-temporal-anomaly.html` — exact Three.js ribbon implementation (Line + BufferGeometry, sine/noise vertex animation, particle ShaderMaterial with lifetime attribute, orthographic camera, additive blending)
- `.claude/design-refs/4-symmetry-breaking.html` — exact ticket layout (split flex row, data grid with `grid-template-columns: 70px 20px 1fr`, halftone WebGL shader with simplex noise, texture divider, footer block)

---

## File Structure (Phase 3)

```
frontend/src/
├── components/
│   └── landing/
│       ├── RibbonScene.tsx          # Three.js canvas: data ribbons + particles
│       ├── shaders/
│       │   ├── ribbonVertex.glsl    # (optional — inline is fine for lines)
│       │   ├── particleVertex.glsl  # Particle vertex shader (position + lifetime)
│       │   └── particleFragment.glsl # Particle fragment shader (glow + prismatic color)
│       ├── TicketPass.tsx           # Symmetry Breaking ticket overlay (DOM)
│       ├── TicketPass.css           # Ticket styles (Space Mono, data grid, texture divider)
│       ├── HalftoneCanvas.tsx       # WebGL halftone shader for ticket visual zone
│       └── LandingTransition.ts     # GSAP timeline for exit transition
├── pages/
│   └── Landing.tsx                  # Orchestrates RibbonScene + TicketPass + transition
```

---

## Task 1: Three.js Ribbon Scene — Canvas + Camera + Ribbon Geometry

**Files:**
- Create: `frontend/src/components/landing/RibbonScene.tsx`

**Time estimate:** 5 min

- [ ] **Step 1: Create the RibbonScene component skeleton**

Create `frontend/src/components/landing/RibbonScene.tsx`:
- Accepts props: `{ onReady?: () => void; reducedMotion: boolean; ribbonGroupRef?: React.MutableRefObject<THREE.Group | null> }`
- Uses a `<canvas ref={canvasRef}>` element, not `renderer.domElement` appended to DOM (React-friendly)
- Canvas is `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0`
- On mount: create `THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })`, `THREE.OrthographicCamera`, `THREE.Scene`
- Scene background: `new THREE.Color(0x1a1a1a)` (matches `--color-void`)
- Orthographic frustum size: 12 (same as reference). Compute aspect from `window.innerWidth / window.innerHeight`
- Camera positioned at z=10
- Store renderer/scene/camera in refs (not state — no re-renders)
- Handle resize: update camera frustum + renderer size via `ResizeObserver` or window `resize` event
- Clean up on unmount: dispose all geometries, materials, renderer. Remove resize listener.

- [ ] **Step 2: Build the ribbon layer factory**

Inside `RibbonScene.tsx`, implement a `buildRibbonLayer` function (modeled directly on the Temporal Anomaly reference):

```typescript
function buildRibbonLayer(
  color: THREE.Color,
  numLines: number,
  freqScale: number,
  ampScale: number,
  opacity: number
): THREE.Line[] {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const lines: THREE.Line[] = []
  const pointsPerLine = 400
  for (let i = 0; i < numLines; i++) {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(pointsPerLine * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.Line(geo, material)
    line.userData = {
      index: i,
      points: pointsPerLine,
      phaseOffset: (i / numLines) * Math.PI * 2,
      freqJitter: 1.0 + (i / numLines) * 0.05 * freqScale,
      amp: ampScale,
    }
    lines.push(line)
  }
  return lines
}
```

- [ ] **Step 3: Create prismatic ribbon layers**

Instead of the reference's red/purple/cyan palette, create ribbon layers using the prismatic spectrum:

```typescript
// Prismatic palette from theme.css
const PRISM = {
  pink: new THREE.Color(0xff6b9d),
  coral: new THREE.Color(0xff8a65),
  teal: new THREE.Color(0x4dd0e1),
  mint: new THREE.Color(0x69f0ae),
  lavender: new THREE.Color(0xb388ff),
}

// Core ribbons — denser, tighter amplitude (pink + coral blend)
const ribbonsCore = buildRibbonLayer(PRISM.pink, 60, 1.0, 2.2, 0.10)
const ribbonsCoral = buildRibbonLayer(PRISM.coral, 40, 1.2, 2.0, 0.08)

// Shell ribbons — wider, more dispersed (teal + mint + lavender)
const ribbonsTeal = buildRibbonLayer(PRISM.teal, 50, 1.5, 3.0, 0.10)
const ribbonsMint = buildRibbonLayer(PRISM.mint, 30, 1.3, 2.8, 0.07)
const ribbonsLavender = buildRibbonLayer(PRISM.lavender, 40, 1.4, 3.2, 0.09)
```

Total: ~220 lines (reference uses 180). Adjust counts down if performance is an issue on mobile. Add all lines to a `THREE.Group` named `ribbonGroup` and add to scene.

Expose the `ribbonGroup` via the `ribbonGroupRef` prop so the transition (Task 5) can manipulate it.

- [ ] **Step 4: Implement the ribbon animation loop**

The animation loop updates vertex positions per frame. Port directly from the reference's `updateRibbons` function:

```typescript
function updateRibbons(
  lines: THREE.Line[],
  baseFreq: number,
  envFreq: number,
  speed: number,
  elapsed: number
) {
  for (const line of lines) {
    const pos = (line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    const d = line.userData
    for (let j = 0; j < d.points; j++) {
      const x = (j / d.points) * 40 - 20
      const envelope = Math.sin(x * envFreq + elapsed * 0.2) * d.amp
      const carrierFreq = baseFreq * d.freqJitter
      let y = envelope * Math.sin(x * carrierFreq + d.phaseOffset + elapsed * speed)
      // Anomaly distortion near center
      const distToCenter = Math.abs(x + 2.0)
      if (distToCenter < 4.0) {
        const severity = 1.0 - distToCenter / 4.0
        const noise = Math.sin(x * 15.0 + elapsed * 10.0) * severity * 0.8
        y += noise
      }
      pos[j * 3] = x
      pos[j * 3 + 1] = y
      pos[j * 3 + 2] = Math.cos(x + elapsed) * 0.5
    }
    line.geometry.attributes.position.needsUpdate = true
  }
}
```

In the `requestAnimationFrame` loop:
- Call `updateRibbons` for each prismatic layer with slightly different frequency/speed params to create color separation effect
- If `reducedMotion` is true: set `speed` to 0 and render only once (static ribbons, no animation loop)

- [ ] **Step 5: Verify ribbons render**

Temporarily mount `<RibbonScene reducedMotion={false} />` in `Landing.tsx` and confirm:
- Prismatic ribbons animate across the viewport
- Colors are visibly pink/coral/teal/mint/lavender (not the reference's red/purple/cyan)
- Performance is smooth (target 60fps on desktop, 30fps acceptable on mobile)

- [ ] **Step 6: Commit**

```
git add frontend/src/components/landing/RibbonScene.tsx
git commit -m "feat(landing): Three.js ribbon scene with prismatic iridescent data ribbons"
```

---

## Task 2: Particle System

**Files:**
- Modify: `frontend/src/components/landing/RibbonScene.tsx`

**Time estimate:** 4 min

- [ ] **Step 1: Add particle geometry + prismatic shader material**

Port the particle system from the Temporal Anomaly reference, but replace the single-color fragment shader with the prismatic spectral ramp from `UI-implement-design.md` (Technique 3 — GLSL shader):

```typescript
const particleCount = 2000
const particleGeo = new THREE.BufferGeometry()
const particlePositions = new Float32Array(particleCount * 3)
const particleLifetimes = new Float32Array(particleCount)

for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 40
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2 - 2
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 2
  particleLifetimes[i] = Math.random()
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
particleGeo.setAttribute('lifetime', new THREE.BufferAttribute(particleLifetimes, 1))
```

- [ ] **Step 2: Write the prismatic particle shaders**

Vertex shader (same structure as reference — particles rise near center):

```glsl
attribute float lifetime;
varying float vAlpha;
varying vec3 vPosition;
uniform float uTime;

void main() {
  vec3 pos = position;
  float centerDist = abs(pos.x);
  float rise = fract(lifetime + uTime * 0.1) * 6.0;
  if (centerDist < 4.0) {
    pos.y += rise * (1.0 - centerDist / 4.0);
  }
  vAlpha = sin(fract(lifetime + uTime * 0.1) * 3.14159);
  vAlpha *= smoothstep(8.0, 0.0, centerDist);
  vPosition = pos;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 2.0 * (10.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
```

Fragment shader (prismatic color based on position, from `UI-implement-design.md` Technique 3):

```glsl
varying float vAlpha;
varying vec3 vPosition;
uniform float uTime;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float glow = smoothstep(0.5, 0.0, dist);

  // Prismatic spectral ramp
  float t = sin(vPosition.x * 0.5 + uTime * 0.3) * 0.5 + 0.5;
  vec3 pink = vec3(1.0, 0.42, 0.62);
  vec3 coral = vec3(1.0, 0.54, 0.40);
  vec3 teal = vec3(0.30, 0.82, 0.88);
  vec3 mint = vec3(0.41, 0.94, 0.68);
  vec3 lavender = vec3(0.70, 0.53, 1.0);

  vec3 color = mix(pink, coral, smoothstep(0.0, 0.25, t));
  color = mix(color, teal, smoothstep(0.25, 0.5, t));
  color = mix(color, mint, smoothstep(0.5, 0.75, t));
  color = mix(color, lavender, smoothstep(0.75, 1.0, t));

  gl_FragColor = vec4(color, vAlpha * glow * 0.8);
}
```

Create `ShaderMaterial` with these shaders, `transparent: true`, `blending: THREE.AdditiveBlending`, `depthWrite: false`.

- [ ] **Step 3: Add particle Points to scene and update in animation loop**

```typescript
const particleMaterial = new THREE.ShaderMaterial({ /* as above */ })
const pointCloud = new THREE.Points(particleGeo, particleMaterial)
scene.add(pointCloud)

// In animation loop:
particleMaterial.uniforms.uTime.value = elapsed
```

If `reducedMotion`: freeze `uTime` at 0 (particles visible but static).

- [ ] **Step 4: Mobile optimization**

Reduce particle count on mobile:
```typescript
const isMobile = window.innerWidth < 768
const particleCount = isMobile ? 500 : 2000
```

Also reduce ribbon line counts on mobile:
- Core ribbons: 60 -> 20
- Other layers: halve each count
- Reduce `pointsPerLine` from 400 to 200

Wrap this in a helper: `function getPerformanceConfig(): { particleCount, ribbonCounts, pointsPerLine }`.

- [ ] **Step 5: Commit**

```
git add frontend/src/components/landing/RibbonScene.tsx
git commit -m "feat(landing): prismatic particle system with spectral GLSL shader"
```

---

## Task 3: Symmetry Breaking Ticket — DOM Component

**Files:**
- Create: `frontend/src/components/landing/TicketPass.tsx`
- Create: `frontend/src/components/landing/TicketPass.css`

**Time estimate:** 5 min

- [ ] **Step 1: Create the TicketPass component**

Create `frontend/src/components/landing/TicketPass.tsx`. This is a DOM component overlaid on the Three.js canvas. Structure directly mirrors the Symmetry Breaking reference:

```tsx
interface TicketPassProps {
  onAccessClick: () => void
  ticketRef: React.RefObject<HTMLDivElement>
}

export default function TicketPass({ onAccessClick, ticketRef }: TicketPassProps) {
  return (
    <div className="ticket-wrapper" ref={ticketRef}>
      {/* Left: Visual zone */}
      <div className="visual-zone">
        <HalftoneCanvas />
        <div className="visual-overlay-text">
          <span>A G E N T</span>
          <span style={{ paddingLeft: '1.5rem' }}>D O S S I E R</span>
        </div>
      </div>

      {/* Right: Data zone */}
      <div className="data-zone">
        <div className="data-grid">
          <span className="col-label">AGENT</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">YONGKANG ZOU</span>

          <span className="col-label">CODENAME</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">inhibitor</span>

          <span className="col-label">BASE</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">PARIS, FR</span>

          <span className="col-label">CLEARANCE</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">ALL DOMAINS</span>
        </div>

        <div className="texture-divider">
          LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
        </div>

        <div className="data-grid">
          <span className="col-label">MISSIONS</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">24</span>

          <span className="col-label">WINS</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">9</span>

          <span className="col-label">SPEED</span>
          <span className="col-sep">&gt;</span>
          <span className="col-value">0 → DEMO &lt; 20H</span>
        </div>

        <div className="ticket-footer">
          <button
            className="access-btn"
            onClick={onAccessClick}
            data-interactive
          >
            ACCESS FILE SYSTEM
          </button>
          <div className="footer-meta">
            <span>ID: 0029384-A</span>
            <span>CLASSIFIED</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TicketPass.css**

Create `frontend/src/components/landing/TicketPass.css`. Port styles directly from the Symmetry Breaking reference, adapting:

```css
.ticket-wrapper {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  width: 800px;
  max-width: 90vw;
  height: 380px;
  background-color: var(--color-surface-0);
  display: flex;
  flex-direction: row;
  overflow: hidden;
  border-radius: 0px; /* Static container — sharp corners */
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8);
}

.visual-zone {
  flex: 1 1 50%;
  position: relative;
  overflow: hidden;
  border-right: 1px solid rgba(232, 228, 220, 0.1);
}

.visual-overlay-text {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  line-height: 1.4;
  letter-spacing: 2px;
  color: var(--color-ink);
  opacity: 0.8;
  pointer-events: none;
  z-index: 10;
}

.visual-overlay-text span {
  display: block;
}

.data-zone {
  flex: 1 1 50%;
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.2;
  background-color: var(--color-surface-0);
  color: var(--color-ink);
}

.data-grid {
  display: grid;
  grid-template-columns: 80px 20px 1fr;
  row-gap: 6px;
}

.col-label {
  opacity: 0.6;
  text-transform: uppercase;
}

.col-sep {
  opacity: 0.4;
}

.col-value {
  opacity: 0.9;
}

.texture-divider {
  white-space: nowrap;
  overflow: hidden;
  line-height: 1;
  margin: 1.2rem 0;
  letter-spacing: 1px;
  opacity: 0.2;
  font-size: 0.7rem;
  color: var(--color-ink);
}

.ticket-footer {
  margin-top: auto;
  border-top: 1px solid rgba(232, 228, 220, 0.15);
  padding-top: 1rem;
}

.access-btn {
  width: 100%;
  padding: 0.8rem 1.5rem;
  background: transparent;
  border: 1px solid var(--color-ink);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border-radius: var(--radius-md); /* 8px — interactive element */
  cursor: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.access-btn:hover {
  background: var(--color-ink);
  color: var(--color-void);
}

.footer-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 0.8rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  opacity: 0.4;
}

/* Mobile: ticket goes full width, stacks vertically */
@media (max-width: 768px) {
  .ticket-wrapper {
    flex-direction: column;
    width: 100vw;
    height: auto;
    max-height: 90vh;
    top: auto;
    bottom: 0;
    transform: translate(-50%, 0);
    border-radius: 0;
  }

  .visual-zone {
    height: 180px;
    flex: none;
    border-right: none;
    border-bottom: 1px solid rgba(232, 228, 220, 0.1);
  }

  .data-zone {
    flex: 1;
    padding: 1.5rem 1rem 1rem 1rem;
  }

  .data-grid {
    grid-template-columns: 70px 16px 1fr;
    font-size: 0.7rem;
  }
}
```

- [ ] **Step 3: Entrance animation with GSAP**

Add a GSAP entrance animation that plays when the ticket mounts. The ticket should fade in from blur (matching the design principles: "Entrance: Content fades in from blur, not slide, not bounce"):

```typescript
// Inside TicketPass.tsx useEffect on mount:
import gsap from 'gsap'

useEffect(() => {
  if (!ticketRef.current) return
  gsap.fromTo(
    ticketRef.current,
    { opacity: 0, filter: 'blur(10px)' },
    { opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out', delay: 0.5 }
  )
}, [])
```

If `prefers-reduced-motion` is active: skip the animation, render at full opacity immediately.

- [ ] **Step 4: Commit**

```
git add frontend/src/components/landing/TicketPass.tsx frontend/src/components/landing/TicketPass.css
git commit -m "feat(landing): Symmetry Breaking ticket pass with agent credentials and data grid"
```

---

## Task 4: Halftone Shader — Ticket Visual Zone

**Files:**
- Create: `frontend/src/components/landing/HalftoneCanvas.tsx`

**Time estimate:** 4 min

- [ ] **Step 1: Create the HalftoneCanvas component**

Create `frontend/src/components/landing/HalftoneCanvas.tsx`. This is a small WebGL canvas that fills the visual zone of the ticket. Port directly from the Symmetry Breaking reference's fragment shader:

```tsx
export default function HalftoneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false })
    if (!gl) return

    // Resize canvas to parent
    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Shaders — use the exact Symmetry Breaking halftone shader
    // but tint the dot color with a prismatic shift
    // ... (compile, link, create program, set up full-screen quad)

    let animId: number
    function render(time: number) {
      time *= 0.001
      // ... (set uniforms, draw)
      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}
```

- [ ] **Step 2: Adapt the halftone fragment shader for prismatic tint**

The reference shader uses a single off-white dot color (`vec3(0.91, 0.89, 0.86)`). Modify it to add a subtle prismatic color shift based on position:

```glsl
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

// (simplex noise function — copy from reference)

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;

  float scale = 60.0;
  vec2 gridUv = st * scale;
  vec2 id = floor(gridUv);
  vec2 fractUv = fract(gridUv) - 0.5;

  float t = u_time * 0.15;
  float n1 = snoise(id * 0.08 + vec2(t, t * 0.3));
  float finalNoise = n1 * 0.5 + 0.5;
  float targetRadius = smoothstep(0.3, 0.7, finalNoise) * 0.42;
  float dist = length(fractUv);
  float edge = 0.06;
  float dotAlpha = 1.0 - smoothstep(targetRadius - edge, targetRadius + edge, dist);

  // Prismatic tint based on grid position
  float prismT = sin(st.x * 3.0 + u_time * 0.2) * 0.5 + 0.5;
  vec3 pink = vec3(1.0, 0.42, 0.62);
  vec3 teal = vec3(0.30, 0.82, 0.88);
  vec3 lavender = vec3(0.70, 0.53, 1.0);
  vec3 dotColor = mix(pink, teal, smoothstep(0.0, 0.5, prismT));
  dotColor = mix(dotColor, lavender, smoothstep(0.5, 1.0, prismT));
  // Keep it subtle — blend with the base off-white
  dotColor = mix(vec3(0.91, 0.89, 0.86), dotColor, 0.3);

  gl_FragColor = vec4(dotColor, dotAlpha * 0.9);
}
```

- [ ] **Step 3: Reduced motion handling**

If `prefers-reduced-motion` is active: freeze `u_time` at 0 (static halftone pattern, no animation).

Pass `reducedMotion` as a prop:
```tsx
interface HalftoneCanvasProps {
  reducedMotion: boolean
}
```

- [ ] **Step 4: Commit**

```
git add frontend/src/components/landing/HalftoneCanvas.tsx
git commit -m "feat(landing): WebGL halftone shader with prismatic tint for ticket visual zone"
```

---

## Task 5: Transition Animation — Landing to File System

**Files:**
- Create: `frontend/src/components/landing/LandingTransition.ts`
- Modify: `frontend/src/pages/Landing.tsx`

**Time estimate:** 5 min

- [ ] **Step 1: Create the transition timeline module**

Create `frontend/src/components/landing/LandingTransition.ts`:

This module exports a function that builds and plays a GSAP timeline to morph the landing into the file system. The transition has 3 phases:

```typescript
import gsap from 'gsap'
import * as THREE from 'three'

interface TransitionTargets {
  ticketEl: HTMLDivElement       // The ticket DOM element
  canvasEl: HTMLCanvasElement    // The Three.js canvas
  ribbonGroup: THREE.Group       // The ribbon group in the scene
  onComplete: () => void         // Called when transition finishes (trigger navigation)
}

export function playExitTransition({ ticketEl, canvasEl, ribbonGroup, onComplete }: TransitionTargets) {
  const tl = gsap.timeline({ onComplete })

  // Phase A (0s - 0.6s): Ribbons converge toward center
  // Animate the ribbonGroup's scale and position in the GSAP tick callback
  tl.to({}, {
    duration: 0.6,
    ease: 'power2.in',
    onUpdate: function () {
      const progress = this.progress()
      // Squeeze ribbons vertically toward y=0
      ribbonGroup.scale.y = 1 - progress * 0.7
      // Pull ribbons toward center (compress x-spread)
      ribbonGroup.scale.x = 1 - progress * 0.3
      // Increase opacity slightly for brightness flash
    },
  }, 0)

  // Phase B (0.3s - 0.8s): Ticket morphs — shrinks width, moves to top
  // This simulates the ticket "becoming" the tab bar
  tl.to(ticketEl, {
    duration: 0.5,
    ease: 'power3.inOut',
    width: '100%',
    height: '48px',
    top: '20px',        // Aligns with ruler-x-height position
    left: '30px',       // Aligns with ruler-y-width position
    transform: 'translate(0, 0)',
    borderRadius: '0px',
    opacity: 0,         // Fades as it reaches tab position
  }, 0.3)

  // Phase C (0.6s - 1.0s): Canvas fades out, grid fades in
  tl.to(canvasEl, {
    duration: 0.4,
    ease: 'power2.out',
    opacity: 0,
  }, 0.6)

  return tl
}
```

- [ ] **Step 2: Integrate transition into Landing.tsx**

The "ACCESS FILE SYSTEM" button click handler:

```typescript
const handleAccess = useCallback(() => {
  if (isTransitioning) return
  setIsTransitioning(true)

  playExitTransition({
    ticketEl: ticketRef.current!,
    canvasEl: canvasRef.current!,
    ribbonGroup: ribbonGroupRef.current!,
    onComplete: () => {
      navigate('/files') // Navigate to file system route
    },
  })
}, [navigate, isTransitioning])
```

- [ ] **Step 3: Reduced motion alternative**

If `prefers-reduced-motion` is active: skip the animation entirely, just navigate immediately with a simple CSS fade (opacity 1 -> 0 over 200ms).

```typescript
if (reducedMotion) {
  gsap.to(document.body, {
    opacity: 0,
    duration: 0.2,
    onComplete: () => {
      navigate('/files')
      gsap.set(document.body, { opacity: 1 })
    },
  })
  return
}
```

- [ ] **Step 4: Commit**

```
git add frontend/src/components/landing/LandingTransition.ts
git commit -m "feat(landing): GSAP exit transition — ribbons converge, ticket morphs, canvas fades"
```

---

## Task 6: Landing Page Orchestration

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`
- Modify: `frontend/src/App.tsx` (if routing changes needed)

**Time estimate:** 4 min

- [ ] **Step 1: Rewrite Landing.tsx as the orchestrator**

Replace the current placeholder `Landing.tsx` with:

```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RibbonScene from '../components/landing/RibbonScene'
import TicketPass from '../components/landing/TicketPass'
import { playExitTransition } from '../components/landing/LandingTransition'
import * as THREE from 'three'
import './Landing.css' // (optional — or inline styles)

export default function Landing() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ribbonGroupRef = useRef<THREE.Group | null>(null)

  // Detect reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleAccess = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)

    if (reducedMotion) {
      navigate('/files')
      return
    }

    playExitTransition({
      ticketEl: ticketRef.current!,
      canvasEl: canvasRef.current!,
      ribbonGroup: ribbonGroupRef.current!,
      onComplete: () => navigate('/files'),
    })
  }, [navigate, isTransitioning, reducedMotion])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Layer 0: Three.js ribbons + particles */}
      <RibbonScene
        reducedMotion={reducedMotion}
        ribbonGroupRef={ribbonGroupRef}
        canvasRef={canvasRef}
      />

      {/* Layer 1: Ticket pass overlay */}
      <TicketPass
        onAccessClick={handleAccess}
        ticketRef={ticketRef}
        reducedMotion={reducedMotion}
      />

      {/* Layer 2: Noise overlay is already rendered globally by Layout */}
    </div>
  )
}
```

- [ ] **Step 2: Update Layout/App routing if needed**

The current `App.tsx` wraps Landing in a `<Layout showTabs={false}>`. Since the landing page has its own full-viewport design with the Three.js canvas, verify that:
- `GridBackground` is NOT rendered on the landing page (ribbons replace it)
- `NoiseOverlay` IS rendered (it sits above content with `z-index: 3` and `pointer-events: none` — this is correct; it adds grain over the ribbons)
- `CrosshairCursor` IS rendered (the custom cursor should work on landing too)
- Tabs are NOT rendered (already handled by `showTabs={false}`)

If `Layout` currently forces `GridBackground` on landing, update the `LandingLayout` in `App.tsx`:

```tsx
function LandingLayout() {
  return (
    <>
      <NoiseOverlay />
      <CrosshairCursor />
      <Landing />
    </>
  )
}
```

This ensures landing gets noise + cursor but NOT the grid/rulers.

- [ ] **Step 3: Update route target**

The ticket's "ACCESS FILE SYSTEM" navigates to `/files` (the file system shell from Phase 2). If Phase 2 is not yet complete and `/files` doesn't exist, temporarily navigate to `/about` as a fallback. Add a comment:

```typescript
// TODO: Change to '/files' once Phase 2 file system shell is implemented
navigate('/about')
```

- [ ] **Step 4: Verify full landing experience**

Open `http://localhost:5173`:
1. Prismatic data ribbons animate across the full viewport (pinks, corals, teals, mints, lavenders)
2. Prismatic particles rise near center with spectral color shift
3. Noise grain overlay is visible over everything
4. Symmetry Breaking ticket is centered with halftone shader in visual zone
5. Data zone shows: AGENT > YONGKANG ZOU, CODENAME > inhibitor, BASE > PARIS, FR, CLEARANCE > ALL DOMAINS, MISSIONS > 24, WINS > 9, SPEED > 0 -> DEMO < 20H
6. "ACCESS FILE SYSTEM" button has 8px border radius, hover inverts colors
7. Click triggers transition: ribbons converge, ticket morphs, canvas fades, navigates to inner page
8. Custom crosshair cursor works on the landing page

- [ ] **Step 5: Commit**

```
git add frontend/src/pages/Landing.tsx frontend/src/App.tsx
git commit -m "feat(landing): orchestrate ribbon scene + ticket pass + transition into file system"
```

---

## Task 7: Mobile Responsiveness

**Files:**
- Modify: `frontend/src/components/landing/TicketPass.css`
- Modify: `frontend/src/components/landing/RibbonScene.tsx`

**Time estimate:** 3 min

- [ ] **Step 1: Simplified ribbons on mobile**

In `RibbonScene.tsx`, the performance config from Task 2 Step 4 already reduces particle and ribbon counts on mobile. Additionally:
- On screens < 768px: reduce `pointsPerLine` to 200, ribbon layers to 3 total (one pink, one teal, one lavender) with ~15 lines each
- On screens < 480px: further reduce to 2 layers with 10 lines each, 100 points per line
- Disable the anomaly distortion effect (the `if (distToCenter < 4.0)` block) on mobile to save CPU

```typescript
function getPerformanceConfig() {
  const w = window.innerWidth
  if (w < 480) {
    return { particleCount: 300, ribbonLayers: 2, linesPerLayer: 10, pointsPerLine: 100, anomaly: false }
  }
  if (w < 768) {
    return { particleCount: 500, ribbonLayers: 3, linesPerLayer: 15, pointsPerLine: 200, anomaly: false }
  }
  return { particleCount: 2000, ribbonLayers: 5, linesPerLayer: [60, 40, 50, 30, 40], pointsPerLine: 400, anomaly: true }
}
```

- [ ] **Step 2: Ticket mobile layout**

The CSS from Task 3 already includes the `@media (max-width: 768px)` breakpoint that stacks the ticket vertically. Verify:
- Ticket takes full width at bottom of screen
- Visual zone becomes a short horizontal band at top (180px height)
- Data zone fills remaining space
- Button is full-width and has adequate touch target (min 44px height)
- Font sizes are readable on small screens

- [ ] **Step 3: Disable crosshair cursor on touch devices**

This should already be handled by `CrosshairCursor.tsx` (it checks `window.matchMedia('(pointer: fine)')`). Verify it does not render on touch devices.

- [ ] **Step 4: Commit**

```
git add frontend/src/components/landing/RibbonScene.tsx frontend/src/components/landing/TicketPass.css
git commit -m "feat(landing): mobile responsive — simplified ribbons, stacked ticket, touch targets"
```

---

## Task 8: Accessibility + Performance Polish

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`
- Modify: `frontend/src/components/landing/RibbonScene.tsx`
- Modify: `frontend/src/components/landing/TicketPass.tsx`

**Time estimate:** 3 min

- [ ] **Step 1: prefers-reduced-motion — full audit**

Ensure ALL animations respect the media query. Create a shared hook:

```typescript
// frontend/src/hooks/useReducedMotion.ts
import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reducedMotion
}
```

Use this hook in `Landing.tsx` instead of the inline `window.matchMedia` check.

When `reducedMotion` is true:
- `RibbonScene`: render ribbons once as static curves (no animation loop / `cancelAnimationFrame` after first render). Reduce ribbon opacity slightly so they're a subtle static background.
- `HalftoneCanvas`: freeze at time=0 (static dot pattern)
- `TicketPass` entrance: no blur animation, render at full opacity immediately
- Transition on click: instant navigation with a simple opacity fade (200ms)

- [ ] **Step 2: Canvas cleanup on unmount**

Verify `RibbonScene.tsx` cleanup is thorough:

```typescript
return () => {
  cancelAnimationFrame(animationId)
  // Dispose all geometries
  ribbonGroup.traverse((obj) => {
    if (obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry.dispose()
      if (obj.material instanceof THREE.Material) obj.material.dispose()
    }
  })
  renderer.dispose()
  renderer.forceContextLoss()
  window.removeEventListener('resize', handleResize)
}
```

- [ ] **Step 3: Semantic HTML + ARIA for ticket**

In `TicketPass.tsx`:
- Wrap the ticket in `<article role="region" aria-label="Agent credentials">` or `<section>`
- The "ACCESS FILE SYSTEM" button: `<button aria-label="Enter the file system">`
- Data grid: use `<dl>`, `<dt>`, `<dd>` for label-value pairs instead of bare `<span>` (better semantics)
- Visual zone: `aria-hidden="true"` (decorative)

```tsx
<dl className="data-grid">
  <dt className="col-label">AGENT</dt>
  <dd className="col-sep">&gt;</dd>
  <dd className="col-value">YONGKANG ZOU</dd>
  {/* ... */}
</dl>
```

Note: This changes the grid markup from `<span>` to `<dt>`/`<dd>`. Update `TicketPass.css` selectors accordingly (`.data-grid dt` / `.data-grid dd`, or keep the class-based selectors since the classes are on the elements).

- [ ] **Step 4: Commit**

```
git add frontend/src/hooks/useReducedMotion.ts frontend/src/components/landing/ frontend/src/pages/Landing.tsx
git commit -m "feat(landing): accessibility — reduced motion, ARIA semantics, canvas cleanup"
```

---

## Verification Checklist (Phase 3 Complete When...)

### Visual
- [ ] Prismatic data ribbons animate across full viewport in pink/coral/teal/mint/lavender
- [ ] Prismatic particles rise near center with spectral color shifting
- [ ] Noise grain overlay is visible over the ribbon scene
- [ ] Symmetry Breaking ticket is centered with halftone shader in left visual zone
- [ ] Ticket data zone shows all 7 fields: AGENT, CODENAME, BASE, CLEARANCE, MISSIONS, WINS, SPEED
- [ ] Texture divider (repeated `L` characters) separates upper and lower data groups
- [ ] "ACCESS FILE SYSTEM" button has 8px border radius and hover-inverts colors
- [ ] Footer shows ID and CLASSIFIED label

### Interaction
- [ ] Clicking "ACCESS FILE SYSTEM" triggers the 3-phase exit transition
- [ ] Ribbons converge/compress toward center during transition
- [ ] Ticket morphs (shrinks, moves to top) during transition
- [ ] Canvas fades out, navigation completes to inner page
- [ ] Custom crosshair cursor works on landing page

### Performance
- [ ] Desktop: 60fps ribbon animation (check with Chrome DevTools Performance tab)
- [ ] Mobile (< 768px): reduced ribbon/particle counts, 30fps acceptable
- [ ] `prefers-reduced-motion: reduce`: all animations freeze, click does instant navigate
- [ ] Three.js resources are fully disposed on unmount (no WebGL context leaks)

### Responsive
- [ ] Desktop (> 768px): ticket is 800px wide, centered, horizontal split
- [ ] Mobile (< 768px): ticket stacks vertically, full width, anchored to bottom
- [ ] Mobile: simplified ribbon layers (2-3 layers instead of 5)
- [ ] Touch devices: no crosshair cursor rendered

### Accessibility
- [ ] Ticket uses semantic `<dl>`/`<dt>`/`<dd>` for data grid
- [ ] Button has `aria-label`
- [ ] Visual zone has `aria-hidden="true"`
- [ ] Reduced motion preference is respected and reactive (changes mid-session)
