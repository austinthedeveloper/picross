# Architecture

Plain TypeScript with no UI framework, like the 2D game: screens build DOM with `el()`, and
three.js draws the block. Four layers, each importing only from the ones above it:

| Layer   | Folder         | Knows about the DOM? | Job                                               |
| ------- | -------------- | -------------------- | ------------------------------------------------- |
| Engine  | `src/engine/`  | No                   | The block, lines and clues, and the line solver   |
| Puzzles | `src/puzzles/` | No                   | The puzzle file format, clue hiding, and the pack |
| Game    | `src/game/`    | No (uses storage)    | A puzzle in play (strokes, hearts, hints), saves  |
| UI      | `src/ui/`      | Yes                  | Screens, the 3D view, input, sound, haptics       |

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
one while the puzzle still solves, up to `hideRatio`. `scripts/puzzles.ts` runs it and
writes `hide` and `passes` back to the file; `pack.test.ts` checks every puzzle still solves.

## Game

`game/game.ts`. Each cube is `SOLID`, `PAINTED` or `BROKEN`. A **stroke** starts on a cube
seen through one face and keeps to that layer (the face's axis), so breaking a cube never
lets the stroke fall through to the one behind. Hearts mode refuses to break a cube of the
shape: it paints it instead and costs a heart. Solved means every cube outside the shape is
broken; painting is only a help. Undo works in whole strokes. `progress.ts` and
`settings.ts` store saves under `picross3d:` keys, apart from the 2D game's.

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

`main.ts` is a hash router. Screens with a block load on demand, so three.js isn't in the
first download.

| Route           | File              | What                                                 |
| --------------- | ----------------- | ---------------------------------------------------- |
| `#/`            | `selectScreen.ts` | The list, filters, settings; other screens add cards |
| `#/play/<id>`   | `gameScreen.ts`   | Free play: saves, times, Next                        |
| `#/tutorial`    | `tutorial.ts`     | The guided tutorial on a 3×2×2 block                 |
| `#/how-to-play` | `howToPlay.ts`    | The rules                                            |

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
`window.__view`, for `npm run screenshot -- --js` and the console. Production drops it.
