# Combining the 2D and 3D games

The plan for one game with both: free play in 2D and 3D, one story, and fights that change
dimension, like a boss that's a 2D board until it pulls the picture into a block halfway
through. Nothing here is built yet. The 3D game gets tightened up first; this starts after.

## Progress

**Step 1 is done.** Picross Cubed came into this repo with its history (a subtree merge)
as `cubed/`, an npm workspace. Then both games moved into `apps/` (#142): the 2D game into
`apps/picross/` and Cubed into `apps/cubed/`, with the root as the workspace root.
The SNES demake's `make import` reads the pack from `apps/picross/`.

- One install (`npm ci`), one CI, one site: `npm run build` builds Flat at the root of
  `dist/` and Cubed into `dist/3d/` (`scripts/build-cubed.mjs`); GitHub Pages and the Azure
  site serve both.
- **Flat | Cubed:** a switch at the top of both home screens moves between the games and
  remembers the last one, so the site opens on it.
- **Step 2 is done** (#143): the files Cubed used to copy are one package,
  `packages/shared` (`@picross/shared`, [README](../packages/shared/README.md)), which both
  games import. The sync script, `shared.lock.json` and `check:cubed` are gone. Every
  shared file went in, story data included; the story and its loaders move out to their
  own `packages/story` in #146. The SNES demake reads the story and art from
  `packages/shared/`.
- **The 2D packages are done** (#144), alongside step 3's 3D ones: `packages/grid`
  (`@picross/grid`: the engine, the puzzle format, the pack, murals and `Game`, with no
  DOM; [README](../packages/grid/README.md)) and `packages/play-grid`
  (`@picross/play-grid`: the board view, input, the play screen and its `PlaySession`
  hooks, `board.css` and `game.css`; [README](../packages/play-grid/README.md)). The 2D
  game imports both. The SNES demake reads the pack from `packages/grid/src/puzzles/`.
- **Step 3 is done: the 3D game's code is two packages** (#145): `packages/block` (`@picross/block`: the
  block, clues, solver, puzzle format, pack, dioramas, Game, Battle and the 3D story loader;
  no three.js) and `packages/play-block` (`@picross/play-block`: the three.js view, input,
  the play, fight and editor screens and their styles). Cubed and the Curator's block
  phases both import them; neither app imports the other.
- The story ideas for the combined game are in [story-combined.md](story-combined.md).

**Step 7 has a first boss, ahead of steps 2–6.** The Curator unfolds into a block at 60%
and folds back flat at 30%, in the 2D story. Rather than wait for `FightBoard`, the 2D
story opens the 3D game's own fight screen (from `packages/play-block`, loaded on demand) for the
block phases, and carries HP and phases between the two battles. Each game's screen
styles apply only on its board. Details are in [architecture.md](architecture.md)
("Switching board").

The steps below still apply; `packages/block` and `packages/play-block` now exist (#145).

## Where things stand

|                      | 2D ([picross](https://github.com/austinthedeveloper/picross)) | 3D (this repo)                                                          |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Puzzle core          | Grid, run clues, line solver (`src/engine/`)                  | Block, count-and-pieces clues, line solver (`src/engine/`)              |
| Play screen          | DOM grid (`ui/board/boardView.ts`), `PlaySession` hooks       | three.js (`ui/board/blockView.ts`), `PlayHooks` in `ui/screens/play.ts` |
| Fights               | `game/battle.ts` over rows and columns                        | `game/battle.ts` over lines on three axes, same rules                   |
| Story data           | Owns it: scenes, chapters, jobs, encounters, art              | Shared verbatim from 2D, plus a 3D puzzle per encounter                 |
| Saves                | `picross:*` keys                                              | `picross3d:*` keys                                                      |
| Look, sound, haptics | Owns them                                                     | Shared verbatim                                                         |

Both are built in four layers: engine (pure logic) → puzzles (content) → game (rules and
saves) → ui (the only layer that touches the page). That's what makes combining a move
rather than a rewrite.

What's in the way is that the two repos use the same file paths for different code: 322
paths exist in both, and the logic among them differs (`engine/solver.ts`, `game/game.ts`,
`game/battle.ts`, `game/settings.ts`, `main.ts`, the pack). Even puzzle ids clash (both packs
have a `mug`).

## Where it lives

**The 2D repo is the home**, as a monorepo. It has the history, the story, the issues,
the Azure production site and the SNES demake's import pipeline (`make import` reads
`../../picross`). The 3D code moved in as `cubed/`, now `apps/cubed/` (step 1); the picross-3d repo is to be
archived with a pointer.

npm workspaces, no new build tool:

```
packages/
  shared/      tokens, base styles, sound, haptics, dom, storage, random, theme, art,
               scenes + dialogue, backdrops, gadgets: today's shared files, now imported
  story/       chapters, jobs, encounters (data + loader), runs and run saves, and the
               fight rules written once against a board interface (below)
  grid/        the 2D engine: grid, clues, solver, transforms, 2D puzzle format and pack
  block/       the 3D engine: volume, clues, solver, block puzzle format, pack, dioramas
  play-grid/   the 2D play screen and its board view
  play-block/  the 3D play screen (play controller, three.js view, input, editor)
apps/
  picross/     the one game: the menu, routes, free play, daily, badges, story screens
```

Puzzle ids get a dimension prefix where they meet (`grid:mug`, `block:mug`); content files
stay where they are, so the 2D game's puzzle sheets and the SNES import keep working.

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
3D one. The story's 3D puzzles (`src/puzzles/story/*.json` here) move in as the `block`
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

Keep reading both key sets. On first launch of the combined game, settings merge (the 2D
game's win where they overlap), progress stays per dimension (`grid:` / `block:` ids), story
saves merge job by job (a job counts as won if it was won in either), and badges recount
from the merged saves. Nothing is deleted; the old keys stay for a release in case of a
rollback.

## Steps

Each step ships, with both games playable throughout.

1. **Monorepo skeleton in the 2D repo.** Workspaces; the 2D app moves into `apps/picross`
   unchanged, and its unit tests, browser tests, CI, Pages and Azure deploys pass as before.
   The SNES `make import` paths update.
2. **Shared package.** Today's shared files become `packages/shared`, imported by both
   apps; the sync script goes. (Done, #143; the story splits out into `packages/story` in
   #146.)
3. **3D packages.** `packages/block` and `packages/play-block` from this repo; the 3D game
   runs as a second app (`apps/picross-3d`) in the monorepo with its tests and site.
4. **One app.** A menu over both: free play 2D and 3D, one daily (alternating, or both), one
   settings screen, badges across both, the editor in both dimensions. Saves merge (above).
   The 3D site redirects to the combined one; this repo is archived.
5. **Fights over `FightBoard`.** One `Battle` for both engines; the 2D and 3D fight tests
   both run against it unchanged.
6. **Encounters in either dimension.** `block` on encounters; story puzzles move in; a job
   can mix 2D and 3D encounters.
7. **Dimension-switching bosses.** `board` on phases, the transition, saving the board kind;
   then pick the first bosses to switch (the Curator is the obvious one).
8. **Later:** 2D progress carrying into the boss's block.

## Risks and decisions

- **The 2D app's browser tests** are the safety net for steps 1–4: they must pass unchanged
  before anything moves on.
- **Bundle size:** three.js stays out of the first download (screens with a block load on
  demand), as it does here.
- **Difficulty:** a boss that switches mid-fight is harder by design; per the 2D game's
  calibration, the Curator stays the ceiling before Insane, so a switching boss keeps its
  other powers lighter.
- **Decisions for you:** the combined game's name; whether 3D free play is its own menu or
  mixed into the list by size; and which bosses switch first.
