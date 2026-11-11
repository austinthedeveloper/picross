import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pointOf } from '../src/engine/volume';
import { parsePuzzle, type Puzzle } from '../src/puzzles/format';
import { hashString } from '../src/puzzles/hide';
import { turnPuzzle } from '../src/puzzles/transform';

const PACK = path.join(import.meta.dirname, '../src/puzzles/pack');

/** Pack puzzle ids, biggest block first. */
export const PUZZLES_BY_SIZE = fs
  .readdirSync(PACK)
  .map((f) => parsePuzzle(JSON.parse(fs.readFileSync(path.join(PACK, f), 'utf8'))))
  .sort((a, b) => b.solution.length - a.solution.length)
  .map((p) => p.id);

/** A story encounter's 3D puzzle, by encounter id (from the shared 2D encounter data). */
export function encounterPuzzle(encounterId: string): Puzzle {
  const root = path.join(import.meta.dirname, '../src/puzzles');
  const enc = JSON.parse(
    fs.readFileSync(path.join(root, 'encounters', `${encounterId}.json`), 'utf8'),
  );
  const file = path.join(root, 'story', `${enc.puzzle}.json`);
  return parsePuzzle(JSON.parse(fs.readFileSync(file, 'utf8')));
}

/**
 * Starts straight at one encounter of a job: seeds the run save, then opens the
 * encounter (skipping its entrance scene if it has one).
 */
export async function runAt(
  page: Page,
  jobId: string,
  node: number,
  opts: { mode?: 'relaxed' | 'hearts'; hp?: number; gadgets?: string[] } = {},
): Promise<void> {
  const root = path.join(import.meta.dirname, '../src/puzzles');
  const job = JSON.parse(fs.readFileSync(path.join(root, 'runs', `${jobId}.json`), 'utf8'));
  const run = {
    runId: jobId,
    node,
    hp: opts.hp ?? job.hp,
    maxHp: job.hp,
    gadgets: opts.gadgets ?? job.gadgets ?? [],
    status: 'active',
    mode: opts.mode ?? 'relaxed',
    tally: { mistakes: 0, hintsUsed: 0, gadgetsUsed: 0 },
  };
  await page.goto('/');
  await page.evaluate((save) => localStorage.setItem('picross3d:run', JSON.stringify(save)), {
    current: run,
    seenScenes: [],
    seenTips: [],
    jobs: {},
  });
  // Saves are read once when the app loads, so load it again with the run in place. A new
  // query makes it a real page load (a bare hash change could redirect first).
  await page.goto('/?seeded#/story/play');
  await skipScene(page);
  await page.locator('canvas.block-canvas').waitFor();
}

/** Lines of a puzzle with no cubes of the shape: breaking one finishes it. */
export function emptyLines(p: Puzzle): number[][] {
  return p.lines.filter((l) => l.cells.every((c) => !p.solution[c])).map((l) => l.cells);
}

/** Skips a scene if one is playing. */
export async function skipScene(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip ⏭' });
  const canvas = page.locator('canvas.block-canvas');
  // Whichever comes first: the block, or a scene to skip.
  await expect(canvas.or(skip).first()).toBeVisible({ timeout: 30_000 });
  if (await skip.isVisible()) await skip.click();
}

/** The daily puzzle for a date, built the way src/puzzles/daily.ts builds it. */
export function dailyFor(key: string): Puzzle {
  const files = fs
    .readdirSync(PACK)
    .map((f) => JSON.parse(fs.readFileSync(path.join(PACK, f), 'utf8')));
  const longest = (p: Puzzle) => Math.max(p.dims.x, p.dims.y, p.dims.z);
  const volume = (p: Puzzle) => p.solution.length;
  const pool = files
    .map((f) => ({ f, p: parsePuzzle(f) }))
    .sort(
      (a, b) =>
        longest(a.p) - longest(b.p) ||
        volume(a.p) - volume(b.p) ||
        a.p.passes - b.p.passes ||
        a.p.name.localeCompare(b.p.name),
    )
    .filter(({ p }) => longest(p) >= 4);
  const { f, p } = pool[hashString(`daily:${key}`) % pool.length];
  const h = hashString(`turn:${key}`);
  const turn = { quarters: (h % 4) as 0 | 1 | 2 | 3, mirror: Boolean((h >> 2) & 1) };
  return parsePuzzle(turnPuzzle(f, p, turn));
}

/** A pack puzzle, read from its file. */
export function puzzle(id: string): Puzzle {
  const file = path.join(import.meta.dirname, '../src/puzzles/pack', `${id}.json`);
  return parsePuzzle(JSON.parse(fs.readFileSync(file, 'utf8')));
}

const block = (page: Page) => page.locator('canvas.block-canvas');

/** Starts keyboard play: focuses the block and shows the cursor. */
export async function focusBlock(page: Page): Promise<void> {
  await block(page).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(block(page)).not.toHaveAttribute('data-cursor', '');
}

/**
 * Moves the keyboard cursor to a cube. From the starting camera, Right is +x, Up is
 * toward the back (−z) and PageUp is a layer up.
 */
export async function moveTo(page: Page, p: Puzzle, cell: number): Promise<void> {
  const at = Number(await block(page).getAttribute('data-cursor'));
  const from = pointOf(p.dims, at);
  const to = pointOf(p.dims, cell);
  const press = async (key: string, times: number) => {
    for (let n = 0; n < times; n++) await page.keyboard.press(key);
  };
  await press(to.x > from.x ? 'ArrowRight' : 'ArrowLeft', Math.abs(to.x - from.x));
  await press(to.z > from.z ? 'ArrowDown' : 'ArrowUp', Math.abs(to.z - from.z));
  await press(to.y > from.y ? 'PageUp' : 'PageDown', Math.abs(to.y - from.y));
  await expect(block(page)).toHaveAttribute('data-cursor', String(cell));
}

/** Breaks the given cubes with the keyboard. */
export async function breakCubes(page: Page, p: Puzzle, cells: number[]): Promise<void> {
  for (const cell of cells) {
    await moveTo(page, p, cell);
    await page.keyboard.press('x');
  }
}

/** Every cube that isn't part of the shape. */
export const extras = (p: Puzzle) => [...p.solution.keys()].filter((i) => p.solution[i] === 0);
export const shapeCubes = (p: Puzzle) => [...p.solution.keys()].filter((i) => p.solution[i] !== 0);
