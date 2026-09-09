# Zixuan Zhao — personal website

A minimal English academic homepage, built with semantic HTML and responsive CSS.
No external fonts, dependencies, or build step.

The avatar uses a small vanilla JavaScript animation and SVG facial layers:
its eyes follow the pointer, it blinks naturally, and occasionally sticks out
its tongue. Animation pauses offscreen and in hidden tabs. Reduced-motion
preferences and disabled JavaScript retain the original static portrait.

## Local preview

Run `python3 -m http.server 4173` from this directory and visit <http://localhost:4173>.

## Deployment

GitHub Pages can serve the repository root directly. In Settings → Pages,
select deployment from the `main` branch and `/ (root)`.

Edit `index.html` for content and `assets/style.css` for presentation.
The previous site has been removed from the working tree and remains in Git history.
