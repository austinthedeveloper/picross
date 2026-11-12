/**
 * Browser-test helpers for a block on screen, for both games' tests (Cubed's, and the 2D
 * game's block fights): puzzles read from their files, and keyboard play on the block.
 */
import { isInsanePair } from '@picross/shared/puzzles/pairs';
import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pointOf } from '@picross/block/engine/volume';
import { parsePuzzle, type Puzzle } from '@picross/block/puzzles/format';
import { dailyPick } from '@picross/block/puzzles/dailyCycle';
import { turnPuzzle } from '@picross/block/puzzles/transform';
import { dayNumber } from '@picross/shared/puzzles/days';

/** The block package's puzzles (the pack, the story's 3D puzzles). */
const PUZZLES = path.join(import.meta.dirname, '../../block/src/puzzles');
const PACK = path.join(PUZZLES, 'pack');
/** The story's data (encounters, jobs), in the story package. */
const STORY = path.join(import.meta.dirname, '../../story/src/puzzles');

/** Pack puzzle ids, biggest block first. */
export const PUZZLES_BY_SIZE = fs
  .readdirSync(PACK)
  .map((f) => parsePuzzle(JSON.parse(fs.readFileSync(path.join(PACK, f), 'utf8'))))
  .sort((a, b) => b.solution.length - a.solution.length)
  .map((p) => p.id);

/** A story encounter's 3D puzzle, by encounter id (from the shared 2D encounter data). */
export function encounterPuzzle(encounterId: string): Puzzle {
  const enc = JSON.parse(
    fs.readFileSync(path.join(STORY, 'encounters', `${encounterId}.json`), 'utf8'),
  );
  const file = path.join(PUZZLES, 'story', `${enc.puzzle}.json`);
  return parsePuzzle(JSON.parse(fs.readFileSync(file, 'utf8')));
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

/**
 * The daily puzzle for a Cubed day (#156: the even days since the epoch), built the way
 * packages/block/src/puzzles/daily.ts builds it.
 */
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
    .filter(({ p }) => longest(p) >= 4 && !isInsanePair(p.id));
  const { source, turn } = dailyPick(Math.floor(dayNumber(key) / 2), pool.length);
  const { f, p } = pool[source];
  return parsePuzzle(turnPuzzle(f, p, turn));
}

/** A pack puzzle, read from its file. */
export function puzzle(id: string): Puzzle {
  const file = path.join(PACK, `${id}.json`);
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
