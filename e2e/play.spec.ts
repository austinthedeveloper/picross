import { expect, test } from '@playwright/test';
import { breakCubes, extras, focusBlock, puzzle, shapeCubes } from './helpers';

test('the list shows puzzles smallest first, nameless until solved', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();
  const first = page.locator('.puzzle-card').first();
  await expect(first).toContainText('No. 1');
  await expect(first).toContainText('3×3×3');
  await first.click();
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
});

test('solving a puzzle reveals its name and records it', async ({ page }) => {
  const steps = puzzle('steps');
  await page.goto('/#/play/steps');
  await focusBlock(page);
  const cubes = extras(steps);
  await breakCubes(page, steps, cubes.slice(0, -1));
  // Long enough for the clock to pass a second, so a zero time would show.
  await page.waitForTimeout(1200);
  await breakCubes(page, steps, cubes.slice(-1));
  await expect(page.getByRole('heading', { name: 'Solved!' })).toBeVisible();
  await expect(page.locator('.end-name')).toHaveText('Steps');
  await expect(page.locator('.end-note').first()).not.toHaveText(/^0:00/);
  await page.getByRole('link', { name: 'All puzzles' }).click();
  await expect(page.locator('.puzzle-card').first()).toContainText('Steps');
  await expect(page.locator('.puzzle-card').first()).not.toContainText('0:00');
  await expect(page.locator('.stats')).toContainText('1/');
  await expect(page.locator('.stats')).not.toContainText('0:00 played');
});

test('undo puts a broken cube back, and progress survives a reload', async ({ page }) => {
  const steps = puzzle('steps');
  const [a, b] = extras(steps);
  await page.goto('/#/play/steps');
  await focusBlock(page);
  await breakCubes(page, steps, [a, b]);
  await page.keyboard.press('z');
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();
  await page.reload();
  await focusBlock(page);
  // Only the first break was kept: breaking the second again (and the rest) solves it.
  await breakCubes(page, steps, extras(steps).slice(1));
  await expect(page.getByRole('heading', { name: 'Solved!' })).toBeVisible();
});

test('hearts mode costs a heart for breaking the shape, and three end it', async ({ page }) => {
  const steps = puzzle('steps');
  await page.goto('/');
  await page.getByRole('button', { name: 'Hearts' }).click();
  await page.goto('/#/play/steps');
  await expect(page.getByLabel('Hearts')).toHaveText('♥♥♥');
  await focusBlock(page);
  const shape = shapeCubes(steps);
  await breakCubes(page, steps, shape.slice(0, 1));
  await expect(page.getByLabel('Hearts')).toHaveText('♥♥♡');
  await breakCubes(page, steps, shape.slice(1, 3));
  await expect(page.getByRole('heading', { name: 'Out of hearts' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByLabel('Hearts')).toHaveText('♥♥♥');
});

test('a hint works out a line, and a check puts back a mistake', async ({ page }) => {
  const mug = puzzle('mug');
  await page.goto('/#/play/mug');
  await page.getByText('💡 Hint 3').click();
  await page.getByRole('button', { name: 'Work out a line' }).click();
  await expect(page.getByText('💡 Hint 2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
  // Break a cube of the shape (relaxed lets you), then check.
  await focusBlock(page);
  const unbroken = shapeCubes(mug).filter((c) => c !== 0);
  await breakCubes(page, mug, unbroken.slice(-1));
  await page.getByText('💡 Hint 2').click();
  await page.getByRole('button', { name: 'Check for mistakes' }).click();
  await expect(page.locator('.coach')).toContainText('Put back');
  await expect(page.getByText('💡 Hint 1')).toBeVisible();
});

test('the list filters by status and difficulty', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByText('No puzzles match')).toBeVisible();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByLabel('Difficulty').selectOption('easy');
  const bands = await page.locator('.card-band').allTextContents();
  expect(bands.length).toBeGreaterThan(0);
  expect(new Set(bands)).toEqual(new Set(['Easy']));
});

test('the view snaps and peels from either end', async ({ page }) => {
  await page.goto('/#/play/castle');
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  await page.getByRole('button', { name: 'Peel along Y' }).click();
  await page.getByLabel('Layers peeled').fill('2');
  await expect(page.locator('.peel-count')).toHaveText('2 from top');
  await page.getByRole('button', { name: 'Peel from the other end' }).click();
  await expect(page.locator('.peel-count')).toHaveText('2 from bottom');
});

test('how to play links to the first puzzle', async ({ page }) => {
  await page.goto('/#/how-to-play');
  await expect(page.getByText('Circles and squares')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Guided tutorial' })).toBeVisible();
  await page.getByRole('link', { name: 'Try the first puzzle' }).click();
  await expect(page).toHaveURL(/#\/play\/steps$/);
});
