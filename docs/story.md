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

## Fights

`src/game/battle.ts` (pure, tested) and `src/ui/screens/story/fight.ts` (the bar).

- **Finished lines** are judged by the truth: every cube that isn't the shape broken, none
  that is (an all-shape line is finished once painted). Each chips the enemy 1 HP, never
  below 1; the solved shape lands the rest (the finisher).
- **HP** is the 2D enemy's, scaled by how many more lines the block has than the 2D board,
  so phases come at the same point in the fight.
- **Clues.** An enemy that hides clues (fog, scrambles, forgeries) starts from every clue
  shown, then hides its own; others keep the puzzle's usual hidden clues. Every pick is
  checked with the solver from what's correctly on the board, so the block stays solvable.
- **Powers on a block:**

| Power     | On a block                                                                           |
| --------- | ------------------------------------------------------------------------------------ |
| Fog       | Lines' clue faces fogged over; finishing a line clears it                            |
| Scramble  | A dashed ring: the count is right, the pieces unknown, until the line's finished     |
| Armor     | ◎ target lines do triple damage; every 5 other lines it hits back for 2              |
| Forgeries | `?` suspect lines, some forged (one off); finished honest ones get a ✓; 🔍 Call out  |
| Charge    | After a warm-up, lines fill the ⚡ meter; the yellow live line grounds it; full zaps |
| Ink       | Splashes over a patch of a layer hide clues and paint; finishing a line washes it    |
| Swap      | The two lines with the most of your work wiped back to solid cubes                   |
| Turn      | Every few lines the block turns a quarter under you and peels drop (on a block, a    |
|           | turn is the same as walking round it, so it's your view that turns)                  |

- **Gadgets:** a bomb deals 2 and works out one line; a patch kit blocks the next hit; a
  sponge washes off all ink.
- **Hits** (Hits on only): breaking a cube of the shape (the enemy's attack), armor, zaps,
  and accusing an honest clue. In Relaxed, an honest accusation heals the enemy instead.
- **Tips:** a card the first time each power shows (`src/story/powers.ts`), and ⓘ lists them.

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
