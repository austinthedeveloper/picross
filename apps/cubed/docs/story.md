# Story mode

Rook and Dee's odd jobs from the 2D game, played on blocks. **The 2D game is the source of
truth for the story**: its scenes, chapters, jobs, encounters and enemies are in
`packages/story` (and the art in `packages/shared`), which both games import, and this game
fits them to blocks.

## What's shared, and what's this game's own

| Shared with the 2D game                                                                           | This game's own                                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/story`: `src/puzzles/{scenes,backdrops,chapters,runs,encounters,run}/*.json`            | `packages/block/src/puzzles/story/*.json`: a 3D puzzle per encounter puzzle       |
| `packages/story`: `src/puzzles/{runs,chapters,scenes,backdrops,gadgets}.ts`, `game/dialogue`      | `packages/block/src/story/data.ts`: the story fitted to blocks                    |
| `packages/story`: `src/ui/{components/dialogue.ts,components/backdrop.ts,screens/sceneScreen.ts}` | `src/game/{run,runSave}.ts`, `packages/block/src/game/battle.ts`                  |
| `packages/shared`: `src/ui/art.ts`, `src/styles/{run,fight,dig,dialogue,art}.css`                 | `src/ui/screens/story/*`: board, map, encounters; fights in `packages/play-block` |
| `packages/shared`: `public/art/{cast,enemies,gadgets,icons}/`                                     |                                                                                   |

Both packages are at the repo root, imported by both games (see their READMEs:
[story](../../../packages/story/README.md), [shared](../../../packages/shared/README.md)).

## Fitting the story to blocks

`packages/block/src/story/data.ts` loads the story with `@picross/story`'s loaders, which
read and check what every board shares (kinds, rests, scenes, gadgets, jobs, chapters) and
throw on broken data. It passes in what's this game's own:

- **Puzzles.** Each encounter names a 2D puzzle; its 3D version is
  `packages/block/src/puzzles/story/<that id>.json`, same id and name. Draw them in
  `packages/block/src/puzzles/sheets/story/<chapter>.txt` and export with
  `npm run puzzles -- --sheet …`. A dig's reward is the 2D puzzle's `gadget`.
- **Enemies.** The 2D game's powers name exact rows and columns. A block has other lines,
  so here a power keeps its size ("fog over 5 lines", "armor with 2 targets") and the fight
  picks lines on the block when it starts, keeping the block solvable.
- Jobs, chapters, scenes, rests, Overtime and boss fights come over as they are.

## Fights

`packages/block/src/game/battle.ts` (pure, tested) and
`packages/play-block/src/ui/screens/story/fight.ts` (the bar).

- **Finished lines** are judged by the truth: every cube that isn't the shape broken, none
  that is (an all-shape line is finished once painted). Each chips the enemy 1 HP, never
  below 1; the solved shape lands the rest (the finisher).
- **HP** is the 2D enemy's, scaled by how many more lines the block has than the 2D board,
  so phases come at the same point in the fight.
- **Clues.** An enemy that hides clues (fog, scrambles, forgeries) starts from every clue
  shown, then hides its own; others keep the puzzle's usual hidden clues. Every pick is
  checked with the solver from what's correctly on the board, so the block stays solvable.
- **Powers on a block:**

| Power     | On a block                                                                             |
| --------- | -------------------------------------------------------------------------------------- |
| Fog       | Lines' clue faces fogged over; finishing a line clears it                              |
| Scramble  | A dashed ring: the count is right, the pieces unknown, until the line's finished       |
| Armor     | ◎ target lines do triple damage; every 5 other lines it hits back (its armor's attack) |
| Forgeries | `?` suspect lines, some forged (one off); finished honest ones get a ✓; 🔍 Call out    |
| Charge    | After a warm-up, lines fill the ⚡ meter; the yellow live line grounds it; full zaps   |
| Ink       | Splashes over a patch of a layer hide clues and paint; finishing a line washes it      |
| Swap      | The two lines with the most of your work wiped back to solid cubes                     |
| Turn      | Every few lines the block turns a quarter under you and peels drop (on a block, a      |
|           | turn is the same as walking round it, so it's your view that turns)                    |

- **Gadgets:** a bomb deals 2 and works out one line; a patch kit blocks the next hit; a
  sponge washes off all ink.
- **Undo** can't go back past a wipe or a bomb (they're outside the history).
- **Hits** (Hits on only): breaking a cube of the shape (the enemy's attack), armor, zaps,
  and accusing an honest clue. In Relaxed, an honest accusation heals the enemy instead.
- **Tips:** a card the first time each power shows (`packages/block/src/story/powers.ts`), and ⓘ lists them.

## Tests

- `packages/story/src/boards.test.ts`: the gate (below)
- `packages/block/src/story/story.test.ts`: every chapter, and every job it can play, loads
  with a 3D puzzle for each encounter
- `packages/block/src/game/battle.test.ts`: the fight rules
- `e2e/story.spec.ts`: the whole First Job by hand, and a Hits-on hit and resume
- `e2e/fights.spec.ts`: one test per power or system
- `e2e/chapters.spec.ts`: every chapter from its opening through each job to its boss,
  with each encounter seeded one cube short of solved (so it checks the flow quickly),
  and that cleared jobs offer their Overtime and boss fights

## The gate

Anything the story uses that this game can't play yet goes into `storyIssues` and is left
out, instead of breaking the app: an encounter with no 3D puzzle (and the jobs that need
it), or a field `parseEnemy` doesn't read (`KNOWN`). The gate is a test in the story
package, `packages/story/src/boards.test.ts`: for every encounter and power it reports the
boards that can play it, and prints `storyIssues`, with every `npm test`. It doesn't fail
on those (#167 makes it a hard check once every power runs on both boards).

It does fail on broken data: the story's loaders throw on an unknown kind, scene, gadget,
encounter or job, and the gate fails if a boss that switches to a block has no block here
(or its phases don't match), since the 2D game plays those phases with this game's fight.

When the 2D game adds something:

1. A new encounter: draw its 3D puzzle (above).
2. A new enemy field or power: read it in `parseEnemy` and play it in the fight
   (`packages/block/src/game/battle.ts`, `packages/play-block/src/ui/screens/story/fight.ts`), then add it to `KNOWN`.
3. A new scene, backdrop or line: nothing to do; it's shared.

A phase's `board` (a boss that switches between a flat board and a block in the 2D story)
is read and ignored: here every fight is on a block already.

### Used by the 2D story

A switching boss's block phases in the 2D story run this game's fight screen
(`fightKind`), its `Battle` and its play screen, from `packages/play-block` and
`packages/block`, loaded on demand. So
`fightKind` takes its run through a `FightRun` (this game's story run by default), can be
handed a `Battle` and HP to `carry` over, and calls `phased` after a phase starts. Keep
those working when changing the fight; the root's `e2e/switching-boss.spec.ts` covers them.
