/**
 * Works out how hard each pack puzzle is and saves it to src/puzzles/ratings.json
 * (#112). Run it after adding or changing puzzles: `npm run rate:puzzles`.
 */
import { writeFileSync } from 'node:fs';
import { linePasses } from '../src/engine/solver';
import { puzzles } from '../src/puzzles/index';

const ratings = Object.fromEntries(
  [...puzzles]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => [p.id, linePasses(p.width, p.height, p.clues)]),
);
writeFileSync('src/puzzles/ratings.json', `${JSON.stringify(ratings, null, 2)}\n`);
console.log(`Rated ${puzzles.length} puzzles.`);
