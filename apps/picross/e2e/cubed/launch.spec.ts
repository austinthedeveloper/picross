import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parseDiorama, type DioramaFile } from '@picross/block/puzzles/diorama';
import { breakCubes, dailyFor, extras, focusBlock } from './helpers';

/** November's daily puzzle for a day, and how many cubes it takes to break. */
const novemberDaily = (day: number) => {
  const puzzle = dailyFor(`2026-11-${String(day).padStart(2, '0')}`);
  return { puzzle, breaks: extras(puzzle).length };
};

// Two days in a row whose blocks break quickest, so the test stays short as the pack grows
// (which day gets which puzzle shifts with every puzzle added).
const firstDay = Array.from({ length: 29 }, (_, i) => i + 1).reduce((best, day) =>
  novemberDaily(day).breaks + novemberDaily(day + 1).breaks <
  novemberDaily(best).breaks + novemberDaily(best + 1).breaks
    ? day
    : best,
);

test('the daily puzzle: one block a day, and a streak across days', async ({ page }) => {
  for (const [day, streak] of [
    [firstDay, '1 day in a row'],
    [firstDay + 1, '2 days in a row'],
  ] as const) {
    await page.clock.setFixedTime(new Date(2026, 10, day, 12));
    await page.goto(`/?day=${day}#/cubed`);
    await expect(page.locator('.daily-card')).toContainText(`Daily · Nov ${day}`);
    await page.locator('.daily-card').click();
    const { puzzle } = novemberDaily(day);
    await focusBlock(page);
    await breakCubes(page, puzzle, extras(puzzle));
    await expect(page.locator('.end-note')).toContainText(streak);
    await page.getByRole('link', { name: 'All puzzles' }).click();
    await expect(page.locator('.daily-card')).toContainText('Solved in');
  }
});

test('badges list every badge with its next step, and count new ones', async ({ page }) => {
  await page.goto('/#/cubed');
  await expect(page.getByRole('link', { name: 'Badges', exact: true })).toBeVisible();
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
  await page.goto('/#/cubed');
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
