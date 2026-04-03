# Portfolio Design Principles

## Brand Identity

**Core thesis:** "He's not just an AI engineer, he's a creative technologist who happens to be terrifyingly fast. He explores where no one else is looking, and he keeps winning."

**Narrative arc:** The Assembling (primary) + Dual Nature (flavor)
- Every role, hackathon, and domain shift was equipping the agent with a new capability
- The dual nature (engineer + artist) isn't stated — it's demonstrated through the design itself

## The Duality

The entire design embodies a tension:
- **Rational / Engineering:** Grey achromatic base, grid structure, file system metaphor, monospace data labels, rulers, coordinates
- **Artistic / Sensitive:** Prismatic iridescent color accents bleeding through the structure, atmospheric negative space, 飘渺感 (ethereal/fleeting quality), film grain, blur effects

The grid contains the beauty. The beauty disrupts the grid. That IS the brand.

## Color Philosophy: Prismatic Iridescence on Achromatic Base

Technique: **Holographic minimalism** — also called prismatic/iridescent color on an achromatic base.

- **Base:** Neutral mid-grey (#9A9A9A to #B0B0B0) — the rational surface
- **Accent:** Spectral/prismatic light — pink, coral, teal, soft rainbow — not single-color but a shifting spectrum
- **Effect:** Chromatic dispersion — light splitting through a prism
- **Texture:** Concrete/mineral roughness + translucent organic forms
- **UI markers:** Small `+` crosshair anchors on the grid

Reference: @cynora.ai "MEMORIES" series — hard mineral surfaces + living forms + spectral light

## Typography

- **Data/Labels:** Space Mono (monospace) — structured, precise, file-system energy
- **Narrative text:** Inter (sans-serif) — clean, neutral, readable at all sizes. Chosen over Playfair Display to avoid high-contrast serif clashing with the architectural grid aesthetic. The elegance comes from spacing and weight, not ornamental letterforms.
- No pixel fonts. Words carry weight through negative space, not visual noise.

## Theme Thread: Architectural File System

NOT terminal/hacker. The metaphor is a **well-organized dossier / filing cabinet / coordinate system**.

Elements:
- Grid lines + rulers as structural skeleton
- Content cards positioned like filed documents on a coordinate plane
- Tabs for navigation (like drawers in a filing cabinet)
- Cell coordinates as subtle spatial indicators
- Crosshair cursor snapping to grid — precise, intentional
- Pixel-art brushstrokes scattered as decoration — raw artistic texture breaking through the rigid grid

## Atmospheric Inspiration: Daniel Caesar

Three album covers define the emotional register:

1. **Freudian (glowing figure in dark field):** A single luminous presence radiating in a void — the agent as a source of light. Used for landing page energy.
2. **Case Study 01 (dissolving silhouette):** Blurred dark form against twilight gradient — ephemeral, between existence and disappearance. Used for transitions and content emergence.
3. **Astronaut (lone explorer in barren landscape):** Human dwarfed by environment, analog film grain — the agent deployed in unknown territory. Used for journey/about sections.

Key feeling: 飘渺感 — detachment, etherealness, fleeting, distance, humans small and lonely.

## Edge Shape System: Sharp Default, Round = Interactive

**Principle:** Sharp/square corners are the default for all static, informational elements. Rounded corners are reserved exclusively for elements that invite user interaction (clickable, tappable). This is a cognitive affordance — the brain processes rounded shapes as approachable and "touchable", while sharp corners read as structural and authoritative.

This aligns with Apple's HIG philosophy: rounded corners aren't decorative, they're **functional signals**. Research shows rounded buttons achieve 17-55% higher click-through rates than sharp alternatives (Material Design studies).

### Border Radius Scale

| Element Type | `border-radius` | Reasoning |
|-------------|-----------------|-----------|
| **Content cards, panels, containers** | `0px` | Static information. Sharp = architectural, filed document energy. Matches the COORDINATE grid aesthetic. |
| **Grid cells, rulers, data tables** | `0px` | Structural elements. Always sharp. |
| **Section dividers, texture lines** | `0px` | Decorative/structural. |
| **Frosted glass panels (non-interactive)** | `0px` or `2px` | Information overlay. Stays sharp unless it's also a link. |
| **Buttons (primary CTA)** | `8px` | Interactive. Rounded signals "click me". |
| **Buttons (secondary/ghost)** | `6px` | Interactive but less prominent. Slightly less round. |
| **Input fields (form)** | `6px` | Interactive — user types here. |
| **Tags / pills (clickable filters)** | `12px` or `full` | Interactive filter tabs. Pill shape = clearly tappable. |
| **Tags / pills (non-clickable labels)** | `2px` | Static label. Sharp distinguishes from clickable filters. |
| **Tooltip / popover** | `6px` | Ephemeral UI, softened to feel transient. |
| **Avatar / profile photo** | `50%` (circle) | Convention. |
| **Tab navigation (active)** | `0px` bottom, `2px` top | Structural nav. Mostly sharp. Tiny top radius for polish only. |
| **Modal / dialog** | `8px` | Interactive container (user will click inside it). |
| **Map pins (hover-expanded)** | `8px` | Interactive — clicking opens project detail. |

### The Rule in Practice

```
Is the user supposed to click/tap/interact with it?
  YES → border-radius: 6-12px (rounded)
  NO  → border-radius: 0px (sharp)
```

Exceptions are minimal and intentional (tooltips, modals). When in doubt, stay sharp. The portfolio should feel **architectural and precise** — like a well-filed dossier — not soft and bubbly.

### Apple-Style Clean Design Principles

The overall design language follows Apple's philosophy of clarity over decoration:

1. **Generous whitespace** — content breathes. Margins are larger than you think they need to be.
2. **Typographic hierarchy through weight and size, not color** — headings differ from body via font-weight and font-size, not by being a different color.
3. **Subtle depth** — shadows are soft and diffused (`box-shadow: 0 4px 16px rgba(0,0,0,0.08)`), never harsh drop-shadows.
4. **Consistency** — identical elements look identical everywhere. A data label in the skills section looks the same as a data label on a project card.
5. **Restraint in animation** — motion is purposeful (blur-reveal, scroll-triggered entrance). Never bounce, jiggle, or wobble. Easing is always `ease-out` or custom cubic-bezier for deceleration.
6. **Color as signal, not decoration** — the grey base means any color that appears carries meaning (prismatic = artistic/emotional moment, green = win indicator, highlight = selected state). No decorative color.
7. **Touch targets** — interactive elements are minimum 44x44px on mobile (Apple HIG standard).

## Anti-Patterns (What to Avoid)

- Corporate / LinkedIn energy
- Tryhard / "look how cool I am"
- Over-gimmicked animations that obscure content
- Terminal/hacker cliches (matrix rain, green-on-black, blinking cursors)
- Flat tag clouds for skills
- Resume-style bullet point lists

## Audience

- **Primary:** Startup founders, tech leads, AI/hacker community
- **Secondary:** General public (should still "get it" without being technical)
- **Implication:** Two layers — surface-level impressive for anyone (wins, speed, range), technically credible for those who know

## Maintainability Principle

The design must be easy to update. Structured data drives a beautiful presentation. Adding a new hackathon, job, or project should be as simple as adding an entry to a data file — not redesigning a page.
