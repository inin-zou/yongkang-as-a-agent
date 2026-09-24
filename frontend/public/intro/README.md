# Journey intro assets

The localhost `/lab/intro` sample uses the 11 WebP layers in [shots](shots/README.md),
derived from the storyboard crops of the original design doc.
All environments, hands, and arms are raster layers; SVG groups position them.
The four superseded flat/arrival environment experiments were removed after
checking that no runtime code referenced them.

All 11 images decode before the timeline/ScrollTrigger starts. The two level
city textures also finish rasterizing before the first animated frame.
Reduced motion uses three static SVG compositions with the same image assets.

Shot 03 uses a smaller pose and pulls its fingertip to the 36% slice column
while blending only the wall into shot 04's exact level texture. Camera leveling
finishes at t=2.6; contact remains visible through the t=3 cut.

The arrival arm alpha was re-keyed by blue dominance to remove neutral grey
residue while retaining the blue paper texture and soft edge alpha. Both arms
were composited against solid magenta for inspection. RGB was retained and
cleaned WebPs exported losslessly. No runtime keying or image processing occurs.
