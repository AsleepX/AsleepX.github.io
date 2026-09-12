# Zixuan Zhao — personal website

A minimal English academic homepage, built with semantic HTML and responsive CSS.
No external fonts, dependencies, or build step.

The avatar uses a small vanilla JavaScript animation and SVG facial layers:
its eyes follow the pointer and it blinks naturally. After four seconds without
pointer movement, its tongue stays out until the pointer moves again. Animation pauses offscreen and in hidden tabs. Reduced-motion
preferences and disabled JavaScript retain the original static portrait.
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
On steep contours, unreachable paws release into a hanging pose instead of stretching.
Click-to-walk and drag-return share the same leg swing and body motion; contour
contact adjustments are applied to that gait when walking over text or the avatar.
Hold the cat over the portrait's face for four continuous seconds to fuse them.
Moving within the face keeps the timer going; leaving or releasing resets it.
Released cats fall onto separate eye, nose, mouth, hair, and shoulder contours,
then stay on the portrait until picked up again. The
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

Run `node --test tests/*.test.mjs` to check landing, route planning, and fusion.

## Local preview

Run `python3 -m http.server 4173` from this directory and visit <http://localhost:4173>.

## Deployment

GitHub Pages can serve the repository root directly. In Settings → Pages,
select deployment from the `main` branch and `/ (root)`.

Edit `index.html` for content and `assets/style.css` for presentation.
The previous site has been removed from the working tree and remains in Git history.
