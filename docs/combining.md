# Combining the 2D and 3D games

The plan for one game with both: free play in 2D and 3D, one story, and fights that change
dimension, like a boss that's a 2D board until it pulls the picture into a block halfway
through. Steps 1 to 3 are done: both games live in this repo and share their code as
packages. Steps 4 and on are still the plan.

## Progress

**Steps 1 to 3 are done** (milestone M4, #141). Picross Cubed came into this repo with its
history (a subtree merge) as `cubed/`. Then:

- **#219 (#142): `apps/`.** The 2D game moved into `apps/picross/` and Cubed into
  `apps/cubed/`, with the root as the workspace root. One install (`npm ci`), one CI, one
  site: `npm run build` builds Flat at the root of `dist/` and Cubed into `dist/3d/`
  (`scripts/build-cubed.mjs`), and GitHub Pages and the Azure site serve both. A **Flat |
  Cubed** switch at the top of both home screens moves between the games and remembers the
  last one.
- **#220 (#143): `packages/shared`.** The files Cubed used to copy became one package that
  both games import. The sync script, `shared.lock.json` and `check:cubed` are gone.
- **#221 (#144): `packages/grid` and `packages/play-grid`.** The 2D engine, format, pack,
  murals and `Game` (no DOM), and the 2D board view and play screen.
- **#222 (#145): `packages/block` and `packages/play-block`.** The 3D rules and data (no
  three.js), and the three.js view and screens. Cubed and the Curator's block phases both
  import them; neither app imports the other.
- **#223 (#146): `packages/story`.** The story lives once and is read and checked once for
  both games; each game passes in its own puzzle and enemy per encounter. The story gate is
  a test there (`boards.test.ts`) that reports, for every encounter and power, the boards
  that can play it, and fails only on broken data.

Two more pieces of M4 prepare for step 4:

- **#224 (#147): puzzle ids with a dimension.** `packages/shared/src/puzzles/ids.ts`
  qualifies an id (`qualify('grid', 'mug')` is `grid:mug`) and parses one back. Nothing
  reads qualified ids yet. A test in the 2D app lists the ids both packs share (46 in free
  play), so a new clash shows up in review. Content files don't change; save
  keys moved in #155.
- **#225 (#148): a bundle budget.** `npm run check:budget` fails CI if three.js reaches
  either game's first download, or if the entry JS or CSS grows more than 10% over
  `scripts/bundle-budget.json` (see [development.md](development.md#ci-and-deploys)).

The SNES demake's `make import` reads the pack from `packages/grid/src/puzzles/`, the
story from `packages/story/src/puzzles/` and the art from `packages/shared/public/art/`.
Where every package lives and what it may import is the package map in
[architecture.md](architecture.md#package-map). The story ideas for the combined game are
in [story-combined.md](story-combined.md).

**Step 4 has begun** (milestone M5, #150). Its first PR moves Cubed's app layer into the one
app (the routes half of #152, and the in-repo half of #161):

- **Cubed's screens are under `#/cubed/…`** in `apps/picross` (`src/cubed/`), loaded with one
  `import()` from the new route table (`src/routes.ts`), so its list, pack and styles stay
  out of the first download and three.js waits for a screen with a block. `apps/cubed`,
  `scripts/build-cubed.mjs`, `dev:cubed` and `test:cubed` are gone; one build, one unit test
  run, one browser suite (Cubed's tests in `e2e/cubed/`).
- **The Flat | Cubed switch** links `#/` and `#/cubed`, and still opens the last one played.
- **`/3d/` sends old links on**: `/3d/#/play/mug` opens `#/cubed/play/mug`, and a kill-switch
  worker at `/3d/sw.js` retires Cubed's old offline one. Cubed is offline again with #160.
- **Not yet:** the two dailies, badges and home screens stay apart (the dailies joined in
  #156, the badges in #157).

Its third PR is **the save merge** (#155, and the data half of #154). On first launch,
`game/migrate.ts` merges the old games' saves into one, before any screen reads them:
progress per dimension under qualified ids (`picross:v2`), both runs in progress kept
(Cubed's under `block` in `picross:run`), jobs added up job by job, and one set of settings
(the 2D game's value wins where it had one). The old keys stay, read only by the migration.
Badges recounted with #157. Details are in
[architecture.md](architecture.md#state-and-persistence).

Its fourth is **one daily, one streak** (#156): Flat on odd days since the epoch, Cubed on
even ones, at `#/daily` (`#/cubed/daily` moves there), and one streak over both. Flat days
keep the puzzles they had; Cubed's days run through every block in every turn before one
repeats. Migration step 2 merges the two old dailies: a day played in either game counts,
the streak is the run of days ending at the last solved, and the best and solves keep both
games'. Details are in [architecture.md](architecture.md#the-daily-puzzle).

Its fifth is **one badge shelf** (#157), at `#/badges` (`#/cubed/badges` and `/3d/#/badges`
move there). Cubed's nine badges, which it worked out from its saves every time, are now
earned and saved like the 2D game's, as `block-<id>`, by the same startup sync, and tiers
only go up. Migration step 3 carries over the tiers Cubed's shelf had shown, so they aren't
"New!" again. The shelf groups the story, free play on each board, the daily, Endless,
know-how, bad days, and a new **Both boards** group: Fifty-Fifty (50 free-play puzzles on
each board), Second Opinion (the same job won on both) and Flat-Packed (the same picture
solved flat and as a block). Free-play rank counts both packs, read from a small catalog of
the 3D pack (`packages/block/src/puzzles/catalog.json`), so the pack stays out of the first
download. Details are in [architecture.md](architecture.md#rank-and-badges).

Its sixth is **free play across both boards** (#153): `#/free/flat` and `#/free/cubed`, a
tab per pack with one set of filters (unsolved, size, difficulty), and Next unsolved and
Surprise me per tab or from both. `#/free` opens the last tab. `#/` and `#/cubed` stay as
they are until the home menu (#152), and link to their tab. Details are in
[architecture.md](architecture.md#the-puzzle-list).

Its seventh is **one settings screen** (#154), at `#/settings`, linked from both lists:
General (sound, haptics where the phone can buzz, high contrast, the mode) and Cubed (fade
finished clues, replay the tutorial). The 2D game has no settings of its own, so there's no
Flat group; light or dark and reduced motion follow the device. It's one save, so a change
reaches both boards, a fight on its block phase too. The lists' sound, contrast, haptics and
fading buttons moved there; the boards keep their speaker button. Details are in
[architecture.md](architecture.md#state-and-persistence).

The second PR (#160) makes the whole game installable and playable offline: one
`manifest.webmanifest` and one service worker at the site's root, generated by the build,
named from `GAME_NAME` (`src/name.ts`, for #151). It precaches the shell, both packs, the
story and the art; three.js and the block screens are cached with the first block the player
opens. A new version waits until the player is off a board, then offers "A new version is
ready · Reload". Details are in [architecture.md](architecture.md#offline-and-updates).

**Step 5 is done** (milestone M6, #163): one fight engine, `StoryBattle` in
`packages/story`, plays both games' fights.

- **#168: a snapshot first.** `fight-ratings.json` holds every story, Overtime and boss
  fight's solver numbers on each board, and golden traces play every fight on each board,
  step by step, so a change to how any fight plays shows up as a diff.
- **#164 and #165: `FightBoard`.** What a fight needs of a board, with the grid's and the
  block's, and one set of tests any board passes.
- **#166: one battle.** Cubed's `Battle` became `StoryBattle` over `FightBoard`, with the
  ways the two games' fights differ as a `FightRules` profile (`BLOCK_RULES`,
  `GRID_RULES`, the order a stroke's effects land among them). Then the 2D game's
  `gridStep` moved onto it, through a codec that keeps the 2D save's shape. Both games'
  fight tests run against it unchanged, and no snapshot moved.

**Step 7 has a first boss, ahead of steps 4 to 6.** The Curator unfolds into a block at 60%
and folds back flat at 30%, in the 2D story. Rather than wait for `FightBoard`, the 2D
story opens the 3D game's own fight screen (from `packages/play-block`, loaded on demand)
for the block phases, and carries HP and phases between the two battles. Each game's
screen styles apply only on its board. Details are in [architecture.md](architecture.md)
("Switching board").

## Where things stand

|                      | Flat (`apps/picross`)                                                                                              | Cubed (`apps/picross/src/cubed`)                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Puzzle core          | `packages/grid`: grid, run clues, line solver, the pack, murals                                                    | `packages/block`: block, count-and-pieces clues, line solver, the pack, dioramas      |
| Play screen          | `packages/play-grid`: DOM grid (`boardView.ts`), `PlaySession` hooks                                               | `packages/play-block`: three.js (`blockView.ts`), `PlayHooks` in `ui/screens/play.ts` |
| Fights               | `StoryBattle` (`packages/story`) with `GRID_RULES`, run by `gridStep` (`game/fight.ts`)                            | `StoryBattle` with `BLOCK_RULES`, as `Battle` in `packages/block`                     |
| Story                | `packages/story`: scenes, chapters, jobs, encounters, read with 2D puzzles                                         | The same package, read with a 3D puzzle per encounter (`packages/block`)              |
| Saves and settings   | One save: `picross:v2`, `picross:run`, `picross:settings` (#155), `picross:daily2` (#156), `picross:badges` (#157) | The same, through views (`cubed/game/`)                                               |
| Look, sound, haptics | `packages/shared`, imported by both                                                                                | The same                                                                              |

Both are built in four layers: engine (pure logic) → puzzles (content) → game (rules and
saves) → ui (the only layer that touches the page). The packages follow those layers, so
step 4 is a merge of two apps, not a rewrite.

What's left in the way: two home screens (step 4, #152). The saves and settings are one
(#155). The battle engine is one (step 5), though a boss that switches board still keeps a battle
per board (#169, #170). Puzzle ids clash too (both packs have a `mug`), which #224's
qualified ids are for.

## Where it lives

**The 2D repo is the home**, as a monorepo. It has the history, the story, the issues,
the Azure production site and the SNES demake's import pipeline (`make import` reads
`../../picross`). The 3D code moved in as `cubed/`, then `apps/cubed/` (step 1), and its
screens are now in `apps/picross/src/cubed/` (step 4); the picross-3d repo is to be archived
with a pointer.

npm workspaces, no new build tool. The packages are in place (the
[package map](architecture.md#package-map) has today's layout); what's left changes the
apps and the story:

```
packages/
  shared/      tokens, styles, sound, haptics, dom, storage, random, theme, art, ids (done)
  story/       chapters, jobs, encounters, scenes, the scene player (done); later the runs,
               run saves and the fight rules, written once against a board interface (below)
  grid/        the 2D rules and data: engine, format, pack, murals, Game (done)
  play-grid/   the 2D play screen and its board view (done)
  block/       the 3D rules and data: volume, solver, format, pack, dioramas, Battle (done)
  play-block/  the 3D play screen: play controller, three.js view, input, editor (done)
apps/
  picross/     the one game: the menu, routes, free play, daily, badges, story screens
               (step 4; Cubed's screens are in src/cubed/, apps/cubed is gone)
```

Puzzle ids get a dimension prefix where they meet (`grid:mug`, `block:mug`; the helper came
in #224). Content files stay where they are, so the 2D game's puzzle sheets and the SNES
import keep working.

## The board interface (what makes mixed fights possible)

The two battle engines already share their rules almost line for line; what differs is what
a "line" is. Fights get written once, against this:

```ts
interface FightBoard {
  /** Every line: a 2D row or column, or a 3D line along x, y or z. */
  lines: { id: number; cells: number[] }[];
  /** Lines finished right now, judged by the truth. */
  finishedLines(): number[];
  /** Whether the board can still be solved from what's on it, with these clues hidden. */
  solvable(hidden: { fog?: number[]; scramble?: number[]; suspects?: number[] }): boolean;
  /** A forged clue for a line: convincing, wrong. */
  fakeClue(line: number, rng: () => number): Clue;
  /** Wipes lines back to blank (the Mimic), ink over a patch, work out a line (a bomb). */
  wipe(lines: number[]): number[];
  inkPatch(size: number, rng: () => number): number[];
  revealLine(line: number): number[];
}
```

Each engine implements it (the 2D one wraps today's 2D battle helpers, the 3D one today's
`game/battle.ts` picks). `Battle` keeps HP, phases, armor, charge, turns, shields and
call-outs, the same for both. The 3D game's enemy HP scaling (lines on the board over lines
on the 2D board) becomes part of starting a fight on any board.

## Mixed fights

### Encounters in either dimension

An encounter names its board: today's `puzzle` stays a 2D grid; a new `block` field names a
3D one. The story's 3D puzzles (`packages/block/src/puzzles/story/*.json`) become the `block`
versions of the encounters they were drawn for, so every encounter can be played either way
and a job can mix them.

### A boss that changes dimension

A phase can switch the board:

```json
{
  "at": 0.5,
  "name": "Clockwork Curator, Unfolded",
  "board": "block",
  "taunt": "Flat was never my best side."
}
```

When the phase lands, mid-fight:

1. The fight's state carries on: enemy HP, phase, attack, shields, the run's HP, gadgets.
   Only board-bound powers reset (fog, scrambles, forgeries, targets, ink, live line), and the
   new phase picks them again on the new board, kept solvable as always.
2. The 2D board flies into the block: a short transition where the finished picture lifts off
   the grid and becomes the front face of the 3D block (or, if it isn't finished, the grid
   folds away). With reduced motion it simply swaps.
3. The new board is the encounter's `block` puzzle. Chip damage, the finisher and the
   remaining phases work on it, because the rules only know `FightBoard`.
4. A reload mid-fight resumes on whichever board it was on: the run saves the board kind
   with the battle.

The 2D progress doesn't carry into the block in the first version: the switch is the boss's
move, and losing the board is the cost, like the Mimic's wipe. **Later:** draw boss blocks
whose front face is the 2D picture, so every cube you'd already settled in 2D starts settled
in 3D (the 2D marks become known cells for the 3D solver), and finishing the 2D board first
is a real advantage.

The reverse switch (a block that collapses to a grid) falls out of the same mechanism.

### Where story data lives

The combined repo owns the story, so the schema can grow (`block`, `board` on phases)
without a sync gate. The 2D-only screens ignore fields they don't use until they're gone.

## Saves

Done for progress, runs and settings (#155): on first launch of the combined game,
`game/migrate.ts` merges them. Settings merge (the 2D game's win where it saved one),
progress stays per dimension (`grid:` / `block:` ids), story saves merge job by job (plays
and wins add up, so a job counts as won if it was won in either, and `wonOn` says where),
and a run in progress in each game is kept, either one ready to continue. Nothing is
deleted; the old keys stay for a release in case of a rollback, and a marker
(`picross:save`) says the merge has run. The dailies merged with #156 (one daily, Flat and
Cubed by turns, and one streak: a day played in either game counts), and the badges with
#157 (one shelf, Cubed's earned from the merged saves, its tiers seen carried over).

## Steps

Each step ships, with both games playable throughout.

1. **Monorepo skeleton in the 2D repo.** Workspaces; the 2D app moves into `apps/picross`
   unchanged, and its unit tests, browser tests, CI, Pages and Azure deploys pass as before.
   The SNES `make import` paths update. (Done: #219.)
2. **Shared package.** Today's shared files become `packages/shared`, imported by both
   apps; the sync script goes. (Done: #220; the story split out into `packages/story` in
   #223.)
3. **Packages for each board.** `packages/block` and `packages/play-block` from the 3D game,
   and `packages/grid` and `packages/play-grid` from the 2D one; Cubed runs as a second app
   (`apps/cubed`) with its tests and site. (Done: #221, #222.) Then the story package
   (#223), qualified puzzle ids (#224) and a bundle budget (#225).
4. **One app.** A menu over both: free play 2D and 3D, one daily (alternating: #156), one
   settings screen, badges across both, the editor in both dimensions. Saves merge (above).
   `apps/cubed` folds into `apps/picross`, `/3d/` redirects to the combined game, and the
   picross-3d repo is archived. (Begun: Cubed's screens are under `#/cubed`, and `/3d/`
   redirects.)
5. **Fights over `FightBoard`.** One `Battle` for both engines; the 2D and 3D fight tests
   both run against it unchanged. (Done: #168, #164, #165, #166.)
6. **Encounters in either dimension.** `block` on encounters, naming the 3D story puzzles; a job
   can mix 2D and 3D encounters.
7. **Dimension-switching bosses.** `board` on phases, the transition, saving the board kind;
   then pick the first bosses to switch (the Curator is the obvious one).
8. **Later:** 2D progress carrying into the boss's block.

## Risks and decisions

- **The 2D app's browser tests** are the safety net for steps 1–4: they must pass unchanged
  before anything moves on.
- **Bundle size:** three.js stays out of the first download (screens with a block load on
  demand). `npm run check:budget` fails CI if it doesn't (#225).
- **Difficulty:** a boss that switches mid-fight is harder by design; per the 2D game's
  calibration, the Curator stays the ceiling before Insane, so a switching boss keeps its
  other powers lighter.
- **Decisions for you:** the combined game's name; whether 3D free play is its own menu or
  mixed into the list by size; and which bosses switch first.
