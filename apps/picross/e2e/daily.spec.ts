import { expect, test } from '@playwright/test';
import { press, solutionFromClues, solve } from './helpers';

test("today's daily, then the streak a day later and after a missed day", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 3, 10));
  await page.goto('/#/');
  const card = page.locator('.daily-card');
  await expect(card).toContainText('Daily · Tue, Nov 3');
  await expect(card).toContainText('Solve one a day to start a streak');
  await card.tap();
  await expect(page.locator('.board')).toBeVisible();
  await solve(page, await solutionFromClues(page));
  const note = page.locator('.end-panel:not([hidden]) .end-note');
  await expect(note).toContainText('🔥 1 day in a row');
  await expect(note).toContainText('It was the ');
  await press(page, 'All puzzles');
  await expect(card).toContainText('✓ Solved');
  await expect(card).toContainText('🔥 1 day in a row · best 1');

  // The next day: a new puzzle, and the streak is still alive.
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10));
  await page.reload();
  await expect(card).toContainText('Daily · Wed, Nov 4');
  await expect(card).toContainText('Not solved yet');
  await expect(card).toContainText('🔥 1 day in a row');

  // Two days after that without solving: it's over.
  await page.clock.setFixedTime(new Date(2026, 10, 6, 10));
  await page.reload();
  await expect(card).toContainText('Streak ended · best 1');
});
