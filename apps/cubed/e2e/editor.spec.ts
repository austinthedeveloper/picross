import { expect, test } from '@playwright/test';
import { parsePuzzle } from '../src/puzzles/format';
import { breakCubes, extras, focusBlock } from './helpers';

// A plus sign on one 3×3 layer.
const PLUS = parsePuzzle({
  id: 'plus',
  name: 'Plus',
  colors: { a: 'coral' },
  layers: [['.a.', 'aaa', '.a.']],
});

async function drawPlus(page: import('@playwright/test').Page) {
  await page.goto('/#/editor');
  await page.getByLabel('Name').fill('Plus');
  for (const [label, value] of [
    ['Width', '3'],
    ['Height', '1'],
    ['Depth', '3'],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel(label, { exact: true }).press('Tab');
  }
  const cells = page.locator('.ecell');
  await expect(cells).toHaveCount(9);
  for (const i of [1, 3, 4, 5, 7]) await cells.nth(i).click();
  await expect(page.locator('.verdict')).toContainText('Solvable');
}

test('drawing a shape checks it, and play-testing it solves', async ({ page }) => {
  await drawPlus(page);
  await page.getByRole('button', { name: 'Play-test' }).click();
  await expect(page.getByRole('heading', { name: 'Testing: Plus' })).toBeVisible();
  await focusBlock(page);
  await breakCubes(page, PLUS, extras(PLUS));
  await expect(page.getByRole('heading', { name: 'Solved!' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to the editor' }).click();
  // The draft is still there.
  await expect(page.locator('.ecell.on')).toHaveCount(5);
});

test('an ambiguous shape is flagged with the cubes it cannot work out', async ({ page }) => {
  await page.goto('/#/editor');
  for (const [label, value] of [
    ['Width', '2'],
    ['Height', '2'],
    ['Depth', '2'],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel(label, { exact: true }).press('Tab');
  }
  await page.getByRole('button', { name: 'Clear layer' }).click();
  await page.getByRole('button', { name: 'Layer up' }).click();
  await page.getByRole('button', { name: 'Clear layer' }).click();
  // Layer 2: the other diagonal from layer 1.
  const cells = page.locator('.ecell');
  await cells.nth(1).click();
  await cells.nth(2).click();
  await page.getByRole('button', { name: 'Layer down' }).click();
  await cells.nth(0).click();
  await cells.nth(3).click();
  await expect(page.locator('.verdict')).toContainText('can’t work out 8 cubes');
  await expect(page.locator('.ecell.unknown')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Play-test' })).toBeDisabled();
});

test('export, import and share links', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await drawPlus(page);
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const json = await page.getByLabel('Puzzle JSON').inputValue();
  expect(JSON.parse(json)).toMatchObject({ name: 'Plus', layers: [['.a.', 'aaa', '.a.']] });

  await page.getByRole('button', { name: 'Copy share link' }).click();
  await expect(page.locator('.verdict')).toHaveText('Share link copied.');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/#\/p\/[zj][\w-]+$/);
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'A shared puzzle' })).toBeVisible();

  // Import puts a pasted puzzle into the editor.
  await page.goto('/#/editor');
  await page.getByRole('button', { name: 'Import JSON' }).click();
  await page
    .getByLabel('Puzzle JSON')
    .fill(JSON.stringify({ id: 'dot', name: 'Dot', colors: { a: 'sky' }, layers: [['a']] }));
  await page.getByRole('button', { name: 'Load it' }).click();
  await expect(page.getByLabel('Name')).toHaveValue('Dot');
  await expect(page.locator('.ecell')).toHaveCount(1);
});

test('a broken share link says so', async ({ page }) => {
  await page.goto('/#/p/jnotapuzzle');
  await expect(page.getByRole('heading', { name: 'Can’t open that puzzle' })).toBeVisible();
});

test('the layer grid works from the keyboard', async ({ page }) => {
  await page.goto('/#/editor');
  const cells = page.locator('.ecell');
  await cells.first().focus();
  await page.keyboard.press('Space');
  await expect(cells.first()).toHaveClass(/on/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(cells.nth(1)).toHaveClass(/on/);
  await expect(cells.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cells.nth(1)).not.toHaveClass(/on/);
});
