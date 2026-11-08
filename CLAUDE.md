# Picross Cubed

3D picross in Vite + TypeScript + three.js. The 2D game (`../picross`,
austinthedeveloper/picross) is its sibling and the reference for look and feel.

- Read `docs/architecture.md` first; puzzles are in `docs/how-to.md`.
- Before committing: `npm run lint`, `npm test`, `npm run build`, and `npm run e2e` for UI changes.
- After adding or changing a puzzle: `npm run puzzles` (writes `hide` and `passes`).
- Never edit the files listed in `docs/shared-files.md`; change them in the 2D game and
  `npm run sync:web`.
- No raw hex colors outside `src/styles/tokens.css` and `src/styles/voxels.css`.
- Puzzles and art are original. Genre mechanics are fine; don't copy another game's puzzles,
  names or look.
