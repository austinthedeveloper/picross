import { expect, test } from '@playwright/test';

// One app, two games: Flat (2D) and Cubed (3D, under #/cubed), with one home for both
// (#152, home.spec.ts). Opening the app always lands on it, whichever was played last.
test('the app opens on the one home, whichever game was played last', async ({ page }) => {
  await page.goto('/#/cubed/play/steps');
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  await page.goto('/?again');
  await expect(page).not.toHaveURL(/#\/cubed/);
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
});

test('a 3D puzzle plays in the app', async ({ page }) => {
  await page.goto('/#/cubed/play/steps');
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
});
