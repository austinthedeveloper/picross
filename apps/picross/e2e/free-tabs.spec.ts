import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// Free play across both boards (#153): #/free/flat and #/free/cubed.

const PACK = path.join(import.meta.dirname, '../../../packages/grid/src/puzzles/pack');
const flatIds = () => fs.readdirSync(PACK).map((file) => file.replace(/\.json$/, ''));

/** Saves these 2D puzzles as solved before the app loads, once per test. */
async function seedSolved(page: Page, ids: string[]) {
  await page.context().addInitScript((list) => {
    if (sessionStorage.getItem('solved')) return;
    sessionStorage.setItem('solved', '1');
    const solved = Object.fromEntries(
      list.map((id) => [`grid:${id}`, { solves: 1, bestTime: 1000 }]),
    );
    localStorage.setItem('picross:v2', JSON.stringify({ solved, boards: {}, time: {} }));
  }, ids);
}

const tab = (page: Page, name: 'Flat' | 'Cubed') =>
  page.getByRole('navigation', { name: 'Board' }).getByRole('link', { name: new RegExp(name) });
/** Taps a tab and waits for it to draw. */
async function openTab(page: Page, name: 'Flat' | 'Cubed') {
  await tab(page, name).tap();
  await expect(tab(page, name)).toHaveAttribute('aria-current', 'page');
}
const board = (page: Page) => page.evaluate(() => document.documentElement.dataset.board ?? null);
const flatCards = (page: Page) => page.locator('.free-list .size-section:not(.murals) .card');
const cubedCards = (page: Page) =>
  page.locator('.free-list .list-section:not(.dioramas) .puzzle-card');

test.describe('free play', () => {
  test('both tabs open, each with its own board, and the last one used comes back', async ({
    page,
  }) => {
    await page.goto('/#/free');
    await expect(page).toHaveURL(/#\/free\/flat$/);
    await expect(tab(page, 'Flat')).toHaveAttribute('aria-current', 'page');
    await expect(flatCards(page).first()).toBeVisible();
    await expect(page.locator('.murals')).toBeVisible();
    expect(await board(page)).toBeNull();

    await tab(page, 'Cubed').tap();
    await expect(page).toHaveURL(/#\/free\/cubed$/);
    await expect(tab(page, 'Cubed')).toHaveAttribute('aria-current', 'page');
    await expect(cubedCards(page).first()).toBeVisible();
    await expect(page.locator('.free-list .dioramas')).toBeVisible();
    // Cubed's list keeps Cubed's styles, and the tabs look the same over both.
    expect(await board(page)).toBe('block');
    const tabs = page.locator('.free-tabs');
    const look = () => tabs.evaluate((e) => getComputedStyle(e).backgroundColor);
    const cubedLook = await look();

    await page.goto('/#/free');
    await expect(page).toHaveURL(/#\/free\/cubed$/);
    await expect(cubedCards(page).first()).toBeVisible();

    await tab(page, 'Flat').tap();
    await expect(flatCards(page).first()).toBeVisible();
    expect(await board(page)).toBeNull();
    expect(await look()).toBe(cubedLook);
    await page.reload();
    await page.goto('/#/free');
    await expect(page).toHaveURL(/#\/free\/flat$/);
  });

  test('the filters are shared between the tabs, and remembered', async ({ page }) => {
    await page.goto('/#/free/flat');
    await page.getByRole('button', { name: 'Unsolved', exact: true }).tap();
    await page.getByLabel('Size').selectOption('small');
    await expect(page.locator('.free-list .size-heading')).toHaveCount(1);
    await expect(page.locator('.free-list .size-heading')).toContainText('5×5');
    await expect(page.locator('.murals')).toHaveCount(0);
    await expect(flatCards(page)).toHaveCount(14);

    await openTab(page, 'Cubed');
    await expect(page.getByRole('button', { name: 'Unsolved', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByLabel('Size')).toHaveValue('small');
    await expect(page.locator('.free-list h2')).toHaveText(['Small 0/3']);
    await expect(cubedCards(page)).toHaveCount(3);

    // Flat's hardest band is past Cubed's: the Cubed tab shows its hardest for it.
    await openTab(page, 'Flat');
    await page.getByLabel('Size').selectOption('any');
    await page.getByLabel('Difficulty').selectOption('insane');
    await expect(flatCards(page).first()).toContainText('Insane');
    await openTab(page, 'Cubed');
    await expect(page.getByLabel('Difficulty')).toHaveValue('expert');
    await expect(cubedCards(page).first()).toContainText('Expert');

    await page.reload();
    await expect(page.getByLabel('Difficulty')).toHaveValue('expert');
    await expect(page.getByRole('button', { name: 'Unsolved', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('a puzzle opened from each tab plays', async ({ page }) => {
    await page.goto('/#/free/flat');
    await flatCards(page).first().tap();
    await expect(page).toHaveURL(/#\/play\/[\w-]+$/);
    await expect(page.locator('.cell').first()).toBeVisible();

    await page.goto('/#/free/cubed');
    await cubedCards(page).first().tap();
    await expect(page).toHaveURL(/#\/cubed\/play\/[\w-]+$/);
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
  });

  test('Next unsolved and Surprise me pick from the tab', async ({ page }) => {
    await page.goto('/#/free/flat');
    const first = await flatCards(page).first().getAttribute('href');
    await page.getByRole('button', { name: 'Next unsolved' }).tap();
    await expect(page).toHaveURL(new RegExp(`${first}$`));

    await page.goto('/#/free/flat');
    await page.getByRole('button', { name: 'Surprise me' }).tap();
    await expect(page).toHaveURL(/#\/play\/[\w-]+$/);

    await page.goto('/#/free/cubed');
    const firstBlock = await cubedCards(page).first().getAttribute('href');
    await page.getByRole('button', { name: 'Next unsolved' }).tap();
    await expect(page).toHaveURL(new RegExp(`${firstBlock}$`));

    await page.goto('/#/free/cubed');
    await page.getByRole('button', { name: 'Surprise me' }).tap();
    await expect(page).toHaveURL(/#\/cubed\/play\/[\w-]+$/);
  });

  test('with Flat all solved, Both boards picks from Cubed', async ({ page }) => {
    await seedSolved(page, flatIds());
    await page.goto('/#/free/flat');
    const next = page.getByRole('button', { name: 'Next unsolved' });
    const surprise = page.getByRole('button', { name: 'Surprise me' });
    await expect(next).toBeDisabled();
    await expect(surprise).toBeDisabled();

    const both = page.getByRole('button', { name: 'Both boards' });
    await both.tap();
    await expect(both).toHaveAttribute('aria-pressed', 'true');
    await next.tap();
    await expect(page).toHaveURL(/#\/cubed\/play\/[\w-]+$/);

    await page.goto('/#/free/flat');
    await expect(page.getByRole('button', { name: 'Both boards' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Surprise me' }).tap();
    await expect(page).toHaveURL(/#\/cubed\/play\/[\w-]+$/);
  });

  test('both home lists link to their tab', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('link', { name: /Free play/ }).tap();
    await expect(page).toHaveURL(/#\/free\/flat$/);
    await page.goto('/#/cubed');
    await page.getByRole('link', { name: 'Free play' }).tap();
    await expect(page).toHaveURL(/#\/free\/cubed$/);
  });
});
