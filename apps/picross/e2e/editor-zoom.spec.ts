import { expect, test } from '@playwright/test';
import { cell, press } from './helpers';

test('editor: flags an ambiguous drawing and exports a unique one', async ({ page }) => {
  await page.goto('/#/editor/flat');
  await page.fill('label:has-text("Width") input', '5');
  await page.press('label:has-text("Width") input', 'Tab');
  await page.fill('label:has-text("Height") input', '5');
  await page.press('label:has-text("Height") input', 'Tab');
  await cell(page, 0).tap();
  await cell(page, 6).tap();
  await expect(page.locator('.editor-status')).toContainText('Needs guessing');
  await press(page, 'Clear');
  for (const i of [2, 7, 10, 11, 12, 13, 14, 17, 22]) await cell(page, i).tap();
  await expect(page.locator('.editor-status')).toContainText('Unique');
  expect(JSON.parse(await page.inputValue('.editor-json')).solution).toEqual([
    '..#..',
    '..#..',
    '#####',
    '..#..',
    '..#..',
  ]);
});

test('pinch zooms a 15×15 board without painting', async ({ page, context }) => {
  await page.goto('/#/play/sailboat');
  const fit = (await cell(page, 0).boundingBox())!.width;
  const cdp = await context.newCDPSession(page);
  const box = (await page.locator('.board').boundingBox())!;
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  const touch = (type: string, pts: [number, number][]) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: pts.map(([x, y], id) => ({ x, y, id })),
    });
  await touch('touchStart', [[cx - 20, cy]]);
  await touch('touchStart', [
    [cx - 20, cy],
    [cx + 20, cy],
  ]);
  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', [
      [cx - 20 - i * 10, cy],
      [cx + 20 + i * 10, cy],
    ]);
  }
  await touch('touchEnd', []);
  await expect(page.locator('.zoom-level')).toHaveText('300%');
  expect((await cell(page, 0).boundingBox())!.width).toBeGreaterThan(fit * 2);
  await expect(page.locator('.cell.filled, .cell.marked')).toHaveCount(0);
});

test('zoom buttons keep the board on screen, and Move drags it without painting', async ({
  page,
}) => {
  await page.goto('/#/play/sailboat');
  const move = page.getByRole('button', { name: 'Move', exact: true });
  await expect(move).toBeHidden();
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  await expect(page.locator('.zoom-level')).toHaveText('200%');

  // The zoomed board fits the screen, with the tools still below it.
  const wrap = page.locator('.board-wrap');
  const box = (await wrap.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);

  await move.tap();
  await expect(move).toHaveAttribute('aria-pressed', 'true');
  const before = await wrap.evaluate((w) => [w.scrollLeft, w.scrollTop]);
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 60, { steps: 5 });
  await page.mouse.up();
  const after = await wrap.evaluate((w) => [w.scrollLeft, w.scrollTop]);
  expect(after[0]).toBeLessThan(before[0]);
  expect(after[1]).toBeLessThan(before[1]);
  await expect(page.locator('.cell.filled, .cell.marked')).toHaveCount(0);

  // Back to fit: Move goes away and Fill is the tool again.
  await page.locator('.zoom-level').tap();
  await expect(move).toBeHidden();
  await expect(page.getByRole('button', { name: '■ Fill' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
