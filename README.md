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

## Puzzle format

Puzzles live in `src/puzzles/pack/*.json`:

```json
{
  "id": "heart",
  "name": "Heart",
  "width": 5,
  "height": 5,
  "solution": [".#.#.", "#####", "#####", ".###.", "..#.."]
}
```

Each `solution` row is a string of `#` (filled) and `.` (empty). Clues are derived from the
solution. Add the id to `ORDER` in `src/puzzles/index.ts` to place it in the pack.

### Puzzle editor

Open `#/editor` (or "Make your own puzzle" on the puzzle list) to draw a picture, see its clues,
check that it has one solution reachable without guessing, and copy or download the JSON.

### Uniqueness check

`npm run check:puzzles` line-solves every puzzle in the pack from its clues alone and fails if
any puzzle has more than one solution or needs guessing. It also runs as part of `npm test` in
CI.
