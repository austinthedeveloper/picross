# Picross Cubed: how-to guides

Recipes for the 3D game. The 2D game's are in [how-to.md](../how-to.md).

The puzzles and their checks are in `packages/block`; run the `npm run puzzles` commands
below from `packages/block` (or as `npm -w packages/block run puzzles …` from the root).
Cubed's screens are in `apps/picross/src/cubed/`, under `#/cubed/…` in the app.

## Add a puzzle

1. Make `packages/block/src/puzzles/pack/<id>.json`:

   ```json
   {
     "id": "mug",
     "name": "Mug",
     "colors": { "b": "sky" },
     "layers": [
       ["bbb..", "bbb..", "bbb.."],
       ["bbb..", "b.bbb", "bbb.."]
     ],
     "hideRatio": 0.5
   }
   ```

   `layers` is the shape from the bottom layer up. Each layer is its rows from the back to
   the front, each row a string from left to right. `.` is empty; any other letter is a
   cube colored by `colors` (a name from `COLORS` in `packages/block/src/puzzles/format.ts`). Lines can be
   up to 15 cubes long.

2. Run `npm run puzzles`. It checks the shape can be solved without guessing with every
   clue shown, hides about `hideRatio` of the clues (keeping it solvable), and writes
   `hide` and `passes` into the file. If it says the shape can't be solved, change the
   shape: usually a hollow or a long solid run that no line pins down.
3. Run `npm run test:block` from the root. The pack test (`packages/block/src/puzzles/pack.test.ts`)
   checks every puzzle solves from the clues it shows.

To pick the hidden clues again after editing a shape or its ratio:
`npm run puzzles -- <id>` (or `--all`).

The list sorts by the block's longest side (Small up to 4, Medium up to 6, Large beyond),
then size, then `passes`.

### Many at once: sheets

For a batch, draw them in one sheet (`packages/block/src/puzzles/sheets/*.txt`, format at the top of
`packages/block/src/puzzles/sheet.ts`: layers side by side, one line per row) and export it:

```bash
npm run puzzles -- --sheet src/puzzles/sheets/batch-1.txt
```

Unchanged shapes keep their hidden clues. Sheets under `sheets/story/` export to
`packages/block/src/puzzles/story/` (story puzzles, named after the 2D puzzle their encounter uses).

### In the browser: the editor

`#/cubed/editor` (the Editor button on the list) draws a shape layer by layer with a live 3D
preview, and checks it in a web worker as you go: solvable or not (outlining the cubes
line logic can't work out), and with a slider for how many clues to hide. Play-test it,
copy a share link (`#/p/<code>`, the puzzle deflated into the URL), or export the JSON and
drop it in `packages/block/src/puzzles/pack/` (then `npm run puzzles`). `packages/block/src/puzzles/check.ts`,
`draft.ts` and `share.ts` hold the logic, with tests.

## Difficulty

`packages/block/src/puzzles/difficulty.ts` bands puzzles by `passes`, up a band for blocks 9 or more on a
side. `npm run puzzles` keeps `passes` current; the pack test fails if it isn't.

## Add a shape color

Add the name to `COLORS` in `packages/block/src/puzzles/format.ts` and a `--vox-<name>` token to all three
blocks of `packages/play-block/src/styles/voxels.css` (light, dark, high contrast).

## Add a sound or change the base styles

`src/ui/sound.ts`, `src/styles/tokens.css` and `src/styles/base.css` are shared with the 2D
game, in `packages/shared` at the repo root (see its [README](../../packages/shared/README.md)):
a change there is in both games. Styles for a block go in `packages/play-block/src/styles/`
(`game.css`, `voxels.css`, `story.css`, `editor.css`; the 2D game uses the first three for
its block fights), and styles for Cubed's list in `apps/picross/src/cubed/styles/select.css`.
Both are scoped to the block (`<html data-board="block">`), so they never reach the 2D
game's screens.

## See a change

`npm run dev` (http://localhost:5173/#/cubed), or screenshot a page in your installed Chrome
while it runs:

```bash
npm -w apps/picross run screenshot -- '#/cubed/play/castle' castle.png --phone --dark
```
