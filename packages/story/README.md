# @picross/story

The story both games play: Rook and Dee's chapters, jobs (runs), encounters, scenes,
dialogue, gadgets and backdrops, with the code that reads and checks them and the scene
player. The 2D game and Picross Cubed (both in `apps/picross`) import it, and so do
the board packages (`@picross/grid`, `@picross/block`, `@picross/play-block`). It came out
of `packages/shared` and the 2D game's `src/puzzles/` in #146.

It's plain TypeScript with no build step: each app's Vite compiles it.

## What's in it

The paths under `src/` are the ones these files had before, so
`packages/shared/src/puzzles/scenes.ts` is now `src/puzzles/scenes.ts` here, and the 2D
game's `src/puzzles/runs.ts` (its common part) is `src/puzzles/runs.ts`.

| What         | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data         | `src/puzzles/{chapters,runs,encounters,run,scenes,backdrops}/*.json`; `files/` globs the first four for the loaders                                                                                                                                                                                                                                                                                                                                                          |
| Loaders      | `src/puzzles/runs.ts` (encounters and jobs), `chapters.ts`, `scenes.ts`, `backdrops.ts`, `gadgets.ts` (the gadget catalog)                                                                                                                                                                                                                                                                                                                                                   |
| Dialogue     | `src/game/dialogue.ts`: the scene runner (current line or choices, advance, choose, flags)                                                                                                                                                                                                                                                                                                                                                                                   |
| Fights       | `src/fight/board.ts`: `FightBoard`, what a fight needs of a board (#164); `fightBoardContract.ts`, its tests; `battle.ts`: `StoryBattle`, the one battle (#166), played by a `FightRules` profile (`rules.ts`); `switch.ts`: a boss that switches board, one fight on two boards (`boardAt`, `hpShare`; the battle's `enterBoard`, #170); `save.ts`: a fight as a run saves it, an entry per board (#169); `tips.ts`: each power's tip on each board, and `tipToShow` (#167) |
| Scene player | `src/ui/components/dialogue.ts`, `backdrop.ts`, `src/ui/screens/sceneScreen.ts`; the fights' one battle bar, `src/ui/components/battleBar.ts` (#171)                                                                                                                                                                                                                                                                                                                         |
| Tests        | `src/story.test.ts` (the whole story reads), `boards.test.ts` (the gate), `ui/art.test.ts` (every sprite has its art)                                                                                                                                                                                                                                                                                                                                                        |

The art (`public/art/`) and the story's styles (`run.css`, `fight.css`, `dig.css`,
`dialogue.css`, `art.css`) and `ui/art.ts` stay in `@picross/shared`: they don't read the
story, and every screen uses them.

## Importing it

Each app (and grid, block and play-block) lists `"@picross/story": "*"` in its
`package.json`. Import by path, without the extension (the `exports` map is `./*` →
`./src/*.ts`):

```ts
import { getScene } from '@picross/story/puzzles/scenes';
import { parseEncounter } from '@picross/story/puzzles/runs';
import { renderSceneScreen } from '@picross/story/ui/screens/sceneScreen';
```

## One loader, a fit per board

Both games read the same encounters, jobs and chapters. What's the same on every board is
read and checked here, and throws on anything broken: an encounter's id, name, kind, rest
and scene; a job's HP, encounters, gadgets, scenes and the jobs it names
(`checkRunLinks`); a chapter's jobs and opening, and that every job is in exactly one
chapter (`assembleChapters`).

What differs is each game's, passed in:

- **The puzzle and the enemy:** `parseEncounter(data, fit)` takes an `EncounterFit`: the
  encounter's puzzle on that board, and the enemy read against it. The 2D game passes its
  grid puzzles and `enemies.ts` (which checks every power against the grid); Cubed
  (`packages/block/src/story/data.ts`) passes its 3D puzzle and an enemy fitted to a block.
- **The jobs:** `parseRun(data, findEncounter)` and `parseChapter(data, findJob)` find the
  game's own encounters and jobs. Cubed's `findJob` gives `null` for a job it can't play
  yet, which leaves it out of the chapter; an id the story doesn't have is still an error.
- **The lists:** each game keeps its own (`runs`, `overtimeRuns`, `bossFights` in the 2D
  game's `src/puzzles/runs.ts`; `jobs`, `overtimeFor` in Cubed's loader).

## The gate: `boards.test.ts`

For every encounter and power, the boards that can play it. Flat plays an encounter whose
2D puzzle is in `run/`, and every power (the 2D game's loader throws on what it can't
play). A block plays an encounter with a 3D puzzle (`packages/block/src/puzzles/story/`),
and a power whose fields Cubed's loader reads (`KNOWN`). It prints what it finds with every
test run:

```
The story on each board: 93 of 93 encounters play on both.
  flat + block: 93 encounters
Powers:
  fog: flat + block (45 encounters)
  ...
Cubed plays all of it.
```

Every power runs on both boards (#167; the parity test is
`apps/picross/src/game/powers.test.ts`), so it's a hard check: it fails if an encounter or a
power can't be played on either board, if Cubed's loader has anything in `storyIssues`, or
if a power has no tip for each board (`fight/tips.ts`). Broken data fails too: the story's
loaders throw on it (`story.test.ts` reads the whole story with no board), and so does a
boss that switches to a block with no block to switch to, or whose block's phases don't
match.

## The rules

- **Below the games and the boards:** it never imports an app, `@picross/grid`,
  `@picross/play-grid`, `@picross/block` or `@picross/play-block`; they import it. Its
  tests may use `@picross/block` (a dev dependency), for the gate.
- **Above shared:** it imports `@picross/shared`, and `@picross/shared` never imports it.
- **Pure outside `ui/`:** the data, loaders and dialogue use only shared's pure modules
  (never `@picross/shared/ui` or its styles) and never this package's `ui/`, so grid and
  block (which have no page) can import them.

`src/imports.test.ts` checks all three, and `eslint.config.js` says the same with
`no-restricted-imports`.

### Why the scene player moved here

The scene player (`ui/components/dialogue.ts`) loads a scene's backdrop with
`getBackdrop`, and all three files take a `Scene`. Left in `@picross/shared`, it would
have needed the story (a cycle), or every scene's backdrop passed in by each caller. Moved
here, it imports the story directly and shared's `ui/` (`dom`, `art`, `motion`, `sound`)
from above, and no caller changed but the import path. `ui/art.ts` and the styles don't
read the story, so they stayed in shared. The art test, which checks the story's sprites
and portraits against shared's `public/art/`, moved here and reads that folder by its path:
the one path out of the package.

## Fights over any board

`src/fight/board.ts` is the interface the story's fights are written against (#163):
`FightBoard<C>`, a board's lines, clues and the picks that depend on its cells (the live
line, ink, a swap, a bomb's spot, forgeries, solvability, a turn). The grid implements it
in `@picross/grid/game/fightBoard` and the block in `@picross/block/game/fightBoard`; each
method says why it's there and which power uses it.

`src/fight/fightBoardContract.ts` is one set of tests any `FightBoard` must pass. It isn't
a `*.test.ts`, so it doesn't run here: each board's tests call
`fightBoardContract(name, { fresh, worked })` on their own puzzles. It imports `vitest`,
which `imports.test.ts` allows in any file.

### One battle

`src/fight/battle.ts` is the fight itself, once for every board (#166): `StoryBattle<C, M,
E>`, with HP, phases, armor, the charge, turns, shields, call-outs and gadgets. It's Cubed's
`Battle` generalized: `C` is the board's clue, `M` its marks (a block's cubes), `E` the
enemy as the board's story reads it (a `FightEnemy`). It takes the enemy, a `FightRules`
profile, a `BattleBoard` (`at(marks?)` gives the `FightBoard` with those marks on it, or a
blank one; `scrambled(clue)` is what a scrambled clue shows), Hits on or off, and a saved
`FightState` or a seed. Every draw comes from its one seeded generator, which a reload
restarts from the seed and the lines struck.

- **`FightState<C>`** is plain data, saved with the run: Cubed's `BattleState` field for
  field, plus optional ones the 2D game needs (`turn.turns`, `counts.bombsUsed` and
  `spongesUsed`, and a charge with no `warmUp` until it first shows on a grid), so a block
  fight saved before #166 loads as it is. The 2D game saves its own shape and translates
  (its `game/battleCodec.ts`).
- **A power's lines** are a `LinePick`: a `count`, which the battle picks at runtime among
  lines that keep the board solvable (a block's enemies, and a plain number means this), or
  a `pool` in priority order, proven fair offline, of which it takes the first `count` not
  finished or already taken (what a 2D enemy names).
- **`FightRules`** (`src/fight/rules.ts`) has one field for each place the two games' fights
  differ: whether a forged line you finish counts, what the armor hits back for and what
  the enemy hits for while it's armored, which lines the charge can't go live on, whether a
  Relaxed fight counts mistakes and zaps, whether bombs and sponges are counted apart, how
  long the Mimic's wipe marks last, and the order a stroke's effects land. Each field says
  what each board does and why. `BLOCK_RULES` is Cubed's fight exactly, `GRID_RULES` the
  2D game's. What's the board's (the warm-up, which line goes live, ink, a swap, a bomb)
  stays behind `FightBoard`.
- **The two orders.** The block's is `update(marks)`, which polls the board for finished
  lines, with `callOut`, `bomb`, `shieldUp`, `wash` and `carry`. The grid's is the section
  at the end of the class, one public step per rule (`chip`, `clear`, `startPhases`,
  `armorMeter`, `chargeMeter`, `aim`, `applyTurn`, …), which `finished(lines, marks)` runs
  in order for the lines a grid's board reports. `accuse`, `use` and `damage` start phases
  as a grid does, and what waits comes back as `due` events (`GridEvent`) for the caller to
  land: `landSwap`, `landTurn`, `landInk`, `landZap`, `landHitBack`, `landBlast`. On a
  grid, `update` throws: only the board can say a line was refilled.

Both games' fights run on it. `@picross/block/game/battle`'s `Battle` is `StoryBattle` with
`BLOCK_RULES` on the block's board, so Cubed's golden traces (`battleTraces.test.ts`) and
battle tests are its tests. The 2D game plays it with `GRID_RULES` through `gridStep`
(`apps/picross/src/game/fight.ts`), so its hooks harness, golden traces and `battle.test.ts`
are too. `src/fight/battle.test.ts` here checks the rest on a block: each rule's other
value, powers from a pool, and the grid's order.

## Tests

`npm test` at the root runs this package's tests (`tsc --noEmit && vitest run`) after
shared's; `npm run test:story` runs just these.

## Outside this repo

The SNES demake (`../snes/picross-snes`) imports the story with `make import`. It's here
now: `src/puzzles/{chapters,runs,encounters,run,scenes,backdrops}/`. The art is still in
`packages/shared/public/art/`.
