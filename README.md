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
route over page platforms back to its original spot. Short hops, ledge pull-ups,
and brief pauses make the return journey readable. Escape returns it home.

Run `node --test tests/cat-world.test.mjs` to check landing and route planning.

## Local preview

Run `python3 -m http.server 4173` from this directory and visit <http://localhost:4173>.

## Deployment

GitHub Pages can serve the repository root directly. In Settings → Pages,
select deployment from the `main` branch and `/ (root)`.

Edit `index.html` for content and `assets/style.css` for presentation.
The previous site has been removed from the working tree and remains in Git history.
