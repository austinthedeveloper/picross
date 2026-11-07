import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { announcements, boardState, cell, seed, solution, solve, press } from './helpers';

/** Saves puzzles as solved before the app loads, once per test. */
async function seedSolved(page: Page, ids: string[]) {
  await page.context().addInitScript((list) => {
    if (sessionStorage.getItem('solved')) return;
    sessionStorage.setItem('solved', '1');
    const solved = Object.fromEntries(list.map((id) => [id, { solves: 1, bestTime: 1000 }]));
    localStorage.setItem('picross:v1', JSON.stringify({ solved, boards: {}, totalTime: 0 }));
  }, ids);
}

const packIds = () => fs.readdirSync('src/puzzles/pack').map((file) => file.replace(/\.json$/, ''));

test.describe('free play', () => {
  test('a fresh visit: sound off, small puzzles first, fish is 10×10', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('.mute')).toHaveText(/Sound off/);
    await expect(page.locator('.size-section:not(.murals) .size-heading').first()).toHaveText(
      /5×5/,
    );
    await expect(page.locator('.size-section:not(.murals) .size-heading').last()).toHaveText(
      /20×20/,
    );
    await page.goto('/#/play/fish');
    await expect(page.locator('.cell')).toHaveCount(100);
  });

  test('solving shows only the result, and the list marks it solved', async ({ page }) => {
    await page.goto('/#/play/heart');
    await solve(page, solution('heart'));
    await expect(page.locator('.board-wrap')).toBeHidden();
    await expect(page.locator('.end-panel:not([hidden]) h2')).toHaveText('Solved!');
    await press(page, 'All puzzles');
    await expect(page.locator('.card.solved')).toHaveCount(1);
  });

  test('the filter shows completed or not completed, and is remembered', async ({ page }) => {
    await page.goto('/#/play/heart');
    await solve(page, solution('heart'));
    await expect(page.locator('.end-panel:not([hidden]) h2')).toHaveText('Solved!');
    await press(page, 'All puzzles');
    const cards = page.locator('.size-section:not(.murals) .card');
    await expect(cards.first()).toBeVisible(); // count() doesn't wait for the list
    const total = await cards.count();
    await page.getByRole('button', { name: 'Completed', exact: true }).tap();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Heart');
    await expect(page.locator('.mural-card')).toHaveCount(0);
    await page.reload();
    await expect(cards).toHaveCount(1);
    await page.getByRole('button', { name: 'Not completed' }).tap();
    await expect(cards).toHaveCount(total - 1);
    await expect(page.locator('.mural-card').first()).toBeVisible();
    await expect(page.locator('.size-section:not(.murals) .size-heading').first()).toContainText(
      '1/14',
    );
  });

  test('the list can run largest first, and remembers it', async ({ page }) => {
    await page.goto('/#/');
    const headings = page.locator('.size-section:not(.murals) .size-heading');
    const firstCard = page.locator('.size-section:not(.murals) .card-name').first();
    await expect(page.getByRole('button', { name: 'Smallest first' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(firstCard).toHaveText('No. 1');
    const lastNumber = await page
      .locator('.size-section:not(.murals) .card-name')
      .last()
      .textContent();

    await page.getByRole('button', { name: 'Largest first' }).tap();
    await expect(headings.first()).toContainText('20×20');
    await expect(headings.last()).toContainText('5×5');
    await expect(firstCard).toHaveText(lastNumber!);

    await page.reload();
    await expect(headings.first()).toContainText('20×20');
  });

  test('sections collapse independently, and stay that way', async ({ page }) => {
    await page.goto('/#/');
    const section = (name: string) => page.getByRole('region', { name });
    const small = section('5×5 puzzles');
    const medium = section('10×10 puzzles');
    await small.locator('summary').tap();
    await section('Murals').locator('summary').tap();
    await expect(small.locator('.card').first()).toBeHidden();
    await expect(section('Murals').locator('.card').first()).toBeHidden();
    await expect(medium.locator('.card').first()).toBeVisible();

    // Other list controls redraw the page, and shouldn't reopen anything.
    await page.getByRole('button', { name: 'Not completed' }).tap();
    await expect(small.locator('.card').first()).toBeHidden();
    await page.reload();
    await expect(small.locator('.card').first()).toBeHidden();
    await expect(small).toContainText('0/14'); // the heading still counts them

    await small.locator('summary').tap();
    await expect(small.locator('.card').first()).toBeVisible();
    await expect(section('Murals').locator('.card').first()).toBeHidden();
  });

  test('the tools share a row with zoom, right under the board', async ({ page }) => {
    await page.goto('/#/play/fish');
    const board = (await page.locator('.board-wrap').boundingBox())!;
    const fill = (await page.getByRole('button', { name: '■ Fill' }).boundingBox())!;
    const zoom = (await page.getByRole('group', { name: 'Zoom' }).boundingBox())!;
    expect(fill.y).toBeGreaterThanOrEqual(board.y + board.height);
    expect(fill.y - (board.y + board.height)).toBeLessThan(24);
    expect(fill.y + fill.height).toBeGreaterThan(zoom.y);
    expect(zoom.y + zoom.height).toBeGreaterThan(fill.y);
  });

  test('the completed filter says so when nothing is', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Completed', exact: true }).tap();
    await expect(page.locator('.empty-list')).toContainText('Nothing completed yet');
  });

  test('"Next" walks from the smallest puzzles up', async ({ page }) => {
    await page.goto('/#/play/smile');
    await solve(page, solution('smile'));
    await press(page, 'Next →');
    await expect(page).toHaveURL(/#\/play\/key$/);
  });

  test('cards show a difficulty, which can filter and sort the list', async ({ page }) => {
    await page.goto('/#/');
    const cards = page.locator('.size-section:not(.murals) .card');
    await expect(page.locator('.difficulty').first()).toHaveText(/Easy|Medium/);
    await expect(page.locator('.murals')).toBeVisible();

    await page.getByLabel('Difficulty').selectOption('insane');
    await expect(cards).toHaveCount(6);
    await expect(page.locator('.difficulty')).toHaveText(Array(6).fill('Insane'));
    await expect(page.locator('.murals')).toHaveCount(0);
    // Rating a puzzle mustn't give it away.
    await expect(cards.first().locator('.card-name')).toHaveText(/^No\. \d+$/);

    await page.reload();
    await expect(page.getByLabel('Difficulty')).toHaveValue('insane');
    await expect(cards).toHaveCount(6);

    await page.getByRole('button', { name: 'Completed', exact: true }).tap();
    await expect(page.locator('.empty-list')).toHaveText('No puzzles match those filters.');
    await page.getByRole('button', { name: 'All', exact: true }).tap();
    await page.getByLabel('Difficulty').selectOption('any');

    await page.getByRole('button', { name: 'Hardest first' }).tap();
    await expect(page.locator('.size-section:not(.murals) .size-heading').first()).toHaveText(
      /20×20/,
    );
    await expect(page.locator('.difficulty').first()).toHaveText('Insane');
    await page.getByRole('button', { name: 'Easiest first' }).tap();
    await expect(page.locator('.size-section:not(.murals) .size-heading').first()).toHaveText(
      /5×5/,
    );
    await expect(page.locator('.difficulty').first()).toHaveText('Easy');
  });

  test('"Next" skips puzzles you have already solved', async ({ page }) => {
    await seedSolved(page, ['key', 'arrow']);
    await page.goto('/#/play/smile');
    await solve(page, solution('smile'));
    // The pack runs smile, key, then the 10×10s: key is done, so it steps over it.
    await press(page, 'Next →');
    await expect(page).not.toHaveURL(/#\/play\/(key|smile)$/);
  });

  test('"Next" is gone with nothing left to play', async ({ page }) => {
    await seedSolved(
      page,
      packIds().filter((id) => id !== 'heart'),
    );
    await page.goto('/#/play/heart');
    await solve(page, solution('heart'));
    await expect(page.locator('.end-panel:not([hidden])')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Next →' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'All puzzles' })).toBeVisible();
  });

  test('"Surprise me" opens an unsolved puzzle', async ({ page }) => {
    const ids = packIds();
    const [left] = ids.slice(-1);
    await seedSolved(page, ids.slice(0, -1));
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Surprise me' }).tap();
    await expect(page).toHaveURL(new RegExp(`#/play/${left}$`));
    await expect(page.locator('.cell').first()).toBeVisible();
  });

  test('"Surprise me" is hidden when everything is solved', async ({ page }) => {
    await seedSolved(page, packIds());
    await page.goto('/#/');
    await expect(page.locator('.rank-card')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Surprise me' })).toHaveCount(0);
  });

  test('a drag paints a line and undo/redo/reset work', async ({ page }) => {
    await page.goto('/#/play/heart');
    const from = (await cell(page, 5).boundingBox())!;
    const to = (await cell(page, 9).boundingBox())!;
    await page.mouse.move(from.x + 5, from.y + 5);
    await page.mouse.down();
    await page.mouse.move(to.x + 5, to.y + 5, { steps: 5 });
    await page.mouse.up();
    expect((await boardState(page)).slice(5, 10).join('')).toBe('#####');
    await press(page, 'Undo');
    expect((await boardState(page)).slice(5, 10).join('')).toBe('.....');
    await press(page, 'Redo');
    await press(page, 'Reset');
    expect((await boardState(page)).join('')).not.toContain('#');
  });

  test('Hearts mode: three wrong fills, then Retry', async ({ page, context }) => {
    await seed(context, { settings: { mode: 'hearts', muted: true, highContrast: false } });
    await page.goto('/#/play/heart');
    for (const i of [0, 2, 4]) await cell(page, i).tap();
    await expect(page.getByRole('heading', { name: 'Out of hearts' })).toBeVisible();
    await expect(page.locator('.board-wrap')).toBeHidden();
    await press(page, 'Retry');
    await expect(page.locator('.hearts')).toHaveText('♥♥♥');
    await expect(page.locator('.board-wrap')).toBeVisible();
  });

  test('a hint reveals the highlighted row', async ({ page }) => {
    await page.goto('/#/play/house');
    await cell(page, 34).tap();
    await page.locator('.hint-menu summary').tap();
    await press(page, 'Reveal row');
    const row = (await boardState(page)).slice(30, 40).join('');
    expect(row).toBe('x########x');
    await expect(page.locator('.hint-menu summary')).toHaveText('Hint 2/3');
  });
});

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1000, height: 800 }, isMobile: false, hasTouch: false });

  test('solves a puzzle with arrows and Space, and announces it', async ({ page }) => {
    await page.goto('/#/play/arrow');
    await page.locator('.board').focus();
    const rows = solution('arrow');
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (rows[r][c] === '#') await page.keyboard.press('Space');
        if (c < 4) await page.keyboard.press('ArrowRight');
      }
      if (r < 4) {
        await page.keyboard.press('ArrowDown');
        for (let c = 0; c < 4; c++) await page.keyboard.press('ArrowLeft');
      }
    }
    await expect(page.locator('.end-panel:not([hidden]) h2')).toHaveText('Solved!');
    await expect.poll(() => announcements(page)).toContain('Solved!');
  });
});
