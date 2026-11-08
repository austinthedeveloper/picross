import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pointOf } from '../src/engine/volume';
import { parsePuzzle, type Puzzle } from '../src/puzzles/format';

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
