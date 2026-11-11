/**
 * Works out how hard every story, Overtime and boss fight is on each board that can play
 * it, and saves it to src/puzzles/fight-ratings.json (#168). Run it after changing a fight,
 * an enemy power, a battle or a solver, and review the diff: `npm run rate:fights`. It
 * also prints the bosses' table for docs/architecture.md ("Difficulty"), which explains
 * the numbers.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { chapters } from '../src/puzzles/chapters';
import { rateFights, type BoardRating } from '../src/puzzles/fightRatings';

const started = performance.now();
const ratings = rateFights();
const file = path.join(import.meta.dirname, '../src/puzzles/fight-ratings.json');
writeFileSync(file, `${JSON.stringify(ratings, null, 2)}\n`);
const fights = Object.values(ratings);
console.log(
  `Rated ${fights.length} fights (${fights.filter((f) => f.block).length} on a block too) in ${Math.round(performance.now() - started)} ms.\n`,
);

const cells = (r: BoardRating | undefined) =>
  r ? [r.size, String(r.passes), `${Math.round(r.firstPass * 100)}%`] : ['', '', ''];
const rows = chapters.flatMap((chapter) =>
  chapter.jobs.flatMap((job) =>
    job.encounters
      .filter((e) => e.boss && e.enemy)
      .map((e) => [
        e.name,
        String(chapter.number),
        ...cells(ratings[e.id]?.flat),
        ...cells(ratings[e.id]?.block),
      ]),
  ),
);
const head = ['Boss', 'Chapter', 'Flat', 'Passes', 'First pass', 'Block', 'Passes', 'First pass'];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (r: string[]) => `| ${r.map((c, i) => c.padEnd(widths[i])).join(' | ')} |`;
console.log(
  [line(head), `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`, ...rows.map(line)].join('\n'),
);
