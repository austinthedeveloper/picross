import { expect, test, type Page } from '@playwright/test';
import { cell, press } from './helpers';

const SIZE = 5;
/** Taps cell (r, c), 0-based. */
const tap = (page: Page, r: number, c: number) => cell(page, r * SIZE + c).tap();

test('the tutorial walks a new player through a solve', async ({ page }) => {
  await page.goto('/#/');
  await page.locator('.how-to-link').tap();
  await expect(page.locator('h1')).toHaveText('How to play');
  const kicker = page.locator('.coach-kicker');
  await expect(kicker).toHaveText('Step 1 of 7');
  await expect(page.locator('.clue.focus')).toHaveCount(1);

  // A wrong fill is turned away with a nudge, and the step stays.
  await tap(page, 0, 0);
  await expect(page.locator('.coach-nudge')).toContainText('stays empty');
  await expect(page.locator('.cell.filled')).toHaveCount(0);

  // Row 3 is all filled.
  for (let c = 0; c < SIZE; c++) await tap(page, 2, c);
  await expect(kicker).toHaveText('Step 2 of 7');
  await expect(page.locator('.coach-nudge')).toBeEmpty();

  // Erasing a finished step goes back to it.
  await tap(page, 2, 0);
  await expect(kicker).toHaveText('Step 1 of 7');
  await tap(page, 2, 0);

  // Overlap, then close the gap.
  for (const [r, c] of [
    [1, 1],
    [3, 1],
    [1, 3],
    [3, 3],
  ])
    await tap(page, r, c);
  await tap(page, 1, 2);
  await expect(kicker).toHaveText('Step 4 of 7');

  // Marking needs the other tool, and the page points at it.
  const mark = page.getByRole('button', { name: '✕ Mark' });
  await expect(mark).toHaveClass(/nudge/);
  await mark.tap();
  await expect(mark).not.toHaveClass(/nudge/);
  await tap(page, 1, 0);
  await tap(page, 1, 4);
  for (const c of [0, 2, 4]) await tap(page, 3, c);
  await expect(kicker).toHaveText('Step 6 of 7');

  // A mark on a cell that gets filled is turned away too.
  await tap(page, 0, 2);
  await expect(page.locator('.coach-nudge')).toContainText('gets filled');
  await page.getByRole('button', { name: '■ Fill' }).tap();
  await tap(page, 0, 2);
  await mark.tap();
  await tap(page, 4, 2);
  await expect(kicker).toHaveText('Step 7 of 7');
  await page.getByRole('button', { name: '■ Fill' }).tap();
  await tap(page, 4, 1);
  await tap(page, 4, 3);

  await expect(page.locator('.end-panel:not([hidden]) h2')).toHaveText('Solved!');
  await expect(page.locator('.end-name')).toHaveText('Little House');
  await expect(page.locator('.rules')).toBeVisible();

  // It's practice: nothing was recorded, and the first-timer link is still there.
  await press(page, 'Pick a puzzle →');
  await expect(page.locator('.stats')).toContainText('0Total solves');
  await expect(page.locator('.how-to-link')).toBeVisible();
});

test('a drag fills the row, and Start over clears the board', async ({ page }) => {
  await page.goto('/#/how-to-play');
  const from = (await cell(page, 10).boundingBox())!;
  const to = (await cell(page, 14).boundingBox())!;
  await page.mouse.move(from.x + 5, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(to.x + 5, to.y + 5, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('.coach-kicker')).toHaveText('Step 2 of 7');
  await press(page, 'Start over');
  await expect(page.locator('.cell.filled')).toHaveCount(0);
  await expect(page.locator('.coach-kicker')).toHaveText('Step 1 of 7');
});
