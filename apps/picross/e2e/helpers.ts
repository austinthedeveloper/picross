import { encounterPuzzle, extras, focusBlock, moveTo } from '../cubed/e2e/helpers';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { solve as lineSolve } from '../src/engine/solver';

const PUZZLES = path.join(import.meta.dirname, '../src/puzzles');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(PUZZLES, file), 'utf8'));

/** A puzzle's solution rows (`#` filled), by puzzle id from the pack or run folders. */
export function solution(puzzleId: string): string[] {
  for (const dir of ['pack', 'run']) {
    const file = path.join(PUZZLES, dir, `${puzzleId}.json`);
    if (fs.existsSync(file)) return read(`${dir}/${puzzleId}.json`).solution;
  }
  throw new Error(`No puzzle "${puzzleId}"`);
}

/**
 * Works out a board's solution from the clues on screen, with the game's own
 * solver: for puzzles the test can't look up (the daily one changes every day).
 */
export async function solutionFromClues(page: Page): Promise<string[]> {
  const cluesOf = (selector: string) =>
    page.$$eval(selector, (groups) =>
      groups.map((g) =>
        [...g.querySelectorAll('span')].map((s) => Number(s.textContent)).filter((n) => n > 0),
      ),
    );
  const rows = await cluesOf('.row-clue');
  const cols = await cluesOf('.col-clue');
  const result = lineSolve(cols.length, rows.length, { rows, cols });
  if (result.status !== 'unique') throw new Error(`clues on screen don't solve: ${result.status}`);
  return rows.map((_, r) =>
    result.grid
      .slice(r * cols.length, (r + 1) * cols.length)
      .map((v) => (v === 1 ? '#' : '.'))
      .join(''),
  );
}

/** The solution for an encounter's puzzle. */
export const encounterSolution = (encounterId: string) =>
  solution(read(`encounters/${encounterId}.json`).puzzle);

/** Saved run data to start a test from (the shape of the `picross:run` key). */
export interface RunSeed {
  current?: Record<string, unknown> | null;
  seenScenes?: string[];
  jobs?: Record<string, { plays: number; wins: number; hitsOnWins?: number; bestHp?: number }>;
}

/** Seeds localStorage before the app loads, once per test (later reloads keep what the app saved). */
export async function seed(
  context: BrowserContext,
  data: { run?: RunSeed; settings?: Record<string, unknown> },
) {
  await context.addInitScript((d) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    if (d.run)
      localStorage.setItem(
        'picross:run',
        JSON.stringify({ current: null, seenScenes: [], jobs: {}, ...d.run }),
      );
    if (d.settings) localStorage.setItem('picross:settings', JSON.stringify(d.settings));
  }, data);
}

/** Changes the saved run data partway through a test (merged over what's saved), then reloads. */
export async function updateSave(page: Page, run: RunSeed) {
  await page.evaluate((d) => {
    const saved = JSON.parse(localStorage.getItem('picross:run') ?? '{}');
    localStorage.setItem(
      'picross:run',
      JSON.stringify({ current: null, seenScenes: [], jobs: {}, ...saved, ...d }),
    );
  }, run);
  await page.reload();
}

/** A run in progress at `node`, for seeding straight into an encounter. */
export const runAt = (runId: string, node: number, extra: Record<string, unknown> = {}) => ({
  runId,
  node,
  hp: 14,
  maxHp: 14,
  gadgets: [],
  status: 'active',
  mode: 'hearts',
  ...extra,
});

export const cell = (page: Page, index: number) => page.locator(`.cell[data-i="${index}"]`);

/** What the board shows, one character per cell: `#` filled, `x` marked, `.` empty. */
export const boardState = (page: Page) =>
  page.$$eval('.cell', (cells) =>
    cells.map((c) =>
      c.classList.contains('filled') ? '#' : c.classList.contains('marked') ? 'x' : '.',
    ),
  );

/** Fills one row's solution cells that aren't filled yet. */
export async function fillRow(page: Page, rows: string[], r: number) {
  const n = rows[0].length;
  const state = await boardState(page);
  for (let c = 0; c < n; c++) {
    if (rows[r][c] === '#' && state[r * n + c] !== '#') await cell(page, r * n + c).tap();
  }
}

/**
 * Sets every cell to the answer, erasing wrong fills too, and repeats while
 * the end panel isn't showing (enemies like the Mimic move rows mid-solve).
 */
/**
 * Fills a board to match `rows`, retapping until it's solved. With `stop`, it gives up as
 * soon as that's true (checked before every tap): a fight that moves to a block, say.
 */
export async function solve(page: Page, rows: string[], stop?: () => Promise<boolean>) {
  const n = rows[0].length;
  const done = () => page.locator('.end-panel:not([hidden])').isVisible();
  const tap = async (i: number) => {
    if (stop && (await stop())) return false;
    await cell(page, i).tap();
    return true;
  };
  for (let pass = 0; pass < 8 && !(await done()); pass++) {
    const state = await boardState(page);
    for (let i = 0; i < n * n; i++) {
      const want = rows[Math.floor(i / n)][i % n];
      if (state[i] === '#' && want === '.') {
        if (!(await tap(i))) return;
      } else if (want === '#' && state[i] !== '#') {
        if (state[i] === 'x' && !(await tap(i))) return;
        if (!(await tap(i))) return;
      }
      if (i % n === n - 1 && (await done())) return;
    }
  }
  await expect(page.locator('.end-panel:not([hidden])')).toBeVisible();
}

/** The phase the saved fight is in (how many of the enemy's phases have started). */
export const savedPhase = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem('picross:run') ?? '{}').current?.battle?.phase ?? 0,
  );

/**
 * Breaks a story block's extra cubes with the keyboard (the 3D game's helpers), until it's
 * solved or `stop` is true.
 */
export async function breakBlock(page: Page, encounterId: string, stop: () => Promise<boolean>) {
  const p = encounterPuzzle(encounterId);
  await focusBlock(page);
  for (const cube of extras(p)) {
    if ((await stop()) || (await page.locator('.end-panel:not([hidden])').isVisible())) return;
    await moveTo(page, p, cube);
    await page.keyboard.press('x');
  }
}

/** Skips a scene if one is playing. */
export async function skipScene(page: Page) {
  const dialogue = page.locator('.dialogue');
  const showing = await dialogue
    .waitFor({ state: 'visible', timeout: 1500 })
    .then(() => true)
    .catch(() => false);
  if (showing) await page.locator('.skip').tap();
}

/** Every screen-reader announcement currently on the page. */
export const announcements = (page: Page) =>
  page.$$eval('[aria-live]', (nodes) =>
    nodes
      .map((n) => n.textContent)
      .filter(Boolean)
      .join(' | '),
  );

export const meter = (page: Page, cls: string) =>
  page.locator(`.${cls}`).getAttribute('aria-valuenow').then(Number);

/** Taps the visible button or link whose accessible name contains `name`. */
export function press(page: Page, name: string) {
  return page.getByRole('button', { name }).or(page.getByRole('link', { name })).first().tap();
}
