/**
 * Checks every puzzle in the block package's pack (packages/block/src/puzzles/pack) and
 * picks which clues each one hides. From apps/cubed:
 *
 *   npm run puzzles            hide clues for puzzles that have no `hide` yet, check the rest
 *   npm run puzzles -- --all   pick again for every puzzle (after changing a shape or ratio)
 *   npm run puzzles -- mug     pick again for just these ids
 *   npm run puzzles -- --sheet ../../packages/block/src/puzzles/sheets/kitchen.txt
 *                              export a sheet's puzzles to the pack first (new or changed
 *                              shapes get new hidden clues), then check everything. Sheets
 *                              in sheets/story/ export to the story puzzles (puzzles/story/).
 *
 * A puzzle has to be solvable without guessing from the clues it shows. See docs/cubed/how-to.md.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { solve } from '@picross/block/engine/solver';
import { dimsLabel } from '@picross/block/engine/volume';
import { encodeHidden, parsePuzzle, type PuzzleFile } from '@picross/block/puzzles/format';
import { chooseHidden } from '@picross/block/puzzles/hide';
import { parseSheet } from '@picross/block/puzzles/sheet';

const PUZZLES = join(import.meta.dirname, '../../../packages/block/src/puzzles');
/** Free-play puzzles, and story puzzles (named after the 2D puzzle their encounter uses). */
const DIRS = ['pack', 'story'].map((d) => join(PUZZLES, d)).filter((d) => existsSync(d));
const args = process.argv.slice(2);
const all = args.includes('--all');
const sheetAt = args.indexOf('--sheet');
const sheetPath = sheetAt >= 0 ? args[sheetAt + 1] : undefined;
const only = args.filter((a, i) => !a.startsWith('--') && i !== sheetAt + 1);
let failed = 0;

// Export a sheet: write each puzzle's file, keeping its hidden clues if the shape is unchanged.
if (sheetPath) {
  for (const entry of parseSheet(readFileSync(sheetPath, 'utf8'))) {
    // Sheets under sheets/story/ are story puzzles.
    const dir = join(PUZZLES, sheetPath!.includes('/story/') ? 'story' : 'pack');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${entry.id}.json`);
    const old: PuzzleFile | undefined = existsSync(path)
      ? JSON.parse(readFileSync(path, 'utf8'))
      : undefined;
    const same =
      old &&
      JSON.stringify([old.layers, old.colors, old.hideRatio]) ===
        JSON.stringify([entry.layers, entry.colors, entry.hideRatio]);
    if (same) continue;
    try {
      parsePuzzle(entry);
    } catch (e) {
      console.error(`✗ ${(e as Error).message}`);
      failed++;
      continue;
    }
    writeFileSync(path, JSON.stringify({ ...entry, name: entry.name }, null, 2) + '\n');
    console.log(`  exported ${entry.id}`);
  }
}

const files = DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dir, f)),
);
for (const path of files) {
  const file = JSON.parse(readFileSync(path, 'utf8')) as PuzzleFile;
  const redo = all || only.includes(file.id) || (!only.length && file.hide === undefined);
  let puzzle = parsePuzzle({ ...file, hide: redo ? undefined : file.hide });
  if (redo) {
    const hidden = chooseHidden(puzzle, file.hideRatio ?? 0.5);
    if (!hidden) {
      console.error(`✗ ${file.id}: can't be solved without guessing, even with every clue shown`);
      failed++;
      continue;
    }
    file.hide = encodeHidden(hidden);
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
    puzzle = parsePuzzle(file);
  }
  const result = solve(puzzle.dims, puzzle.clues, undefined, puzzle.lines);
  if (result.solved && file.passes !== result.passes) {
    file.passes = result.passes;
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
  }
  const shown = puzzle.clues.filter(Boolean).length;
  const status = result.solved ? '✓' : '✗';
  if (!result.solved) failed++;
  console.log(
    `${status} ${file.id.padEnd(12)} ${dimsLabel(puzzle.dims).padEnd(8)} ` +
      `${shown}/${puzzle.lines.length} clues shown, ${result.passes} passes${redo ? ' (new)' : ''}`,
  );
}
process.exit(failed ? 1 : 0);
