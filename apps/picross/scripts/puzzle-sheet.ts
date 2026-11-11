/**
 * Puzzle sheets: author many puzzles in one text file, check them, and export
 * them as pack JSON.
 *
 *   npx vite-node scripts/puzzle-sheet.ts check <sheet.txt>...   report each puzzle
 *   npx vite-node scripts/puzzle-sheet.ts fix <sheet.txt>        repair ambiguous ones in place
 *   npx vite-node scripts/puzzle-sheet.ts export <outdir> <sheet.txt>...
 *   npx vite-node scripts/puzzle-sheet.ts mural <mural.json>     report each tile of a mural
 *   npx vite-node scripts/puzzle-sheet.ts mural-fix <mural.json> repair ambiguous tiles in place
 *
 * A sheet is puzzles separated by blank lines. The first line of each is the
 * name, optionally followed by " | id=<id>"; the rest are solution rows made
 * of `#` and `.`. Lines starting with `//` are comments.
 *
 *   Dragon | id=red-dragon
 *   ......####.....
 *   ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { deriveClues } from '@picross/grid/engine/clues';
import { solve, Unknown, type Knowledge } from '@picross/grid/engine/solver';
import { slugify, stringifyPuzzle, type PuzzleFile } from '@picross/grid/puzzles/format';
import { parseMural } from '@picross/grid/puzzles/murals';

interface Entry extends PuzzleFile {
  /** Where it came from, for messages. */
  source: string;
}

export function parseSheet(text: string, source = 'sheet'): Entry[] {
  const entries: Entry[] = [];
  const blocks = text
    .split(/\r?\n/)
    .filter((l) => !l.trimStart().startsWith('//'))
    .join('\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  for (const block of blocks) {
    const [head, ...rows] = block.split('\n').map((l) => l.trim());
    const [name, ...opts] = head.split('|').map((s) => s.trim());
    let id = slugify(name);
    for (const opt of opts) {
      const [k, v] = opt.split('=').map((s) => s.trim());
      if (k === 'id' && v) id = v;
      else throw new Error(`${source}: "${name}": unknown option "${opt}"`);
    }
    if (!rows.length) throw new Error(`${source}: "${name}" has no rows`);
    const width = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== width) {
        throw new Error(`${source}: "${name}" row ${i} is ${r.length} wide, expected ${width}`);
      }
      if (/[^#.]/.test(r)) throw new Error(`${source}: "${name}" row ${i} has odd characters`);
    });
    entries.push({ id, name, width, height: rows.length, solution: rows, source });
  }
  return entries;
}

const cellsOf = (e: PuzzleFile) => e.solution.flatMap((r) => [...r].map((ch) => ch === '#'));

function solveEntry(e: PuzzleFile, cells = cellsOf(e)) {
  return solve(e.width, e.height, deriveClues({ width: e.width, height: e.height, cells }));
}

function unknownCount(e: PuzzleFile, cells: boolean[]): number {
  const r = solveEntry(e, cells);
  return r.status === 'unique' ? 0 : r.status === 'ambiguous' ? r.unknown : Infinity;
}

/** The picture, with `?` on the cells the solver can't decide. */
function picture(e: PuzzleFile, grid?: Knowledge[]): string {
  const lines: string[] = [];
  for (let r = 0; r < e.height; r++) {
    let line = '';
    for (let c = 0; c < e.width; c++) {
      const i = r * e.width + c;
      const filled = e.solution[r][c] === '#';
      line += grid && grid[i] === Unknown ? '?' : filled ? '█' : '·';
    }
    lines.push('  ' + line);
  }
  return lines.join('\n');
}

const fill = (e: PuzzleFile) => cellsOf(e).filter(Boolean).length / (e.width * e.height);

/**
 * Repairs an ambiguous puzzle by flipping a few cells. Each step tries every
 * undecided cell and its neighbours, keeps the flip that leaves the fewest
 * undecided cells, and prefers flips that keep the picture smooth (no new
 * lone pixels or pinholes).
 */
export function repair(e: PuzzleFile, maxFlips = 8): { cells: boolean[]; flips: string[] } {
  const { width, height } = e;
  const cells = cellsOf(e);
  const flips: string[] = [];
  const neighbours = (i: number) => {
    const r = Math.floor(i / width);
    const c = i % width;
    const out: number[] = [];
    if (r > 0) out.push(i - width);
    if (r < height - 1) out.push(i + width);
    if (c > 0) out.push(i - 1);
    if (c < width - 1) out.push(i + 1);
    return out;
  };
  const filledAround = (i: number, grid: boolean[]) => neighbours(i).filter((n) => grid[n]).length;

  for (let step = 0; step < maxFlips; step++) {
    const result = solveEntry(e, cells);
    if (result.status === 'unique') break;
    if (result.status === 'contradiction') break;
    const candidates = new Set<number>();
    result.grid.forEach((v, i) => {
      if (v === Unknown) {
        candidates.add(i);
        neighbours(i).forEach((n) => candidates.add(n));
      }
    });
    let best: { i: number; score: number; smooth: number } | null = null;
    for (const i of candidates) {
      const trial = [...cells];
      trial[i] = !trial[i];
      const score = unknownCount(e, trial);
      // Smoothness: a filled cell with 2+ filled neighbours, or an empty cell
      // with 2- filled neighbours, blends in. Lower is smoother.
      const around = filledAround(i, trial);
      const smooth = trial[i] ? Math.max(0, 2 - around) : Math.max(0, around - 2);
      if (!best || score < best.score || (score === best.score && smooth < best.smooth)) {
        best = { i, score, smooth };
      }
    }
    if (!best || best.score >= result.unknown) break;
    cells[best.i] = !cells[best.i];
    flips.push(`(${Math.floor(best.i / width)},${best.i % width}) → ${cells[best.i] ? '#' : '.'}`);
  }
  return { cells, flips };
}

function toRows(e: PuzzleFile, cells: boolean[]): string[] {
  return Array.from({ length: e.height }, (_, r) =>
    cells
      .slice(r * e.width, (r + 1) * e.width)
      .map((f) => (f ? '#' : '.'))
      .join(''),
  );
}

/**
 * Ids already taken by puzzles that don't come from a sheet: run-only puzzles
 * and hand-written pack files. A pack file exported from a committed sheet is
 * fine to overwrite, so editing a drawing and re-exporting doesn't trip this.
 */
function reservedIds(): Set<string> {
  // The pack and its sheets are in packages/grid.
  const root = path.join(import.meta.dirname, '../../../packages/grid/src/puzzles');
  const fromSheets = new Set<string>();
  const sheetDir = path.join(root, 'sheets');
  if (fs.existsSync(sheetDir)) {
    for (const f of fs.readdirSync(sheetDir)) {
      if (!f.endsWith('.txt')) continue;
      for (const e of parseSheet(fs.readFileSync(path.join(sheetDir, f), 'utf8'), f)) {
        fromSheets.add(e.id);
      }
    }
  }
  const ids = new Set<string>();
  // Run puzzles are the story's, in the story package.
  const story = path.join(import.meta.dirname, '../../../packages/story/src/puzzles');
  for (const dir of ['pack', 'run']) {
    const full = path.join(dir === 'run' ? story : root, dir);
    for (const f of fs.readdirSync(full)) {
      if (!f.endsWith('.json')) continue;
      const id = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')).id as string;
      if (dir === 'run' || !fromSheets.has(id)) ids.add(id);
    }
  }
  return ids;
}

function check(files: string[], { quiet = false } = {}): boolean {
  const taken = reservedIds();
  const seen = new Map<string, string>();
  let ok = true;
  let count = 0;
  for (const file of files) {
    const entries = parseSheet(fs.readFileSync(file, 'utf8'), file);
    for (const e of entries) {
      count++;
      const problems: string[] = [];
      if (e.width !== e.height) problems.push(`not square (${e.width}×${e.height})`);
      if (e.width < 5 || e.width > 20) problems.push(`size ${e.width} is outside 5–20`);
      if (taken.has(e.id)) problems.push(`id "${e.id}" already exists in the pack or run puzzles`);
      if (seen.has(e.id)) problems.push(`id "${e.id}" also used in ${seen.get(e.id)}`);
      seen.set(e.id, file);
      const pct = Math.round(fill(e) * 100);
      if (pct < 25) problems.push(`only ${pct}% filled; aim for 35–60%`);
      if (pct > 70) problems.push(`${pct}% filled; aim for 35–60%`);
      const result = solveEntry(e);
      if (result.status === 'ambiguous') {
        problems.push(`AMBIGUOUS: ${result.unknown} cells can't be decided (shown as ?)`);
      } else if (result.status === 'contradiction') {
        problems.push('CONTRADICTION (this should be impossible)');
      }
      const tag = `${e.name} [${e.id}] ${e.width}×${e.height} ${pct}%`;
      if (problems.length) {
        ok = false;
        console.log(`✗ ${tag} (${file})`);
        for (const p of problems) console.log(`    ${p}`);
        console.log(picture(e, result.status === 'ambiguous' ? result.grid : undefined));
        console.log();
      } else if (!quiet) {
        console.log(`✓ ${tag}`);
      }
    }
  }
  console.log(
    `${count} puzzles in ${files.length} sheet(s): ${ok ? 'all good' : 'problems above'}`,
  );
  return ok;
}

function fix(file: string): void {
  const text = fs.readFileSync(file, 'utf8');
  const entries = parseSheet(text, file);
  let out = text;
  for (const e of entries) {
    if (solveEntry(e).status === 'unique') continue;
    const { cells, flips } = repair(e);
    const status = solveEntry(e, cells).status;
    console.log(`${e.name}: ${flips.length} flip(s) → ${status}`);
    for (const f of flips) console.log(`    ${f}`);
    if (status !== 'unique') {
      console.log('    still ambiguous; redraw this one near the ? cells');
      continue;
    }
    const before = e.solution.join('\n');
    const after = toRows(e, cells).join('\n');
    if (!out.includes(before)) throw new Error(`couldn't find "${e.name}" in ${file} to rewrite`);
    out = out.replace(before, after);
    console.log(picture({ ...e, solution: toRows(e, cells) }));
  }
  fs.writeFileSync(file, out);
}

function exportSheets(outDir: string, files: string[]): void {
  if (!check(files, { quiet: true })) {
    console.error('Fix the problems above before exporting.');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of files) {
    for (const e of parseSheet(fs.readFileSync(file, 'utf8'), file)) {
      const puzzle: PuzzleFile = {
        id: e.id,
        name: e.name,
        width: e.width,
        height: e.height,
        solution: e.solution,
      };
      fs.writeFileSync(path.join(outDir, `${e.id}.json`), stringifyPuzzle(puzzle));
    }
  }
  console.log(`exported to ${outDir}`);
}

/** A mural's tiles as puzzle files, row by row, with where each sits in the picture. */
function muralTiles(rows: string[], tile: number) {
  const across = rows[0].length / tile;
  const down = rows.length / tile;
  return Array.from({ length: across * down }, (_, n) => {
    const [tr, tc] = [Math.floor(n / across), n % across];
    const solution = rows
      .slice(tr * tile, (tr + 1) * tile)
      .map((r) => r.slice(tc * tile, (tc + 1) * tile));
    const file: PuzzleFile = {
      id: `tile-${n + 1}`,
      name: `Tile ${n + 1}`,
      width: tile,
      height: tile,
      solution,
    };
    return { file, tr, tc };
  });
}

/** Checks a mural file: its shape, and that every tile is uniquely solvable on its own. */
function checkMural(file: string): boolean {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  parseMural(data); // Throws on a bad shape or an empty tile.
  const rows: string[] = data.solution;
  console.log(rows.map((r) => '  ' + r.replace(/#/g, '█').replace(/\./g, '·')).join('\n'));
  let ok = true;
  for (const { file: tile } of muralTiles(rows, data.tile)) {
    const result = solveEntry(tile);
    const pct = Math.round(fill(tile) * 100);
    if (result.status === 'unique') {
      console.log(`✓ ${tile.name} ${pct}%`);
    } else {
      ok = false;
      console.log(`✗ ${tile.name} ${pct}% ${result.status}; \`?\` cells can't be decided`);
      console.log(picture(tile, result.status === 'ambiguous' ? result.grid : undefined));
    }
  }
  console.log(`${data.name}: ${ok ? 'all good' : 'problems above'}`);
  return ok;
}

/** Repairs ambiguous tiles by flipping cells, and rewrites the mural file. */
function fixMural(file: string): void {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows: string[][] = (data.solution as string[]).map((r) => [...r]);
  for (const { file: tile, tr, tc } of muralTiles(data.solution, data.tile)) {
    if (solveEntry(tile).status === 'unique') continue;
    const { cells, flips } = repair(tile, 16);
    console.log(`${tile.name}: ${flips.length} flip(s) → ${solveEntry(tile, cells).status}`);
    toRows(tile, cells).forEach((line, r) =>
      [...line].forEach((ch, c) => (rows[tr * data.tile + r][tc * data.tile + c] = ch)),
    );
  }
  data.solution = rows.map((r) => r.join(''));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case 'check':
    process.exit(check(args) ? 0 : 1);
  // eslint-disable-next-line no-fallthrough -- process.exit never returns
  case 'fix':
    for (const f of args) fix(f);
    break;
  case 'export':
    exportSheets(args[0], args.slice(1));
    break;
  case 'mural':
    process.exit(args.map(checkMural).every(Boolean) ? 0 : 1);
  // eslint-disable-next-line no-fallthrough -- process.exit never returns
  case 'mural-fix':
    args.forEach(fixMural);
    break;
  default:
    console.error('usage: puzzle-sheet.ts check|fix|export|mural|mural-fix ...');
    process.exit(1);
}
