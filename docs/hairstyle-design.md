# Avatar hairstyle studies

The five alternative hairstyles were redesigned on 2026-09-22. Each began as an
individual image-model edit of `assets/me.png`, using the built-in image-generation
tool. The original hairstyle is still the unchanged original asset.

The studies preserve the original face, pose and clothing. The five alternatives
are a soft side-part crop, a gently rounded bob, a natural ponytail, compact twin
buns and restrained shoulder-length waves. Their crowns stay close to the
original avatar's proportions, with modest root lift and smooth, deliberate
locks. Reduced side volume, fewer loose tips and broad curves replace the previous
overly fluffy, tousled silhouettes. `assets/me.png` remains untouched.

## Code rendering

The generated black ink was traced into cubic Bézier SVG paths with Potrace
(threshold 128, speckle threshold 3, corner threshold 1, curve tolerance 0.16).
Coordinates were rounded to 0.01 units on the original 1254 × 1254 canvas.
The resulting curves are stored in `assets/portrait-hairstyles.js`; the page has
no tracing library or generated raster-image dependency at runtime.

`assets/portrait-hair.js` uses a continuous displacement field from
`assets/portrait-hair-motion.js` for ruffling. The face, ear, neck and actual
shoulder/collar contours are stationary anchors. Motion increases smoothly away
from those contours, including along the complete right side lock. A narrow
compositing window fades only where displacement is already nearly zero, so
there is no rotating face cutout to expose seams above the ear or leave fixed
hair tips. The moving layer includes an opaque background to erase its previous
silhouette rather than leave doubled strands.

At rest, the motion layer is hidden and the original PNG or traced path is drawn
unchanged. During movement, the original stays exact over the stationary regions.
Eyes and mouth retain their independent expression layers. Static snapshots for
cat surface sampling exclude the motion layer. Maps are created once, the
animation frame loop stops when settled, and reduced motion disables ruffling.

The single-click, swipe, back-and-forth ruffle, double-tap reset, keyboard controls,
local preference and reduced-motion support are retained.

## Generation prompts

The exact shared brief and the five per-style instructions are recorded in
`hairstyle-prompts.json`. These are visual design inputs, not runtime instructions.
