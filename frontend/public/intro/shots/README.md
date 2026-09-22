# Journey intro — reference rebuild

Local experiment on `redesign/journey-intro`, route `/lab/intro`. No deployment.

## Current 06/07 composition

The owner reference `docs/superpowers/specs/assets/06-07-reference.png` is the
composition authority. Both matching `frames-v3/06-turn.png` and
`frames-v3/07-continue.png` style crops were viewed, along with all three
`.playwright-mcp/books-{16_4,17_9,20_6}.jpg` comparison captures.

- **06 A:** overhead economics textbook with a separate Pareto sheet; closed
  Mankiw book upper-left, coffee, pencil, plant and four right-edge notes.
- **06 B:** one flat printed Attention paper, no fold; DDIA/Clean Code stack,
  Pareto sticky note and four engineering notes. Same character and camera.
- **07:** wide low-angle composition; DMLS/Clean Code/DDIA stack in that order,
  figure typing on laptop, plant/pen holder, framed poster, notebook/pen, mug.
  The entire new composition and ink share a subtle camera push. Old separate
  book enlargement/figure stretching was removed to keep hands on the keys.

**Text policy:** all bitmaps have blank writing surfaces. Every title, author,
label, handwritten note, chart, diagram and “i keep showing up.” is SVG in
`StudyInk.tsx`. The caption is dark ink and fully visible throughout shot 07.
CSS imports Caveat from Google Fonts with local handwriting/cursive fallbacks;
no npm dependency. Serif book/paper titles and fixed-size diagram labels remain
separate from handwriting. Spines use individual affine transforms matching
surface slopes. DDIA has red/white typography, Clean Code white/yellow/black,
and DMLS white. No publisher logo or cover artwork is used.

## Built-in imagegen provenance

Every generation and edit below passed **both the new owner reference and the
matching frames-v3 crop via `referenced_image_paths`**. Edits additionally passed
the previous generated bitmap as the edit target. Built-in imagegen only.

Source cache (not used by the app):
`~/.codex/generated_images/01a0caf2-fa87-7511-9bc4-9307a7886cb1/`.
All source names below have `.png` extension.

| Source | References / edit target | Prompt summary and selection |
| --- | --- | --- |
| `exec-f1b6cf84-50c2-4fab-b229-b33a1c7afdc4` | Owner + `06-turn.png` | Overhead blank economics textbook/loose sheet, charcoal closed book, cup, plant, notes; no character/text/chart/logo. Initial A. |
| `exec-d106c2c3-5d60-4a42-8d64-a29e26eacdeb` | Owner + `06-turn.png` + initial A | Preserve camera/cup/plant; replace spread with ONE flat blank paper, red/white book stack, blank yellow sticky. Initial B. |
| `exec-0967aa19-80b9-4096-bee2-c8e4f180efed` | Owner + `07-continue.png` | Wide low-angle typing figure, three blank white/white-yellow-black/red spines, plant/pen holder, blank poster/notebook, pen, mug. **Selected 07.** |
| `exec-a4f9f6fc-cfa9-417e-a4ee-a41e785114c4` | Owner + `06-turn.png` + initial A | Widen right notes sheet, move writing instrument up; preserve central objects and blank surfaces. Intermediate A. |
| `exec-15f0b32d-7156-458c-b549-9825505391fd` | Owner + `06-turn.png` + initial B | Move right notes sheet inward and replace pen with sharpened graphite pencil; preserve flat paper and props. **Selected B.** |
| `exec-d7a2ca71-9394-47fb-888b-fe1d60b9ab13` | Owner + `06-turn.png` + intermediate A | Replace upper-right pen with graphite pencil; preserve everything else. **Selected A.** |

Shared prompt constraints: one 16:9 full-bleed scene, matte faceted cut paper,
cream/charcoal/cobalt palette and printed grain; all writing surfaces BLANK;
no text, marks, charts, diagrams, logos, publisher marks or cover artwork.
06 prompts exclude hands/head/arms because they are shared runtime layers.
No author/publisher text or DDIA boar engraving was baked into any bitmap.

ImageMagick only resized selected outputs to 1600×900 and encoded WebP quality
86. Shared existing `06-hands.webp` and `06-head.webp` remain byte-identical.
Hands originally used frames-v3/06-turn.png; head used original frames/06-turn.png.
Runtime fixed child registration: hands translate(0,125); head
translate(200,225) scale(.75). Their outer timeline transforms remain identity
and the same DOM layers stay mounted across the cut in both directions.

Superseded files deleted: `06-book-ai.webp`, `06-book-econ.webp`,
`06-desk-ai.webp`, `06-desk.webp`, `07-bg.webp`, `07-books.webp`, `07-figure.webp`.
The replacement 06 files contain both desk and the one held assembly, so each
state swaps atomically as one group. No redundant/unreferenced raster variants.

## Current raster inventory

| File | Bytes |
| --- | ---: |
| `01-bg.webp` | 271,880 |
| `01-body.webp` | 58,706 |
| `01-leg.webp` | 44,272 |
| `02-bg.webp` | 215,352 |
| `02-shoulder.webp` | 47,314 |
| `03-hand-reach.webp` | 51,596 |
| `03-hand-touch.webp` | 63,182 |
| `03-wall.webp` | 224,180 |
| `04-hand-left.webp` | 25,766 |
| `04-hand-right.webp` | 29,782 |
| `04-nanjing.webp` | 231,104 |
| `04-paris.webp` | 200,282 |
| `05-arch.webp` | 115,556 |
| `05-arm-reach.webp` | 42,616 |
| `05-arm-rest.webp` | 41,346 |
| `05-sky-tower.webp` | 86,904 |
| `06-ai.webp` | 53,848 |
| `06-economics.webp` | 57,790 |
| `06-hands.webp` | 50,792 |
| `06-head.webp` | 53,148 |
| `07-study.webp` | 85,470 |

**21 raster layers, 2,050,886 bytes.** Folder including this README is below 2.07 MB (limit 6 MB).

## Timing and registration

1600×900 shared covering art surface; existing viewport crop, pinned native
scrub (1100vh), play driver (1/1.4 speed), load/decode gate and cleanup preserved.
`pixelStretch.ts` and `palette.ts` are untouched by this rebuild.

| Shot / action | Timeline units |
| --- | --- |
| 01 | 0–3 |
| 02 | 3–6 |
| 03 | 6–9 |
| 04 | 9–12.5 |
| 05 | 12.5–15.4 |
| 06 A economics | 15.4–16.5 |
| Blue frontier tracing | 15.6–16.4 |
| Atomic A→B cut | 16.5 |
| Transformer draw (20 strokes) | 16.6–17.715 |
| 06 B AI hold | through 18.4 |
| 07 | 18.4–21.4 |
| Whole-composition push, scale 1→1.025 | 18.85–20.10 |
| Dark SVG caption | entire 07, 18.4–21.4 |
| 08 identity | 21.4–22 |

Exactly one `[data-held-object]` is opaque at each sampled t, including the
16.5 boundary and reverse seeks. Shared character layers never swap or morph.
03/05 retain outgoing autoAlpha 0 within the first 35% of the crossfade.
The 06 match cut retires outgoing content immediately. Reduced motion shows
only 06 B and the new 07 for these shots, with all SVG ink fully drawn.

Transformer: 224×42 boxes, 14px monospace labels; long masked-attention label
wraps across two baselines at 17/34px. Conservative 0.65em character-width tests
verify every label stays inside 8px horizontal and 3px vertical insets. Arrows
use gaps between boxes or the empty column gutter; no label is crossed, and
there is no page fold. Blue chart point is evaluated on the frontier cubic
at t=.6: (191.72,124.184).

## Visual and automated verification

Offline complete composites rendered from the actual React SVG ink with
rsvg-convert and inspected at `/tmp/intro-reference-review/{06a,06b,07}.png`.
This exposed clipped right notes and an overly high stack title; both corrected.
The local offline render uses a font fallback; Google-hosted Caveat is selected
by the live CSS import when available. No browser verification is claimed:
browser MCP requires unavailable approval, local Chromium is denied at Mach
bootstrap, and Vite cannot bind 127.0.0.1:5173 in the sandbox.

Requested checks from frontend/: `npx tsc -b`,
`npx eslint src/components/intro`, `npx vitest run src/components/intro`.
**All three passed; 49 tests across two files.** Tests cover exact titles/order,
notes and labels, one held object, unchanged character markup/transforms,
label bounds, reversible draw/cut, preload, pinned scrub, play and reduced motion.

## Earlier shots 01–05 provenance (unchanged)

Existing layers were generated using the matching frames-v3 crop, with opaque
environments and transparent isolated poses. Original prompt summaries:

- **01-bg:** remove character; reconstruct ground-level Qinhuai steps, red
  railing left, whitewashed black-roof houses/lanterns right, grey trees and
  reflected water. No city gate.
- **01-body:** small black head, blue torso, bent arm, far supporting leg;
  omit near leg; solid blue pelvis overlaps the hip at (43%, 36%).
- **01-leg:** giant blue near leg and black sole; broad overlapping upper-thigh
  tab at the same hip. Follow-up with v3 crop + generated leg removed an
  oversized top bulb while preserving the lower leg and sole.
- **02-bg / shoulder:** river, lanterns, white walls, black roofs, grey trees,
  embankment and wooden covered boat; separate left foreground head/shoulder
  with dark-blue crease and original cropping.
- **03-wall:** tilted red wooden pillar/door, pale wall, eave, lantern, stone
  plinth, riverside view; short right-edge streaks start at the contact.
  Remove arm, no grey-wall substitution.
- **03-hand-reach / touch:** isolated bottom-left blue arm, first retracted
  and relaxed, then open hand pressing pillar; no baked-in streaks.
- **04-nanjing:** unstretched Qinhuai panorama; 36% sample column crosses
  pale walls, black roof, red wood/lanterns, stone and grey-green water.
  Follow-up with crop + generated texture replaced an unwanted Paris-style
  bridge/lamp with continuing Chinese houses and red railings.
- **04-paris:** complete Seine bank with lamps and arched stone bridge;
  tower axis at 52%, main arch at 50% for the centre-opening reveal. Water
  below, no bands or hands.
- **04-hand-left / right:** corresponding bottom-edge blue hand, retaining
  full-frame placement, no environment or second hand.
- **05-arch:** lighter grey masonry underside and lower-left grey trees;
  transparent centre/right opening. No tower, sky, hand or streaks.
- **05-sky-tower:** cream sky, detailed low-angle Eiffel tower on right,
  reconstruct sky behind removed arch and arm.
- **05-arm-rest / reach:** fixed bottom-left forearm anchor, relaxed lowered
  hand then open reaching hand, no environment.
