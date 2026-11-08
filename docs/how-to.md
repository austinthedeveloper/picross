# How-to guides

## Add a puzzle

1. Make `src/puzzles/pack/<id>.json`:

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
   cube colored by `colors` (a name from `COLORS` in `src/puzzles/format.ts`). Lines can be
   up to 15 cubes long.

2. Run `npm run puzzles`. It checks the shape can be solved without guessing with every
   clue shown, hides about `hideRatio` of the clues (keeping it solvable), and writes
   `hide` and `passes` into the file. If it says the shape can't be solved, change the
   shape: usually a hollow or a long solid run that no line pins down.
3. Run `npm test`. The pack test checks every puzzle solves from the clues it shows.

To pick the hidden clues again after editing a shape or its ratio:
`npm run puzzles -- <id>` (or `--all`).

The list sorts by the block's longest side (Small up to 4, Medium up to 6, Large beyond),
then size, then `passes`.

## Add a shape color

Add the name to `COLORS` in `src/puzzles/format.ts` and a `--vox-<name>` token to all three
blocks of `src/styles/voxels.css` (light, dark, high contrast).

## Add a sound or change the base styles

`src/ui/sound.ts`, `src/styles/tokens.css` and `src/styles/base.css` belong to the 2D game.
Change them there, then `npm run sync:web` (see [Shared files](shared-files.md)). Styles
only this game needs go in `src/styles/game.css`, `select.css` or `voxels.css`.

## See a change

`npm run dev`, or screenshot a page in your installed Chrome while it runs:

```bash
npm run screenshot -- '#/play/castle' castle.png --phone --dark
```
