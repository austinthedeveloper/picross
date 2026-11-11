# Picross

The 2D nonogram web game (Vite + TypeScript, no UI framework). Start with
`docs/architecture.md`; running, testing and deploys are in `docs/development.md`.

The repo root is an npm workspace (`"workspaces": ["apps/*"]`): the 2D game is
`apps/picross/` (workspace `picross`; its `src/`, `e2e/`, `public/` and `scripts/` are there)
and the 3D game is `apps/cubed/`. Run the npm scripts from the root; they delegate with
`npm -w apps/picross run …`. Docs, CI, lint config and the build and deploy scripts stay at
the root.

## Sibling projects read from this repo

- **Picross Cubed**, the 3D game, lives in `apps/cubed/` (an npm workspace; it used to be
  austinthedeveloper/picross-3d). It has its own `CLAUDE.md` and docs, and copies some files
  from `apps/picross/src/` verbatim with `npm -w apps/cubed run sync:web`; CI checks the copies
  match (`npm run check:cubed`). The list
  is `SHARED` in its `scripts/sync-web.mjs` (also in `docs/shared-files.md` here): the
  tokens and base styles, sound, haptics, theme, `dom`, `motion`, `storage`, `random`, the
  Home and mute buttons, the story (scenes and backdrops with their loaders and tests,
  `game/dialogue.ts`, `puzzles/gadgets.ts`, the chapters, runs, encounters and run-puzzle
  JSON), art, `ui/art.ts`, the dialogue and backdrop components, `sceneScreen.ts`, and the
  run, fight, dig, dialogue and art styles. **Changing one changes the 3D game at its next
  sync**, and the 3D game's tests (its story gate) fail if the story uses something it
  can't play. Keep those files free of imports outside that list.
- **The SNES demake** (`../snes/picross-snes`) imports the pack, art and story with
  `make import`, from `apps/picross/` (see `docs/shared-files.md`).

The plan for combining the 2D and 3D games is `docs/combining.md`; the story ideas for it are `docs/story-combined.md`.

## Working here

- Before a PR: `npm run lint`, `npm run check:cubed`, `npm test` (both games), `npm run build`
  (both: Cubed lands in `dist/3d`), and `npm run e2e` / `npm run e2e:cubed` for UI changes.
- Changing a shared file: run `npm -w apps/cubed run sync:web` and commit the copies too.
- Stacked PRs: retarget each to `main` before merging it (see docs/development.md).
