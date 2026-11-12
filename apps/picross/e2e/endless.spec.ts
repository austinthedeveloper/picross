import { expect, test } from '@playwright/test';
import { seed, skipScene } from './helpers';

/** Endless on either board (#158): open once First Job is won. */
test.beforeEach(async ({ context }) => {
  await seed(context, {
    run: { jobs: { 'first-job': { plays: 1, wins: 1 } }, seenScenes: [] },
  });
});

const saved = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('picross:run')!).current);

test('Endless picks a board: on Cubed its first fight is on a block', async ({ page }) => {
  await page.goto('/#/endless');
  await skipScene(page);
  const boards = page.getByRole('group', { name: 'Board' });
  await expect(boards.locator('.endless-board')).toHaveCount(3);
  await expect(boards.locator('.endless-board.cubed')).toContainText('Not played yet');
  await boards.locator('.endless-board.cubed').getByRole('button', { name: 'Start' }).click();
  const run = await saved(page);
  expect(run.runId).toBe('endless-cubed');
  expect(run.endless.board).toBe('cubed');
  await expect(page.locator('h1')).toHaveText('Endless · Cubed');
  await page.locator('.node.current .node-body').click();
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-board', 'block');
  await expect(page.locator('.battle-name').first()).not.toBeEmpty();
});

test('Mixed starts flat, and a reload keeps its board', async ({ page }) => {
  await page.goto('/#/endless');
  await skipScene(page);
  await page
    .getByRole('group', { name: 'Board' })
    .locator('.endless-board.mixed')
    .getByRole('button', { name: 'Start' })
    .click();
  await page.locator('.node.current .node-body').click();
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).endless.board).toBe('mixed');
  await expect(page.locator('.board')).toBeVisible();
});
