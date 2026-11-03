import { expect, test } from '@playwright/test';
import { announcements, boardState, cell, seed, solution, solve, press } from './helpers';

test.describe('free play', () => {
  test('a fresh visit: sound off, big puzzles first, fish is 10×10', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('.mute')).toHaveText(/Sound off/);
    await expect(page.locator('.size-section:not(.murals) .size-heading').first()).toHaveText(
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
