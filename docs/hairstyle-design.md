# Avatar hairstyle studies

The five alternative hairstyles were redesigned on 2026-09-22. Each began as an
individual image-model edit of `assets/me.png`, using the built-in image-generation
tool. The original hairstyle is still the unchanged original asset.

The studies preserve the original face, pose and clothing while adding lifted
roots, generous crown volume, soft temple locks and organic layered ends. They
replace the earlier hand-built silhouettes that fitted too closely to the scalp.

## Code rendering

The generated black ink was traced into cubic Bézier SVG paths with Potrace
(threshold 128, speckle threshold 3, corner threshold 1, curve tolerance 0.16).
Coordinates were rounded to 0.01 units on the original 1254 × 1254 canvas.
The resulting curves are stored in `assets/portrait-hairstyles.js`; the page has
no tracing library or generated raster-image dependency at runtime.

`assets/portrait-hair.js` separates the facial/clothing region from the hair with
overlapping masks. Eyes and mouth use the existing independent expression layers.
A static SVG snapshot keeps the existing portrait surface sampling in sync.

The single-click, swipe, back-and-forth ruffle, double-tap reset, keyboard controls,
local preference and reduced-motion support are retained.

## Generation prompts

The exact shared brief and the five per-style instructions are recorded in
`hairstyle-prompts.json`. These are visual design inputs, not runtime instructions.
