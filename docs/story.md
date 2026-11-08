# Story mode

Rook and Dee's odd jobs from the 2D game, played on blocks. **The 2D game is the source of
truth for the story**: its scenes, chapters, jobs, encounters, enemies and art are shared
here verbatim, and this game fits them to blocks.

## What's shared, and what's this game's own

| From the 2D game (shared, don't edit)                                          | This game's own                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `src/puzzles/{scenes,backdrops,chapters,runs,encounters,run}/*.json`           | `src/puzzles/story/*.json`: a 3D puzzle per encounter puzzle |
| `src/puzzles/{scenes,backdrops,gadgets}.ts`, `src/game/dialogue.ts`            | `src/story/data.ts`: reads the jobs for blocks               |
| `src/ui/{art.ts,components/dialogue.ts,components/backdrop.ts}`                | `src/game/{run,runSave,battle}.ts`                           |
| `src/ui/screens/sceneScreen.ts`, `src/styles/{run,fight,dig,dialogue,art}.css` | `src/ui/screens/story/*`: board, map, encounters, fights     |
| `public/art/{cast,enemies,gadgets,icons}/`                                     |                                                              |

`npm run sync:web` copies the shared files (see [Shared files](shared-files.md)).

## Fitting the story to blocks

`src/story/data.ts` loads the shared JSON:

- **Puzzles.** Each encounter names a 2D puzzle; its 3D version is
  `src/puzzles/story/<that id>.json`, same id and name. Draw them in
  `src/puzzles/sheets/story/<chapter>.txt` and export with
  `npm run puzzles -- --sheet …`. A dig's reward is the 2D puzzle's `gadget`.
- **Enemies.** The 2D game's powers name exact rows and columns. A block has other lines,
  so here a power keeps its size ("fog over 5 lines", "armor with 2 targets") and the fight
  picks lines on the block when it starts, keeping the block solvable.
- Jobs, chapters, scenes, rests, Overtime and boss fights come over as they are.

## The gate

Anything the 2D story uses that this game can't play goes into `storyIssues` instead of
breaking the app: an unknown field, an unknown kind, scene or gadget, or an encounter with
no 3D puzzle. `src/story/story.test.ts` fails while there are any. That's the compatibility
gate: the daily **Sync from the web game** workflow (`.github/workflows/sync-web.yml`) runs
the sync and the tests, and opens a PR when they pass or a "Web sync needs porting" issue
listing what failed.

When the 2D game adds something:

1. A new encounter: draw its 3D puzzle (above).
2. A new enemy field or power: read it in `parseEnemy` and play it in the fight
   (`src/game/battle.ts`, `src/ui/screens/story/fight.ts`), then add it to `KNOWN`.
3. A new scene, backdrop or line: nothing to do; it's shared.
