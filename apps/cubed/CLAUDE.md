# Picross Cubed

The 3D game, in Vite + TypeScript + three.js. The repo root's `CLAUDE.md` covers the
layout, the import rules and the before-a-PR checklist; this file is only what's 3D. The
2D game is the reference for look and feel.

- Docs: `docs/cubed/` at the repo root (`architecture.md` first; puzzles in `how-to.md`, the
  story on blocks in `story.md`).
- Most of the code is in `packages/block` (rules and data) and `packages/play-block` (the
  three.js view and screens). The 2D game imports both for the Curator's block phases.
- This app's `npm test` covers only its `src/`. Run `npm test` at the root, or
  `npm run test:block` / `test:play-block` / `test:story`.
- After adding or changing a puzzle (in `packages/block/src/puzzles/`): `npm run puzzles`
  here (writes `hide` and `passes`).
- three.js: keep it out of the first download. Screens with a block load with `import()`,
  and the list's cards (daily, story, dioramas) live in modules that don't import the view.
  The view draws only when something changes.
- No raw hex colors outside `packages/shared/src/styles/tokens.css` and
  `packages/play-block/src/styles/voxels.css`.
- Puzzles and art are original. Genre mechanics are fine; don't copy another game's puzzles,
  names or look.
