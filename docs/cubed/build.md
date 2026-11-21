# The build (a prototype)

A third stage after the 2D and 3D puzzles: the solved block comes apart into toy bricks, and
the player builds it back up, one layer at a time. The same subject three times: a flat
drawing, a carved block, then a toy you built. It's a prototype, for finding out whether the
build feels like a reward or a chore.

## Play it

Start the dev server (`npm run dev`), then:

| What                     | Open                                                  |
| ------------------------ | ----------------------------------------------------- |
| The whole thing          | Home → **Draw, carve, build**, or `#/trio/dog`        |
| Just the build           | `#/cubed/build/dog`                                   |
| The build from layer N   | `#/cubed/build/dog?layer=6` (1 is the bottom)         |
| Any puzzle's build       | `#/cubed/build/<id>`: a trio puzzle, or any Cubed one |
| The 3D stage, then build | `#/cubed/trio/dog`                                    |

From the command line, Vite opens a page for you:

```bash
npm run dev -- --open '/#/trio/dog'
```

```bash
npm run dev -- --open '/#/cubed/build/dog?layer=6'
```

In dev builds, **N** finishes the current layer, for getting to the end quickly, and the
console has the build as `__build` and its view as `__brickView`.

## How it plays

1. **The pop.** The 3D stage's solved block turns in its colors for a moment, then the
   build opens: the block shows built of bricks, and every brick flies out and lands around
   the plate.
2. **Layer by layer.** Built layers are solid; the layer being built is a faint ghost of its
   bricks; anything above it is hidden. The tray holds only this layer's bricks, by kind
   (size and color, with a count).
3. **Placing.** Tap a brick in the tray and tap where it goes, or drag it there. It comes
   turned the way one of its ghosts is; **R** or **Turn brick** turns it 90°. Dropped near a
   ghost of its size, color and turn (within one stud), it snaps in, and the ghosts it could
   go in are brighter while you hold it. Anywhere else, it hops back. There's no way to fail.
4. **A layer done** pops, the camera rises a layer, and the next ghost fades in.
5. **The top layer done**: the toy turns on its plate with a burst of little bricks, beside
   the 2D picture and the carved block.

Drag the plate to look around (right-drag works too), scroll to zoom, or **Reset view**.

## The code

| What                   | Where                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| Splitting into bricks  | `packages/block/src/build/bricks.ts` (`splitIntoBricks`)                         |
| A build in progress    | `packages/block/src/build/build.ts` (`BrickBuild`)                               |
| Where models come from | `packages/block/src/build/models.ts` (`buildModel`, `BrickModel`)                |
| The debug link         | `packages/block/src/build/entry.ts` (`parseBuildPath`, `startBuild`)             |
| The trio's puzzles     | `packages/{grid,block}/src/puzzles/trio/` (with `trio.ts` to load them)          |
| The view               | `packages/play-block/src/ui/board/brickView.ts` (three.js)                       |
| Carrying from the tray | `packages/play-block/src/ui/board/brickInput.ts` (`carryFromTray`, no three.js)  |
| The screen             | `packages/play-block/src/ui/screens/build.ts`, `src/styles/build.css`            |
| The 2D and 3D stages   | `apps/picross/src/ui/screens/trioSession.ts`, `src/cubed/ui/screens/trio.ts`     |
| Routes                 | `#/trio/<id>` in `apps/picross/src/routes.ts`; the rest in `src/cubed/routes.ts` |

**The split** works layer by layer from the bottom with the set 2×4, 2×2, 1×4, 1×2, 1×1.
Each brick is one color and covers only cubes of that color. A layer fills greedily: the
first cube not yet covered, then the best brick that can start there. Bigger scores more,
and so does resting on two or more bricks below (crossing their seams); a brick exactly on
one like it counts for about half when its color carries on beside it, so a smaller brick
can start a stagger. Odd layers scan from the opposite corner. It also builds for real
bricks ([bricks-real.md](../bricks-real.md)): first, each cube with nothing standing under
it takes the best brick that reaches back over something that does (the cube with the
fewest such bricks first); a brick on air costs more than any size difference, and joining
two pieces scores. Each layer is tried from all four corners, and the best four splits so
far go on to the next layer, ranked by their bricks' scores less what their loose pieces
cost. The same block always gives the same bricks. Its tests (`bricks.test.ts`, over the trio and the whole pack) check every
cube is covered once, no brick spans two colors or leaves the shape, and the output repeats.

**The trio's puzzles** live in `trio/` on both boards, not the packs: a new pack puzzle
reshuffles both dailies' whole cycle (`packages/shared/src/puzzles/pairs.ts`). The dog's 2D
picture is its 3D block seen from the side. `npm -w packages/block run puzzles` covers
`trio/` as well as the pack. Nothing in the trio is saved.

**Models.** `buildModel(id)` finds any model to build: the trio's, Brick kids' own
(`puzzles/bricks/`), free play's pack, then the story's. One id is one model: their ids
never clash (`build/models.test.ts`), except a story puzzle named after the same 2D puzzle
as a pack one, where the pack's wins. The build and its view take a `BrickModel` (id,
name, dims, solution and palette), which every `Puzzle` is; they never need its clues.
The trio's carve (`#/cubed/trio/<id>`) takes only nonograms: a trio puzzle or a pack
puzzle. The build's ending shows the 2D picture only for a real pair (the trio's, or a pack
puzzle with a 2D one of the same id), never for a Brick kids toy that shares a name.

`BrickBuild` takes `BuildRules` (a longer snap reach, bricks that turn themselves, one kind
in the tray at a time) and `BrickView` takes `BrickViewOptions` (a camera that sways, ghosts
that bob, a flight into the slot). The build stage here uses none of them; the bricks route
for little kids ([../bricks.md](../bricks.md)) uses all but one kind at a time.

Bricks here are generic toy bricks with this game's own stud: wide, slightly tapered, with
a smaller step on top.
