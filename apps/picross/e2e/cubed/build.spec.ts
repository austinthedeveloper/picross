import { expect, test } from '@playwright/test';

// The build (a prototype): a solved block comes apart into bricks and is built back up.
// These open it straight from its debug link, skipping the 2D and 3D puzzles.

test('#/cubed/build/dog opens the build on the bottom layer, with every layer', async ({
  page,
}) => {
  await page.goto('/#/cubed/build/dog');
  const screen = page.locator('.build');
  await expect(screen).toHaveAttribute('data-phase', 'build');
  await expect(screen).toHaveAttribute('data-layers', '8');
  await expect(screen).toHaveAttribute('data-layer', '1');
  await expect(page.locator('.build-counter')).toHaveText('Layer 1 of 8');
  // The bottom layer is four cream paws, one kind in the tray.
  await expect(page.getByRole('button', { name: '1x2 cream brick, 4 left' })).toBeVisible();
});

test('?layer=N starts partway, with the layers under it built', async ({ page }) => {
  await page.goto('/#/cubed/build/dog?layer=8');
  const screen = page.locator('.build');
  await expect(screen).toHaveAttribute('data-phase', 'build');
  await expect(screen).toHaveAttribute('data-layer', '8');
  await expect(page.locator('.build-counter')).toHaveText('Layer 8 of 8');
  await expect(page.getByRole('button', { name: '1x2 brown brick, 1 left' })).toBeVisible();
});

test('a drop nowhere near its ghost bounces back', async ({ page }) => {
  await page.goto('/#/cubed/build/dog');
  await expect(page.locator('.build')).toHaveAttribute('data-phase', 'build');
  await page.getByRole('button', { name: '1x2 cream brick, 4 left' }).click();
  // The stage's top corner is open air, far from the plate.
  await page.locator('canvas.build-canvas').click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole('button', { name: '1x2 cream brick, 4 left' })).toBeVisible();
});

test("an unknown puzzle goes to Cubed's list", async ({ page }) => {
  await page.goto('/#/cubed/build/no-such-puzzle');
  await expect(page).toHaveURL(/#\/free\/cubed$/);
});

test('the trio starts from the home screen on the 2D board', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('link', { name: /Draw, carve, build/ }).click();
  await expect(page).toHaveURL(/#\/trio\/dog$/);
  await expect(page.getByRole('heading', { name: 'Draw the dog · 1 of 3' })).toBeVisible();
});
