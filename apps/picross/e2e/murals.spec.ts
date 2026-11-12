import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { press, solve } from './helpers';

const whale: string[] = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, '../../../packages/grid/src/puzzles/murals/whale.json'),
    'utf8',
  ),
).solution;
/** Tile n (1-based) of the 30×30 whale, as solution rows. */
const tile = (n: number) => {
  const [tr, tc] = [Math.floor((n - 1) / 2), (n - 1) % 2];
  return whale.slice(tr * 15, tr * 15 + 15).map((r) => r.slice(tc * 15, tc * 15 + 15));
};

test('a tile keeps Home one tap away, next to the way back to its mural', async ({ page }) => {
  await page.goto('/#/mural/whale/1');
  await page.getByRole('link', { name: '← Mural' }).tap();
  await expect(page).toHaveURL(/#\/mural\/whale$/);
  await page.goto('/#/mural/whale/1');
  await page.getByRole('link', { name: 'Home' }).tap();
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
});

test('a mural fills in tile by tile, then shows the whole picture', async ({ page }) => {
  await page.goto('/#/free/flat');
  const card = page.locator('.mural-card').first();
  await expect(card).toContainText('Mural No. 1');
  await expect(card).toContainText('0/4');
  await card.tap();
  await expect(page.locator('.mural-tile')).toHaveCount(4);
  await page.getByRole('link', { name: 'Tile 1, unsolved' }).tap();
  await solve(page, tile(1));
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('3 to go');
  await press(page, 'Tile 2 →');
  await expect(page.locator('h1')).toContainText('tile 2/4');

  // With tiles 2 and 3 solved too, tile 4 is the last one. (Leave the game screen
  // first: it would save its copy of progress over this.)
  await page.goto('/#/free/flat');
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('picross:v2')!);
    for (const id of ['whale-2', 'whale-3'])
      save.solved[`grid:${id}`] = { solves: 1, bestTime: 1000 };
    localStorage.setItem('picross:v2', JSON.stringify(save));
  });
  await page.reload();
  await page.goto('/#/mural/whale/4');
  await solve(page, tile(4));
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText(
    'Blue Whale is complete',
  );
  await press(page, 'See the mural');
  await expect(page.locator('h1')).toHaveText('Blue Whale');
  await expect(page.locator('.mural-done canvas')).toBeVisible();
  await page.goto('/#/free/flat');
  await expect(card).toContainText('Blue Whale');
  // Tiles aren't pack puzzles, so none of them count here.
  const pack = fs.readdirSync(
    path.join(import.meta.dirname, '../../../packages/grid/src/puzzles/pack'),
  ).length;
  await expect(page.locator('.stats')).toContainText(`0/${pack}`);
});
