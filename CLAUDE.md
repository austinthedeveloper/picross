# Picross

Two nonogram games in one web app and one npm workspace (Vite + TypeScript, no UI
framework): the 2D game and Picross Cubed, the 3D one, with the code they share in packages.
Start with `docs/architecture.md`: its package map says where every file lives and what it
may import. Running, testing and deploys are in `docs/development.md`; the 3D game's own docs
are in `docs/cubed/`.

## Layout

- `apps/picross/`: the app (workspace `picross`). The 2D game's routes are `#/…`; Picross
  Cubed's are `#/cubed/…`, in `src/cubed/` (it used to be austinthedeveloper/picross-3d, then
  `apps/cubed`), loaded with one `import('./cubed/routes')` from `src/routes.ts`. `/3d/`
  (`public/3d/`) only sends Cubed's old links on and retires its old service worker.
- `packages/shared/` (`@picross/shared`): tokens, base and story styles, sound, haptics,
  theme, `dom`, `motion`, `storage`, `random`, puzzle ids, the shared buttons, and the art
  (`public/art/`). It reads each game's settings through `providePrefs` (`game/prefs.ts`).
- `packages/story/` (`@picross/story`): the story JSON, its loaders and checks, gadgets,
  dialogue and the scene player. Its gate is `boards.test.ts`.
- `packages/grid/` (`@picross/grid`) and `packages/play-grid/` (`@picross/play-grid`): the
  2D rules and data (no DOM), and the 2D board view and play screen.
- `packages/block/` (`@picross/block`) and `packages/play-block/` (`@picross/play-block`):
  the 3D rules and data (no three.js), and the three.js view and block screens.
- At the root: `docs/`, CI, `eslint.config.js`, prettier, and the build and deploy
  `scripts/`. Run npm scripts from the root.

Packages import as `@picross/<name>/<path>` (`src/<path>.ts`). Each has a `README.md`.
**Changing a package changes both games**: run all the tests.

## Import rules

Each package's `src/imports.test.ts` and its block in `eslint.config.js` check these.

- **shared:** only its own files.
- **story:** shared, outside `ui/` and `styles/`; its `ui/` may use all of shared; its
  tests may also use block.
- **grid:** shared and story, outside their `ui/` and `styles/`.
- **play-grid:** grid and shared.
- **block:** shared and story, outside their `ui/` and `styles/`; never three.js or
  play-block.
- **play-block:** block, shared, story and three.js.
- **the app:** any package. Nothing outside `src/cubed/` imports it, except `src/routes.ts`'s
  one `import('./cubed/routes')` (lint checks). Anything that pulls in three.js loads with
  `import()`, Cubed's list included (`check:budget` checks).

## Sibling projects

- **The SNES demake** (`../snes/picross-snes`) imports with `make import`: the pack from
  `packages/grid/src/puzzles/`, the story from `packages/story/src/puzzles/`, and the art
  from `packages/shared/public/art/`.

The plan for combining the 2D and 3D games is `docs/combining.md`; the story ideas for it
are `docs/story-combined.md`. Keep both games playable at every step.

## Working here

- Before a PR: `npm run lint`, `npm test` (every package, then the app), `npm run build`,
  `npm run check:bundle`, `npm run check:budget`, and `npm run e2e` for UI changes (both
  games; `npm run e2e:cubed` runs only Cubed's).
- Cubed's links go through `cubedHref()` (`src/cubed/href.ts`), never a bare `'#/…'`; a
  package screen it uses takes its home or links as an option (`home`, `sharedHref`).
- 3D-only: after adding or changing a block puzzle (`packages/block/src/puzzles/`), run
  `npm -w packages/block run puzzles` (writes `hide` and `passes`). Keep three.js out of
  every first view: screens with a block load with `import()`, and the list's cards (daily,
  story, dioramas) live in modules that don't import the view. No raw hex colors outside
  `tokens.css` and `voxels.css`. Puzzles and art are original: don't copy another game's
  puzzles, names or look.
- Stacked PRs: retarget each to `main` before merging it (see docs/development.md).
