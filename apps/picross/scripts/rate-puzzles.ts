/**
 * Works out how hard each pack puzzle is and saves it to the pack's ratings.json, in
 * packages/grid/src/puzzles (#112). Run it after adding or changing puzzles:
 * `npm run rate:puzzles`.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { linePasses } from '@picross/grid/engine/solver';
import { puzzles } from '@picross/grid/puzzles/index';

const ratings = Object.fromEntries(
  [...puzzles]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => [p.id, linePasses(p.width, p.height, p.clues)]),
);
const file = path.join(import.meta.dirname, '../../../packages/grid/src/puzzles/ratings.json');
writeFileSync(file, `${JSON.stringify(ratings, null, 2)}\n`);
console.log(`Rated ${puzzles.length} puzzles.`);
