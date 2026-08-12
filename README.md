# Aura — Fluid Drag Interactions

A responsive, editorial dashboard experience built as a zero-dependency static site. It combines draggable interface cards, live canvas atmosphere, compact operational metrics, scroll reveals, adaptive motion, and accessible keyboard interactions.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Publish

The included GitHub Actions workflow deploys the static files to GitHub Pages on pushes to `main` or the Arena working branch. In **Settings → Pages**, set the source to **GitHub Actions** if it is not already selected.

## Stack

- Semantic HTML
- Responsive CSS
- Vanilla JavaScript
- Canvas 2D ambient field
- Plus Jakarta Sans + JetBrains Mono
