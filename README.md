# Zixuan Zhao — personal website

A minimal English academic homepage, built with semantic HTML and responsive CSS.
No external font or CDN requests, and no build step.

The journal-inspired typography pairs Caveat for names and headings with Patrick
Hand for readable handwritten notes, navigation and contact details. Both Latin
font files are served locally, with their SIL Open Font Licenses in `assets/fonts/`.
Text stays selectable HTML; glyph contours continue to follow the rendered fonts.

The page uses a restrained cream writing-paper surface inspired by MIDORI MD
Paper. Its seamless material is generated in code from fine pulp variation,
surface tooth and short cellulose fibres, then cached at display density. It
scrolls with the document, without continuous animation or downloaded textures.
The footer's overlapping paper edge samples the same material in document
coordinates. The unchanged black-and-white portrait blends into the paper;
photographs retain their original colours.

Text selection looks like a soft yellow felt-tip highlighter on the paper:
translucent ink, gently irregular chisel edges, fine nib streaks and slight ink
pooling. A pointer-transparent canvas follows the browser's selected text ranges,
including wrapping, without replacing text or altering clipboard events. The ink
is anchored in document coordinates and scrolls natively with its text, without
scroll-time repainting or viewport lag. Clearing the selection removes the strokes. Native selection remains the
fallback for forms, open dialogs, unavailable canvas and forced-colour modes.

The full-width header is procedural antique cloth: muted sage and warm linen yarns
with deeper green accents cross in a twill weave, with uneven dye, fine fibres
and a lightly frayed cut edge with occasional loose ends.
No texture images are loaded. Time-based local friction gently catches the weave;
yarn tension limits stretching, a shallow crease follows the contact, and the cut
edge yields more than the fixed upper and side hems. Fast strokes slip instead of
building large waves. Motion settles with damping and stops updating when idle,
hidden or offscreen.
Reduced motion and unavailable WebGL retain a static, code-drawn weave.

The footer is clad edge to edge in pale, warm oak boards laid at a gentle 14-degree
diagonal, with staggered 240–360px lengths, flush with both sides and the bottom
of the page. Each plank has its own
seed, cut direction, irregular growth rings, long fibres, open vessels, satin rays,
occasional knots and muted colour variation. The grain bends around knots; pore
width stays small even near a ring's centre. Fine recessed joints and opposing
bevel highlights share the same diagonal coordinates as the wood. There is no
separate tabletop silhouette or outer drop shadow. Canvas generates the material
entirely from code, without texture images, and stays static until resized.
Footer text remains accessible HTML, with a static CSS fallback behind it.
The cream page overlaps the wood with a subtly uneven paper edge, a fine exposed
rim and a soft contact shadow. Its deterministic contour also supplies the cat's
paw contacts, so the visible edge and landing surface stay aligned after resizing.

The avatar uses a small vanilla JavaScript animation and SVG facial layers:
its eyes follow the pointer and it blinks naturally. After four seconds without
pointer movement, its tongue stays out until the pointer moves again. Animation pauses offscreen and in hidden tabs. Reduced-motion
preferences keep the selected portrait still; disabled JavaScript retains the original.
The portrait has six black-and-white hairstyles: the unchanged original, soft
crop, soft bob, natural ponytail, twin buns and soft waves. Five image-model studies
were converted to SVG curves, with moderate volume and tidy, gently curved locks
(see [design notes](docs/hairstyle-design.md)). Swipe across the hair to cycle, ruffle
back and forth to pick a different style, or double-tap to restore the original.
A single click/tap also cycles; keyboard users can use Enter, Space, arrow keys
and Home. The selected style is saved locally. SVG hair layers share the same
face/expression anchors, and a matching static snapshot refreshes portrait contours.
Hair controls work independently of the cat.
A small black cat sleeps on the introduction divider. Clicking or keyboard-activating
it makes it run away along the line and settle back to sleep. Hold and drag its
head, body, or tail to pick it up in different poses. On release, it falls onto
text, dividers, or the avatar, looks around, and follows a shortest walk/jump
route over page platforms back to its original spot. Horizontal hops are limited to 96px. Landings use a quick catch, slight knee
bend, and immediate extension before continuing. Escape returns it home.
Text platforms sample the top ink contour of each rendered glyph; avatar platforms
follow the dark silhouette. Paws find separate contact points and the body follows
the slope. Sampling reads current content, font metrics, and wrapping on each drop;
text edits and font loading refresh an active journey automatically.
While dragging, Pretext measures individual graphemes, each anchored to its original
rendered position. Actual rasterized letter strokes collide with the held cat's
silhouette, with a 2px clearance; counters and empty serif corners stay empty.
Only touched letters move, with a critically damped spring for displacement and
return. Neighboring rows may overlap temporarily instead of blocking each other.
Untouched letters, line breaks and page geometry stay fixed. On release the visual
overlay eases home while collision and route sampling immediately use the original
DOM geometry, so walking cats never push text. Canceling or fusing clears the layers
immediately; reduced-motion preferences skip the spring. Content edits and newly loaded fonts
refresh the drag layout. Pretext 0.0.9 is vendored locally in
`assets/vendor/pretext-0.0.9/` with its MIT license and package integrity.
On steep contours, unreachable paws release into a hanging pose instead of stretching.
Click-to-walk and drag-return share the same leg swing and body motion; contour
contact adjustments are applied to that gait when walking over text or the avatar.
Hold the cat over the portrait's face for four continuous seconds to fuse them.
Moving within the face keeps the timer going; leaving or releasing resets that hold.
Cats manually dropped onto an eye, the nose, or the mouth stay there and fuse after
four seconds on the feature. Picking them up resets this timer. Hair and shoulders
remain ordinary surfaces: a cat dropped there looks around and returns home. The
cat fades away and the portrait gains independently twitching ears and curved
whiskers that sway gently from their roots. Click either ear to release the cat;
it jumps out beside the portrait with continuous horizontal momentum until landing,
then returns to its divider to sleep. Only the viewport edges stop a launch sideways.
Reduced motion keeps the ears and whiskers still.

Three photographs appear uncropped in a responsive gallery. Select a photograph
to open the larger version; use the arrow buttons or arrow keys to browse and
Escape to close. Smaller preview files keep the homepage light.
The gallery photographs are also cat playgrounds: drops above a photograph land
on its edge, while drops inside use traced refrigerator, table, chair, windowsill,
tree, roof, and ground surfaces. These one-way platforms join the return route.
Their normalized coordinates follow responsive image sizing. Scene maps live in
`assets/cat-photo-world.js`; replacing a photograph requires tracing its new objects.
While holding the cat, move toward the viewport edge to scroll to the gallery.
Opening a photograph also enlarges any cat inside it at the same scale. The
lightbox mirrors the live rig and ongoing route, including walking and jumping;
the cat leaves the frame naturally as it returns home. Closing the viewer does
not restart or duplicate the cat's journey.

Run `node --test tests/*.test.mjs` to check cat interactions and cloth physics.

## Local preview

Run `python3 -m http.server 4173` from this directory and visit <http://localhost:4173>.

## Deployment

GitHub Pages can serve the repository root directly. In Settings → Pages,
select deployment from the `main` branch and `/ (root)`.

Edit `index.html` for content and `assets/style.css` for presentation.
The previous site has been removed from the working tree and remains in Git history.
