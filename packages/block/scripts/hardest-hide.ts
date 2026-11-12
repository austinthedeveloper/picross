/**
 * For an Insane puzzle: tries many shuffles of which clues to hide (`chooseHidden`'s seed)
 * and keeps the one the line solver needs the most passes for. Every choice it keeps is
 * still solvable without guessing; only how much it gives away changes. From here:
 *
 *   npm run hardest-hide -- <tries> <id>...
 *
 * It writes each puzzle's `hide` and `passes`; `npm run puzzles` keeps them while the
 * shape doesn't change.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { solve } from '../src/engine/solver';
import { encodeHidden, parsePuzzle, type PuzzleFile } from '../src/puzzles/format';
import { chooseHidden, hashString } from '../src/puzzles/hide';

const [tries, ...ids] = process.argv.slice(2);
for (const id of ids) {
  const path = join(import.meta.dirname, '../src/puzzles/pack', `${id}.json`);
  const file = JSON.parse(readFileSync(path, 'utf8')) as PuzzleFile;
  const puzzle = parsePuzzle({ ...file, hide: undefined });
  let best = { passes: -1, hide: '' };
  for (let n = 0; n < Number(tries); n++) {
    const hidden = chooseHidden(puzzle, file.hideRatio ?? 0.5, hashString(id) + n * 7919);
    if (!hidden) break;
    const hide = encodeHidden(hidden);
    const p = parsePuzzle({ ...file, hide });
    const result = solve(p.dims, p.clues, undefined, p.lines);
    if (result.solved && result.passes > best.passes) best = { passes: result.passes, hide };
  }
  file.hide = best.hide;
  file.passes = best.passes;
  writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
  console.log(`${id}: ${best.passes} passes`);
}
