# Picross

A nonogram (picross) puzzle game built with Vite and TypeScript.

## Getting started

Requires Node 20+.

```bash
npm install
npm run dev       # start the dev server
npm test          # run unit tests (Vitest)
npm run lint      # ESLint + Prettier check
npm run build     # type-check and build to dist/
```

## CI and deployment

`.github/workflows/ci.yml` runs lint, tests, and the build on every pull request and push.
Pushes to `main` are deployed to GitHub Pages (set **Settings → Pages → Source** to
**GitHub Actions** once).
