# Picross Cubed: architecture

How the 3D game works. Where its files live, and what each package may import, is in the
package map at the top of [the main architecture doc](../architecture.md).

Plain TypeScript with no UI framework, like the 2D game: screens build DOM with `el()`, and
three.js draws the block. Most of the code is in two packages, which the 2D game also
imports (for the Curator's block phases); `apps/picross/src/cubed/` is the screens around
them, under `#/cubed/…` in the one app. Four layers, each importing only from the ones above
it:

| Layer   | Where                                                    | Knows about the DOM? | Job                                                       |
| ------- | -------------------------------------------------------- | -------------------- | --------------------------------------------------------- |
| Engine  | `packages/block/src/engine/`                             | No                   | The block, lines and clues, and the line solver           |
| Puzzles | `packages/block/src/puzzles/`                            | No                   | The puzzle file format, clue hiding, the pack, dioramas   |
| Game    | `packages/block/src/{game,story}/`                       | No                   | A puzzle in play (strokes, hearts, hints), battles, story |
|         | `apps/picross/src/cubed/game/`                           | No (uses storage)    | Views of the one save; runs, the daily streak, badges     |
| UI      | `packages/play-block/src/`, `apps/picross/src/cubed/ui/` | Yes                  | The 3D view, input, the play screen; Cubed's screens      |

`@picross/block` (`packages/block`) has no three.js and no screens: a test and a lint rule
check it. `@picross/play-block` (`packages/play-block`) has the three.js view, input, the
play controller, the fight and editor screens and their styles (`voxels.css`, `game.css`,
`story.css`, `editor.css`). Paths below without a package are in `apps/picross/src/cubed/`; paths
in `engine/`, `puzzles/`, `game/game.ts`, `game/battle.ts`, `game/clock.ts` and `story/`
are in `packages/block/src/`, and `ui/board/`, `ui/screens/play.ts`,
`ui/screens/story/fight.ts` and `ui/screens/editor/` in `packages/play-block/src/`. Neither
package imports the app: what they need from it is passed in (the story run for a fight,
`FightRun`; the play screen's settings, `providePlayPrefs` in `routes.ts`; where Home and
"All puzzles" lead, `home`).

Rules and state live in `engine/` and `game/`, where Vitest covers them. The UI turns
pointer and key events into `Game` calls and redraws.

## The block

`engine/volume.ts`. A block is `x` × `y` × `z` cubes: `x` left to right, `y` bottom to
top, `z` back to front. Cube `i = x + width * (z + depth * y)`. A **line** is a row of
cubes along one axis; `allLines()` lists every x line, then y, then z, and a line's place
in that list is its id (saves and the `hide` field use it).

## Clues and the solver

`engine/clues.ts`: a clue is `{ count, pieces }`, with pieces capped at 3 ("three or more").
Its frame is plain (0–1 pieces), a circle (2) or a square (3+).

`engine/solver.ts` is a line solver. For each line it intersects every arrangement that fits
the clue (precomputed bit masks, lines up to 15 long) with what's already known, and repeats
over the lines that changed until nothing new is proved. A hidden clue allows any
arrangement. A puzzle is good when this solves it outright: one answer, no guessing. The
number of sweeps (`passes`) is a rough difficulty. `nextStep()` finds the line that proves
the most, for hints.

## Puzzles

`puzzles/format.ts` defines the file (see [How-to](how-to.md)) and parses it into a
`Puzzle`: dims, the solution as color indexes, every clue, and the shown clues (`null` for
hidden). `puzzles/hide.ts` picks clues to hide: a seeded shuffle of the lines, hiding each
one while the puzzle still solves, up to `hideRatio`. `packages/block/scripts/puzzles.ts`
(`npm -w packages/block run puzzles`) runs it and writes `hide` and `passes` back to the
file; `pack.test.ts` checks every puzzle still solves.

## Game

`game/game.ts`. Each cube is `SOLID`, `PAINTED` or `BROKEN`. A **stroke** starts on a cube
seen through one face and keeps to that layer (the face's axis), so breaking a cube never
lets the stroke fall through to the one behind. Hearts mode refuses to break a cube of the
shape: it paints it instead and costs a heart. Solved means every cube outside the shape is
broken; painting is only a help. Undo works in whole strokes. Cubed's saves are the 2D game's
since the save merge (#155): `game/progress.ts`, `runSave.ts` and `settings.ts` here are views
of `picross:v2` (the `block:` ids), `picross:run` (Cubed's run is its `block`) and
`picross:settings` (`dimDone`, `cubedTutorialDone`), so the screens didn't change. Since
#156 `game/daily.ts` is a view of the one daily (`picross:daily2`): one daily for both
games, on Cubed's board every other day, with one streak. The badge tiers seen
(`picross3d:badges`) keep their key until #157. The old `picross3d:v1`, `picross3d:run`,
`picross3d:settings` and `picross3d:daily` stay for a rollback, read only by the migration
(see
[State and persistence](../architecture.md#state-and-persistence)).

## The view

| File                    | Job                                                                           |
| ----------------------- | ----------------------------------------------------------------------------- |
| `ui/board/blockView.ts` | The three.js scene: one mesh of every exposed face, rebuilt after each change |
| `ui/board/atlas.ts`     | One canvas texture with every clue face (plain, painted, lit), from the theme |
| `ui/board/input.ts`     | Pointer input: strokes on cubes, turning on empty space, pinch, wheel         |
| `ui/board/thumbnail.ts` | Isometric 2D canvas pictures for the list and the solved panel                |

Faces use flat shading by direction (vertex colors, no lights), so the block reads as solid
and the clue numbers stay crisp. Picking raycasts the mesh; each triangle pair maps back to
its cube and face axis. **Peeling** hides layers from the side the camera is on, so it
always peels toward you. The view draws only when something changes. The solved reveal
switches to the shape's colors (`--vox-*` tokens) and gives it a turn.

## Screens

Cubed's routes are `#/cubed/…`: the app's route table (`apps/picross/src/routes.ts`) has one
entry for them, which loads `routes.ts` here with `import()`, and `routes.ts` routes on the
rest of the hash. Screens with a block load on demand from there, so three.js isn't in the
first download or Cubed's list. Every link between them goes through `cubedHref()`
(`href.ts`): `cubedHref('/play/mug')` is `#/cubed/play/mug`, `cubedHref()` the list.

| Route                                 | File                                           | What                                                           |
| ------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `#/cubed`                             | `selectScreen.ts`                              | The list, filters, settings; other screens add cards           |
| `#/cubed/play/<id>`                   | `gameScreen.ts`                                | Free play: saves, times, Next                                  |
| `#/cubed/tutorial`                    | `tutorial.ts`                                  | The guided tutorial on a 3×2×2 block                           |
| `#/cubed/how-to-play`                 | `howToPlay.ts`                                 | The rules                                                      |
| `#/cubed/editor`                      | `editor/editorScreen.ts`                       | Draw, check and share puzzles (checks run in `checkWorker.ts`) |
| `#/cubed/p/<code>`                    | `sharedScreen.ts`                              | A shared puzzle; `/test` for the editor's play-test            |
| `#/daily` (on a Cubed day)            | `dailyScreen.ts` (`dailyCard.ts` for the list) | Today's puzzle and streak; `#/cubed/daily` moves here (#156)   |
| `#/cubed/badges`                      | `badgesScreen.ts`                              | Badges, worked out from saves (`game/badges.ts`)               |
| `#/cubed/diorama/<id>[/<n>]`          | `dioramaScreen.ts` (`dioramaList.ts`)          | A diorama and its pieces                                       |
| `#/cubed/story`, `#/cubed/story/play` | `story/*`                                      | Story mode (see [story.md](story.md))                          |

Scenes (`#/scene/<id>`) are both games'. On its routes the router sets
`<html data-board="block">`, where Cubed's styles apply, and hands shared code Cubed's view
of the settings (see [the 2D game's routing](../architecture.md#routing-and-screens)).

**The old address.** Cubed was its own app at `/3d/` until it moved in. `/3d/` is now a page
(`apps/picross/public/3d/index.html`) that sends each old link to the same screen
(`/3d/#/play/mug` to `../#/cubed/play/mug`, and `/3d/` to `#/cubed`), and `/3d/sw.js`
retires the old service worker: it deletes the `picross-cubed` cache, unregisters, and
reloads the pages it had, which then land here. `e2e/cubed/old-links.spec.ts` and
`e2e/offline.spec.ts` check both.

### The play controller

`ui/screens/play.ts` builds the play screen: header, toolbar (undo, redo, hint menu, reset,
sound), a coach slot, the block, tools, views and peels, keyboard play and the end panel.
Modes shape it through `PlayHooks`: `allow` can refuse a move (the tutorial keeps you on
the lit row), `changed` hears about every change with the lines it finished, `orbited` and
`peeled` report the camera, and `solved`/`failed` build the end panel. It returns a `Play`
with the game, view, clock and slots, and a `cleanup()` that returns the time played.

Faces: each state (`STATES` in `atlas.ts`) has its own texture of every clue and its own
material; the mesh draws them as groups. A mode restyles faces with `view.styler`.

In dev builds the play screen puts its `Game` and `BlockView` on `window.__game` and
`window.__view`, for `npm -w apps/picross run screenshot -- --js` and the console. Production drops it.

## Saving

Screens save through their cleanup when you leave them, and also register a save with
`apps/picross/src/ui/lifecycle.ts`'s `onHide`, which `main.ts` runs whenever the page is
hidden: a phone can close a backgrounded tab without the cleanup ever running. The router
clears it on every route. On Cubed's routes, leaving the page runs the cleanup, and coming
back from the browser's page cache draws the screen again.

## Offline

Cubed plays offline as part of the one app (#160): its list and pack are precached with the
rest of the game, and the first block the player opens caches three.js and every screen
with a block. Its old worker at `/3d/` is retired (above). The app's icons are in
`apps/picross/public/icons/`, made from `cubed.svg` by `npm -w apps/picross run icons`. See
[Offline and updates](../architecture.md#offline-and-updates).

Keep three.js out of the first download: screens with a block are loaded on demand, and
the list's cards (daily, story, dioramas) live in modules that don't import the view.
