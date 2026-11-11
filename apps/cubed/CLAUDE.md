# Picross Cubed

3D picross in Vite + TypeScript + three.js. The 2D game (`../picross`, in the same repo) is its sibling and the reference for look and feel.

- Read `docs/architecture.md` first; puzzles are in `docs/how-to.md`.
- Before committing: `npm run lint`, `npm test`, `npm run build`, and `npm run e2e` for UI changes.
- After adding or changing a puzzle: `npm run puzzles` (writes `hide` and `passes`).
- Code, styles, story and art shared with the 2D game live in `packages/shared` (at the
  repo root; see its `README.md`), imported as `@picross/shared/<path>`. A change there is
  in both games: run both games' tests.
- No raw hex colors outside `packages/shared/src/styles/tokens.css` and `src/styles/voxels.css`.
- Puzzles and art are original. Genre mechanics are fine; don't copy another game's puzzles,
  names or look.
- Nothing in `packages/shared` imports from an app (a test and a lint rule check).
- Combining the two games is planned in `../../docs/combining.md` (at the repo root); keep both working on their own
  until then.
