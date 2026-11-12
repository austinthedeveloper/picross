import { expect, test, type Page } from '@playwright/test';
import { encodeShare as encodeBlock } from '@picross/block/puzzles/share';
import { encodeShare as encodeGrid } from '../src/puzzles/share';
import { toPuzzleFile } from '@picross/grid/puzzles/format';
import { solve } from './helpers';

/** The one editor (#159): new puzzles and drafts on either board, and share links. */

// A 5×5 bar across the top: unique, and quick to draw and solve.
const BAR = ['#####', '.....', '.....', '.....', '.....'];

async function drawBar(page: Page) {
  await page.goto('/#/editor');
  const flat = page.locator('.editor-new.flat');
  await flat.getByLabel('Width').fill('5');
  await flat.getByLabel('Height').fill('5');
  await flat.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/#\/editor\/flat$/);
  await page.getByLabel('Name').fill('Bar');
  const cells = page.locator('.cell');
  await expect(cells).toHaveCount(25);
  for (let c = 0; c < 5; c++) await cells.nth(c).click();
  await expect(page.locator('.editor-status')).toContainText('Unique');
}

test('a new Flat puzzle: draw, check, share, and the link plays it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await drawBar(page);
  await page.getByRole('button', { name: 'Copy share link' }).click();
  await expect(page.locator('.editor-message')).toHaveText('Share link copied.');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  // The link says its board.
  expect(link).toMatch(/#\/p\/flat\/[zj][\w-]+$/);
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'A shared puzzle' })).toBeVisible();
  await solve(page, BAR);
  await expect(page.locator('.end-panel:not([hidden]) h2')).toHaveText('Solved!');
  await expect(page.locator('.end-name')).toHaveText('Bar');
});

test('a Flat play-test goes back to the draft', async ({ page }) => {
  await drawBar(page);
  await page.getByRole('button', { name: 'Play-test' }).click();
  await expect(page).toHaveURL(/#\/p\/flat\/[zj][\w-]+\/test$/);
  await expect(page.getByRole('heading', { name: 'Testing: Bar' })).toBeVisible();
  await solve(page, BAR);
  await page.getByRole('link', { name: '← Back to the editor' }).click();
  await expect(page).toHaveURL(/#\/editor\/flat$/);
  await expect(page.locator('.cell.filled')).toHaveCount(5);
});

test('sharing waits for a picture that solves without guessing', async ({ page }) => {
  await page.goto('/#/editor/flat');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('button', { name: 'Copy share link' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Play-test' })).toBeDisabled();
});

test('a new Cubed puzzle opens its editor at that size', async ({ page }) => {
  await page.goto('/#/editor');
  const cubed = page.locator('.editor-new.cubed');
  await cubed.getByLabel('Width').fill('3');
  await cubed.getByLabel('Height').fill('2');
  await cubed.getByLabel('Depth').fill('4');
  await cubed.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/#\/cubed\/editor$/);
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('3');
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Depth', { exact: true })).toHaveValue('4');
});

test("both old editors' drafts are in one list, marked by board", async ({ page, context }) => {
  await context.addInitScript(() => {
    if (sessionStorage.getItem('drafts')) return;
    sessionStorage.setItem('drafts', '1');
    const cells = new Array(100).fill(false);
    cells[0] = cells[1] = true;
    localStorage.setItem(
      'picross:editor',
      JSON.stringify({ name: 'Kite', id: 'kite', width: 10, height: 10, cells }),
    );
    localStorage.setItem(
      'picross3d:editor',
      JSON.stringify({
        id: 'cup',
        name: 'Cup',
        dims: { x: 2, y: 2, z: 2 },
        cells: 'aa000000',
        ratio: 0.5,
      }),
    );
  });
  await page.goto('/#/editor');
  const drafts = page.getByRole('region', { name: 'Drafts' }).locator('.draft-card');
  await expect(drafts).toHaveCount(2);
  await expect(drafts.first()).toContainText('Flat');
  await expect(drafts.first()).toContainText('Kite');
  await expect(drafts.first()).toContainText('10×10 · 2 squares drawn');
  await expect(drafts.last()).toContainText('Cubed');
  await expect(drafts.last()).toContainText('Cup');
  await expect(drafts.last()).toContainText('2×2×2 · 2 cubes drawn');
  await drafts.last().click();
  await expect(page).toHaveURL(/#\/cubed\/editor$/);
  await expect(page.getByLabel('Name')).toHaveValue('Cup');

  // Starting a new one on a board with a draft asks first.
  await page.goto('/#/editor');
  page.once('dialog', (d) => d.dismiss());
  await page.locator('.editor-new.flat').getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/#\/editor$/);
  await expect(drafts.first()).toContainText('Kite');
});

test("share links from each board open, Cubed's old ones too", async ({ page }) => {
  const flat = await encodeGrid(
    toPuzzleFile(
      'bar',
      'Bar',
      5,
      5,
      BAR.join('')
        .split('')
        .map((c) => c === '#'),
    ),
  );
  await page.goto(`/#/p/flat/${flat}`);
  await expect(page.getByRole('heading', { name: 'A shared puzzle' })).toBeVisible();
  await expect(page.locator('.cell')).toHaveCount(25);

  const block = await encodeBlock({
    id: 'plus',
    name: 'Plus',
    colors: { a: 'coral' },
    layers: [['.a.', 'aaa', '.a.']],
  });
  for (const link of [`/#/p/cubed/${block}`, `/#/cubed/p/${block}`]) {
    await page.goto(link);
    await expect(page.getByRole('heading', { name: 'A shared puzzle' })).toBeVisible();
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
  }
  await page.goto('/#/p/flat/jnotapuzzle');
  await expect(page.getByRole('heading', { name: 'Can’t open that puzzle' })).toBeVisible();
});
