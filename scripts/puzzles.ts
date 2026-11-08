/**
 * Checks every puzzle in src/puzzles/pack and picks which clues each one hides.
 *
 *   npm run puzzles            hide clues for puzzles that have no `hide` yet, check the rest
 *   npm run puzzles -- --all   pick again for every puzzle (after changing a shape or ratio)
 *   npm run puzzles -- mug     pick again for just these ids
 *
 * A puzzle has to be solvable without guessing from the clues it shows. See docs/how-to.md.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { solve } from '../src/engine/solver';
import { dimsLabel } from '../src/engine/volume';
import { encodeHidden, parsePuzzle, type PuzzleFile } from '../src/puzzles/format';
import { chooseHidden } from '../src/puzzles/hide';

const DIR = join(import.meta.dirname, '../src/puzzles/pack');
const args = process.argv.slice(2);
const all = args.includes('--all');
const only = args.filter((a) => !a.startsWith('--'));
let failed = 0;

for (const name of readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const path = join(DIR, name);
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
