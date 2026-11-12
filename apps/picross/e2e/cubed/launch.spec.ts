import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parseDiorama, type DioramaFile } from '@picross/block/puzzles/diorama';
import { addDays, dailyDimension } from '@picross/shared/puzzles/days';
import { breakCubes, dailyFor, extras, focusBlock } from './helpers';

/** A day's Cubed daily, and how many cubes it takes to break. */
const daily = (key: string) => {
  const puzzle = dailyFor(key);
  return { puzzle, breaks: extras(puzzle).length };
};

// The Cubed day this month and next whose block breaks quickest, so the test stays short as
// the pack grows (which day gets which puzzle shifts with every puzzle added). Cubed days are
// the even ones since the epoch (#156); the day before is a Flat one.
const cubedDay = Array.from({ length: 60 }, (_, i) => addDays('2026-11-01', i))
  .filter((key) => dailyDimension(key) === 'block')
  .reduce((best, key) => (daily(key).breaks < daily(best).breaks ? key : best));
const [y, m, d] = cubedDay.split('-').map(Number);
const flatDay = addDays(cubedDay, -1);

test("the daily on a Cubed day: a block, on yesterday's Flat streak", async ({ page, context }) => {
  // Yesterday's Flat daily solved, on the one daily's save.
  await context.addInitScript((day) => {
    if (localStorage.getItem('picross:daily2')) return;
    const save = {
      days: { [day]: { dimension: 'grid' } },
      lastSolved: day,
      streak: 1,
      best: 1,
      solves: 1,
    };
    localStorage.setItem('picross:daily2', JSON.stringify(save));
  }, flatDay);
  await page.clock.setFixedTime(new Date(y, m - 1, d, 12));
  // The one daily's card is on the home screen (#152).
  await page.goto(`/?day=${d}#/`);
  const card = page.locator('.daily-card');
  await expect(card).toContainText('Today: Cubed · Not solved yet');
  await expect(card).toContainText('🔥 1 day in a row');
  await card.click();
  await expect(page).toHaveURL(/#\/daily$/);
  const { puzzle } = daily(cubedDay);
  await focusBlock(page);
  await breakCubes(page, puzzle, extras(puzzle));
  await expect(page.locator('.end-note')).toContainText('2 days in a row');
  await page.getByRole('link', { name: 'All puzzles' }).click();
  await expect(page).toHaveURL(/#\/free\/cubed$/);
  await page.goto('/#/');
  await expect(card).toContainText('Today: Cubed · ✓ Solved in');
  await expect(card).toContainText('🔥 2 days in a row');
});

test("Cubed's badges are on the one shelf, with their next step, and count new ones", async ({
  page,
}) => {
  await page.goto('/#/');
  const menu = page.getByRole('navigation', { name: 'Menu' });
  await expect(menu.getByRole('link', { name: /^Badges/ })).not.toContainText('new');
  // A solve earns progress toward Block Breaker; five earn bronze.
  await page.evaluate(() => {
    const solved = Object.fromEntries(
      ['steps', 'jack', 'table', 'mug', 'cactus'].map((id) => [
        `block:${id}`,
        { solves: 1, bestTime: 60000, clean: 1 },
      ]),
    );
    localStorage.setItem(
      'picross:v2',
      JSON.stringify({ solved, boards: {}, time: { block: 300000 } }),
    );
  });
  await page.reload();
  await expect(menu.getByRole('link', { name: /Badges \(\d+ new\)/ })).toBeVisible();
  await menu.getByRole('link', { name: /Badges/ }).click();
  // The one shelf (#157), off Cubed's board.
  await expect(page).toHaveURL(/#\/badges$/);
  await expect(page.locator('html')).not.toHaveAttribute('data-board', 'block');
  const shelf = page.getByRole('region', { name: 'Free play · Cubed' });
  const breaker = shelf.locator('.badge-card').filter({ hasText: 'Block Breaker' });
  await expect(breaker).toContainText('Bronze');
  await expect(breaker).toContainText('New!');
  await expect(breaker).toContainText('Silver at 15 (5 so far)');
  // Seen now: back home, nothing's new.
  await page.goto('/#/');
  await expect(menu.getByRole('link', { name: /^Badges/ })).toBeVisible();
  await expect(menu.getByRole('link', { name: /^Badges/ })).not.toContainText('new');
});

test('a diorama fills in piece by piece, then turns in 3D', async ({ page }) => {
  test.setTimeout(120_000);
  const file = JSON.parse(
    fs.readFileSync(
      path.join(import.meta.dirname, '../../../../packages/block/src/puzzles/dioramas/park.json'),
      'utf8',
    ),
  ) as DioramaFile;
  const park = parseDiorama(file);
  // Breaking every piece by keyboard is slow on CI's software rendering, so the pieces with
  // the most to break start out placed; the test places one piece and finishes with another.
  const [first, last, ...placed] = [...park.tiles].sort(
    (a, b) => extras(a.puzzle).length - extras(b.puzzle).length,
  );
  await page.goto('/#/free/cubed');
  await page.evaluate(
    (ids) => {
      const solved = Object.fromEntries(
        ids.map((id) => [`block:${id}`, { solves: 1, bestTime: 60000, clean: 1 }]),
      );
      localStorage.setItem('picross:v2', JSON.stringify({ solved, boards: {}, time: {} }));
    },
    placed.map((tile) => `park-${tile.index + 1}`),
  );
  await page.reload();
  await page.locator('.dioramas .puzzle-card').filter({ hasText: 'Park' }).click();
  await expect(page.locator('.stats')).toContainText(
    `${placed.length} of ${park.tiles.length} pieces`,
  );
  for (const tile of [first, last]) {
    await page.goto(`/#/cubed/diorama/park/${tile.index + 1}`);
    await focusBlock(page);
    await breakCubes(page, tile.puzzle, extras(tile.puzzle));
    await expect(page.locator('.end-panel h2')).toHaveText(tile === last ? 'Finished!' : 'Placed!');
  }
  await page.getByRole('link', { name: 'See it' }).click();
  await expect(page.locator('.stats')).toContainText('Finished!');
  await expect(page.locator('.diorama-stage canvas')).toBeVisible();
});
