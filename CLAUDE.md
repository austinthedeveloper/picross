# Picross

The 2D nonogram web game (Vite + TypeScript, no UI framework). Start with
`docs/architecture.md`; running, testing and deploys are in `docs/development.md`.

The repo root is an npm workspace (`"workspaces": ["apps/*", "packages/*"]`): the 2D game
is `apps/picross/` (workspace `picross`; its `src/`, `e2e/`, `public/` and `scripts/` are
there), the 3D game is `apps/cubed/`, and the code, styles, story and art both use are
`packages/shared/` (`@picross/shared`). The 2D game's engine, puzzle format, pack and
`Game` are `packages/grid/` (`@picross/grid`, no DOM), and its board view and play screen
are `packages/play-grid/` (`@picross/play-grid`). Run the npm scripts from the root; they
delegate with `npm -w apps/picross run …`. Docs, CI, lint config and the build and deploy
scripts stay at the root.

## Sibling projects read from this repo

- **Picross Cubed**, the 3D game, lives in `apps/cubed/` (an npm workspace; it used to be
  austinthedeveloper/picross-3d). It has its own `CLAUDE.md` and docs.
- **`packages/shared`** (`@picross/shared`, see its `README.md`) holds what both games use,
  imported as `@picross/shared/<path>`: the tokens and base styles, sound, haptics, theme,
  `dom`, `motion`, `storage`, `random`, the Home, mute and Flat | Cubed buttons, the story
  (scenes and backdrops with their loaders, `game/dialogue.ts`, `puzzles/gadgets.ts`, the
  chapters, runs, encounters and run-puzzle JSON), art, `ui/art.ts`, the dialogue and
  backdrop components, `sceneScreen.ts`, and the run, fight, dig, dialogue and art styles.
  **Changing one changes both games**, and the 3D game's tests (its story gate) fail if
  the story uses something it can't play. Nothing in it imports from an app (a test and a
  lint rule check); it reads the games' settings through `providePrefs` (`game/prefs.ts`).
- **`packages/grid`** (`@picross/grid`) and **`packages/play-grid`** (`@picross/play-grid`),
  see their `README.md`s: the 2D game split into what's pure (the engine, format, pack,
  murals and `Game`; it imports only shared's non-UI modules and runs its tests in Node)
  and the page side (board view, input, `renderGameScreen` and `PlaySession`, `board.css`
  and `game.css`; it imports grid and shared, never the app). A test and a lint rule in
  each check the imports.
- **The SNES demake** (`../snes/picross-snes`) imports the pack, art and story with
  `make import`: the pack from `packages/grid/src/puzzles/`, the story and art from
  `packages/shared/`.

The plan for combining the 2D and 3D games is `docs/combining.md`; the story ideas for it are `docs/story-combined.md`.

## Working here

- Before a PR: `npm run lint`, `npm test` (the packages, then both games),
  `npm run build` (both: Cubed lands in `dist/3d`), and `npm run e2e` / `npm run e2e:cubed`
  for UI changes.
- Stacked PRs: retarget each to `main` before merging it (see docs/development.md).
