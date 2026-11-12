import { expect, test, type Page } from '@playwright/test';

const block = (page: Page) => page.locator('canvas.block-canvas');

/** Moves the keyboard cursor to cube `x + 3 * (z + 2y)` of the 3×2×2 tutorial block. */
async function cursorTo(page: Page, cell: number) {
  const at = Number(await block(page).getAttribute('data-cursor'));
  const pos = (i: number) => ({ x: i % 3, z: Math.floor(i / 3) % 2, y: Math.floor(i / 6) });
  const [a, b] = [pos(at), pos(cell)];
  const press = async (key: string, n: number) => {
    for (let k = 0; k < n; k++) await page.keyboard.press(key);
  };
  await press(b.x > a.x ? 'ArrowRight' : 'ArrowLeft', Math.abs(b.x - a.x));
  await press(b.z > a.z ? 'ArrowDown' : 'ArrowUp', Math.abs(b.z - a.z));
  await press(b.y > a.y ? 'PageUp' : 'PageDown', Math.abs(b.y - a.y));
  await expect(block(page)).toHaveAttribute('data-cursor', String(cell));
}

async function hit(page: Page, cell: number, key: 'x' | ' ') {
  await cursorTo(page, cell);
  await page.keyboard.press(key);
}

test('the list offers the tutorial until it is done', async ({ page }) => {
  await page.goto('/#/free/cubed');
  await expect(page.locator('.tutorial-card')).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.locator('.tutorial-card')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.tutorial-card')).toHaveCount(0);
});

test('the tutorial goes step by step to solved, and nudges wrong moves', async ({ page }) => {
  await page.goto('/#/cubed/tutorial');
  const coach = page.locator('.coach');
  await expect(coach).toContainText('Step 1 of 6');
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await expect(coach).toContainText('Step 2 of 6');

  await block(page).focus();
  await page.keyboard.press('ArrowLeft');
  // Breaking a cube of the shape is refused with a nudge.
  await hit(page, 4, 'x');
  await expect(coach).toContainText('part of the shape');
  for (const cell of [6, 7, 8]) await hit(page, cell, 'x');
  await expect(coach).toContainText('Step 3 of 6');

  for (const cell of [3, 4, 5]) await hit(page, cell, ' ');
  await expect(coach).toContainText('Step 4 of 6');
  // Back a step and forward again.
  await page.getByRole('button', { name: 'Back a step' }).click();
  await expect(coach).toContainText('Step 3 of 6');
  await block(page).focus();
  for (const cell of [3, 4, 5]) await hit(page, cell, ' ');
  await expect(coach).toContainText('Step 4 of 6');

  await hit(page, 1, 'x');
  await expect(coach).toContainText('Step 5 of 6');
  await page.getByRole('button', { name: 'Peel along Y' }).click();
  await page.getByLabel('Layers peeled').fill('1');
  await expect(coach).toContainText('Step 6 of 6');
  await page.getByLabel('Layers peeled').fill('0');
  await block(page).focus();
  await hit(page, 9, 'x');
  await hit(page, 11, 'x');
  await expect(page.getByRole('heading', { name: 'You’ve got it!' })).toBeVisible();

  // It records nothing, and the list stops offering it.
  await page.getByRole('link', { name: 'All puzzles' }).click();
  await expect(page.locator('.stats')).toContainText('0/');
  await expect(page.locator('.tutorial-card')).toHaveCount(0);
});
