# Picross

The 2D nonogram web game (Vite + TypeScript, no UI framework). Start with
`docs/architecture.md`; running, testing and deploys are in `docs/development.md`.

## Sibling projects read from this repo

- **Picross Cubed** (`../picross-3d`, austinthedeveloper/picross-3d), the 3D game, copies
  some files from here verbatim with `npm run sync:web` and a daily sync workflow. The list
  is `SHARED` in its `scripts/sync-web.mjs` (also in `docs/shared-files.md` here): the
  tokens and base styles, sound, haptics, theme, `dom`, `motion`, `storage`, `random`, the
  Home and mute buttons, the story (scenes and backdrops with their loaders and tests,
  `game/dialogue.ts`, `puzzles/gadgets.ts`, the chapters, runs, encounters and run-puzzle
  JSON), art, `ui/art.ts`, the dialogue and backdrop components, `sceneScreen.ts`, and the
  run, fight, dig, dialogue and art styles. **Changing one changes the 3D game at its next
  sync**, and the 3D game's tests (its story gate) fail if the story uses something it
  can't play. Keep those files free of imports outside that list.
- **The SNES demake** (`../snes/picross-snes`) imports the pack, art and story with
  `make import`.

The plan for combining the 2D and 3D games into one is `docs/combining.md` in picross-3d.

## Working here

- Before a PR: `npm run lint`, `npm test`, `npm run build`, and `npm run e2e` for UI changes.
- Stacked PRs: retarget each to `main` before merging it (see docs/development.md).
