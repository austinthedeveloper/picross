import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parseDiorama, type DioramaFile } from '../src/puzzles/diorama';
import { breakCubes, dailyFor, extras, focusBlock } from './helpers';

test('the daily puzzle: one block a day, and a streak across days', async ({ page }) => {
  for (const [day, streak] of [
    [8, '1 day in a row'],
    [9, '2 days in a row'],
  ] as const) {
    await page.clock.setFixedTime(new Date(2026, 10, day, 12));
    await page.goto(`/?day=${day}`);
    await expect(page.locator('.daily-card')).toContainText(`Daily · Nov ${day}`);
    await page.locator('.daily-card').click();
    const puzzle = dailyFor(`2026-11-0${day}`);
    await focusBlock(page);
    await breakCubes(page, puzzle, extras(puzzle));
    await expect(page.locator('.end-note')).toContainText(streak);
    await page.getByRole('link', { name: 'All puzzles' }).click();
    await expect(page.locator('.daily-card')).toContainText('Solved in');
  }
});

test('badges list every badge with its next step, and count new ones', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Badges', exact: true })).toBeVisible();
  // A solve earns progress toward Block Breaker; five earn bronze.
  await page.evaluate(() => {
    const solved = Object.fromEntries(
      ['steps', 'jack', 'table', 'mug', 'cactus'].map((id) => [
        id,
        { solves: 1, bestTime: 60000, clean: 1 },
      ]),
    );
    localStorage.setItem('picross3d:v1', JSON.stringify({ solved, boards: {}, totalTime: 300000 }));
  });
  await page.reload();
  await expect(page.getByRole('link', { name: /Badges \(\d+ new\)/ })).toBeVisible();
  await page.getByRole('link', { name: /Badges/ }).click();
  const breaker = page.locator('.badge-row').filter({ hasText: 'Block Breaker' });
  await expect(breaker).toContainText('Bronze');
  await expect(breaker).toContainText('New!');
  await expect(breaker).toContainText('Silver at 15 (5 so far)');
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByRole('link', { name: 'Badges', exact: true })).toBeVisible();
});

test('a diorama fills in piece by piece, then turns in 3D', async ({ page }) => {
  test.setTimeout(120_000);
  const file = JSON.parse(
    fs.readFileSync(path.join(import.meta.dirname, '../src/puzzles/dioramas/park.json'), 'utf8'),
  ) as DioramaFile;
  const park = parseDiorama(file);
  await page.goto('/');
  await page.locator('.dioramas .puzzle-card').filter({ hasText: 'Park' }).click();
  await expect(page.locator('.stats')).toContainText(`0 of ${park.tiles.length} pieces`);
  for (const tile of park.tiles) {
    await page.goto(`/#/diorama/park/${tile.index + 1}`);
    await focusBlock(page);
    await breakCubes(page, tile.puzzle, extras(tile.puzzle));
    await expect(page.locator('.end-panel h2')).toHaveText(/Placed!|Finished!/);
  }
  await page.getByRole('link', { name: 'See it' }).click();
  await expect(page.locator('.stats')).toContainText('Finished!');
  await expect(page.locator('.diorama-stage canvas')).toBeVisible();
});
