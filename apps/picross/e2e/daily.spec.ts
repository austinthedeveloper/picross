import { expect, test } from '@playwright/test';
import {
  breakCubes,
  dailyFor as cubedDaily,
  extras,
  focusBlock,
} from '@picross/play-block/e2e/helpers';
import { addDays, dailyDimension } from '@picross/shared/puzzles/days';
import { press, solutionFromClues, solve } from './helpers';

/**
 * The one daily (#156): Flat on odd days since the epoch, Cubed on even ones, with one
 * streak over both. Each test fixes the clock to the days it plays.
 */

/** Noon on a day key, for the fixed clock. */
const noon = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

/** The card's "Thu, Nov 12" for a day key. */
const label = (key: string) =>
  noon(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// A Flat day followed by the Cubed day whose block breaks quickest (in the next two months),
// so the test stays short as the pack grows.
const cubedDays = Array.from({ length: 60 }, (_, i) => addDays('2026-11-12', i)).filter(
  (day) => dailyDimension(day) === 'block',
);
const cubedDay = cubedDays.reduce((best, day) =>
  extras(cubedDaily(day)).length < extras(cubedDaily(best)).length ? day : best,
);
const flatDay = addDays(cubedDay, -1);

test('a Flat day, then a Cubed day: one streak over both', async ({ page }) => {
  expect(dailyDimension(flatDay)).toBe('grid');
  await page.clock.setFixedTime(noon(flatDay));
  // The daily's card is on the home screen (#152).
  await page.goto('/#/');
  const card = page.locator('.daily-card');
  await expect(card).toContainText(`Daily · ${label(flatDay)}`);
  await expect(card).toContainText('Today: Flat');
  await expect(card).toContainText('Solve one a day to start a streak');
  await card.tap();
  await expect(page).toHaveURL(/#\/daily$/);
  await expect(page.locator('.board')).toBeVisible();
  await solve(page, await solutionFromClues(page));
  const note = page.locator('.end-panel:not([hidden]) .end-note');
  await expect(note).toContainText('🔥 1 day in a row');
  await expect(note).toContainText('It was the ');
  await press(page, 'All puzzles');
  await expect(page).toHaveURL(/#\/free\/flat$/);
  await page.goto('/#/');
  await expect(card).toContainText('✓ Solved');
  await expect(card).toContainText('🔥 1 day in a row · best 1');

  // The next day is Cubed's: the same card and link open a block, and the streak goes on.
  await page.clock.setFixedTime(noon(cubedDay));
  await page.reload();
  await expect(card).toContainText(`Daily · ${label(cubedDay)}`);
  await expect(card).toContainText('Today: Cubed · Not solved yet');
  await expect(card).toContainText('🔥 1 day in a row');
  await card.tap();
  await expect(page).toHaveURL(/#\/daily$/);
  const puzzle = cubedDaily(cubedDay);
  await focusBlock(page);
  await breakCubes(page, puzzle, extras(puzzle));
  await expect(page.locator('.end-note')).toContainText('2 days in a row');
  // Home shows it solved, on the one streak.
  await page.goto('/#/');
  await expect(card).toContainText('Today: Cubed · ✓ Solved in');
  await expect(card).toContainText('🔥 2 days in a row · best 2');

  // A Flat day goes by unsolved: the streak's over.
  await page.clock.setFixedTime(noon(addDays(cubedDay, 2)));
  await page.reload();
  await expect(card).toContainText('Streak ended · best 2');
});

test('the old link to Cubed’s daily opens the one daily, on either board', async ({ page }) => {
  for (const day of [cubedDay, flatDay]) {
    await page.clock.setFixedTime(noon(day));
    await page.goto('/#/cubed/daily');
    await expect(page).toHaveURL(/\/#\/daily$/);
    await expect(
      page.locator(dailyDimension(day) === 'block' ? 'canvas.block-canvas' : '.board'),
    ).toBeVisible();
  }
  // On a Flat day, the home screen's card sends you to the Flat board.
  await page.goto('/#/');
  const card = page.locator('.daily-card');
  await expect(card).toContainText(`Today: Flat`);
  await expect(card).toHaveAttribute('href', '#/daily');
});
