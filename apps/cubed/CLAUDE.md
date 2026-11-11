# Picross Cubed

3D picross in Vite + TypeScript + three.js. The 2D game (`../picross`, in the same repo) is its sibling and the reference for look and feel.

- Read `docs/architecture.md` first; puzzles are in `docs/how-to.md`.
- Before committing: `npm run lint`, `npm test`, `npm run build`, and `npm run e2e` for UI changes.
  This app's `npm test` covers only `src/`; the packages' tests run from the repo root
  (`npm test` there, or `npm run test:block`, `npm run test:play-block` and
  `npm run test:story`; the story's gate is in `packages/story`).
- After adding or changing a puzzle (in `packages/block/src/puzzles/`): `npm run puzzles`
  (writes `hide` and `passes`).
- Code, styles and art shared with the 2D game live in `packages/shared`, and the story in
  `packages/story` (at the repo root; see their `README.md`s), imported as
  `@picross/shared/<path>` and `@picross/story/<path>`. A change there is
  in both games: run both games' tests.
- The block's rules and data (engine, puzzles, pack, Game, Battle, the story loader) are in
  `packages/block`, and the three.js view, play, fight and editor screens and their styles
  in `packages/play-block` (see their `README.md`s). The 2D game imports them too, for the
  Curator's block phases: run both games' tests after changing them.
- No raw hex colors outside `packages/shared/src/styles/tokens.css` and
  `packages/play-block/src/styles/voxels.css`.
- Puzzles and art are original. Genre mechanics are fine; don't copy another game's puzzles,
  names or look.
- Nothing in `packages/` imports from an app, `packages/block` never imports three.js, and
  neither app imports the other (tests and lint rules check).
- Combining the two games is planned in `../../docs/combining.md` (at the repo root); keep both working on their own
  until then.
