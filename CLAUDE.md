# Picross

The 2D nonogram web game (Vite + TypeScript, no UI framework). Start with
`docs/architecture.md`; running, testing and deploys are in `docs/development.md`.

The repo root is an npm workspace (`"workspaces": ["apps/*", "packages/*"]`): the 2D game
is `apps/picross/` (workspace `picross`; its `src/`, `e2e/`, `public/` and `scripts/` are
there), the 3D game is `apps/cubed/`, the code, styles and art both use are
`packages/shared/` (`@picross/shared`), and the story both play is `packages/story/`
(`@picross/story`). The 2D game's engine, puzzle format, pack and
`Game` are `packages/grid/` (`@picross/grid`, no DOM), and its board view and play screen
are `packages/play-grid/` (`@picross/play-grid`). Run the npm scripts from the root; they
delegate with `npm -w apps/picross run …`. Docs, CI, lint config and the build and deploy
scripts stay at the root.

## Sibling projects read from this repo

- **Picross Cubed**, the 3D game, lives in `apps/cubed/` (an npm workspace; it used to be
  austinthedeveloper/picross-3d). It has its own `CLAUDE.md` and docs.
- **`packages/shared`** (`@picross/shared`, see its `README.md`) holds what both games use,
  imported as `@picross/shared/<path>`: the tokens and base styles, sound, haptics, theme,
  `dom`, `motion`, `storage`, `random`, the Home, mute and Flat | Cubed buttons, art
  (`public/art/`), `ui/art.ts`, and the run, fight, dig, dialogue and art styles.
  **Changing one changes both games.** Nothing in it imports from an app or another package
  (a test and a lint rule check); it reads the games' settings through `providePrefs`
  (`game/prefs.ts`).
- **`packages/story`** (`@picross/story`, see its `README.md`) is the story, read by both
  games: the chapters, runs, encounters and run-puzzle JSON, scenes and backdrops with
  their loaders, `puzzles/gadgets.ts`, `game/dialogue.ts`, the encounter, run and chapter
  parsers (each game passes its own puzzle and enemy), and the scene player
  (`ui/components/dialogue.ts`, `backdrop.ts`, `ui/screens/sceneScreen.ts`). It imports
  only shared (its pure modules outside `ui/`); grid, block, play-block and both apps
  import it. Its gate (`boards.test.ts`) reports which boards play each encounter and
  power, and fails on broken data, such as a switching boss with no block.
- **`packages/grid`** (`@picross/grid`) and **`packages/play-grid`** (`@picross/play-grid`),
  see their `README.md`s: the 2D game split into what's pure (the engine, format, pack,
  murals and `Game`; it imports only shared's non-UI modules and runs its tests in Node)
  and the page side (board view, input, `renderGameScreen` and `PlaySession`, `board.css`
  and `game.css`; it imports grid and shared, never the app). A test and a lint rule in
  each check the imports.
- **The SNES demake** (`../snes/picross-snes`) imports the pack, art and story with
  `make import`: the pack from `packages/grid/src/puzzles/`, the story from
  `packages/story/src/puzzles/`, and the art from `packages/shared/public/art/`.

The plan for combining the 2D and 3D games is `docs/combining.md`; the story ideas for it are `docs/story-combined.md`.

## Working here

- Before a PR: `npm run lint`, `npm test` (the packages, then both games),
  `npm run build` (both: Cubed lands in `dist/3d`), and `npm run e2e` / `npm run e2e:cubed`
  for UI changes.
- Stacked PRs: retarget each to `main` before merging it (see docs/development.md).
