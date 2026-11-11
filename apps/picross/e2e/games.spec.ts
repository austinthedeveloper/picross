import { expect, test } from '@playwright/test';

// One app, two games: Flat (2D) at #/ and Cubed (3D) under #/cubed, with a switch on each
// home screen that remembers the last one picked.
test('the Flat | Cubed switch moves between the games and remembers', async ({ page }) => {
  await page.goto('/');
  const flat = page.getByRole('navigation', { name: 'Game' });
  await expect(flat.getByRole('link', { name: /Flat/ })).toHaveAttribute('aria-current', 'page');

  await flat.getByRole('link', { name: /Cubed/ }).click();
  await expect(page).toHaveURL(/#\/cubed$/);
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();
  const cubed = page.getByRole('navigation', { name: 'Game' });
  await expect(cubed.getByRole('link', { name: /Cubed/ })).toHaveAttribute('aria-current', 'page');

  // Opening the app again lands on Cubed, the last one played.
  await page.goto('/?again');
  await expect(page).toHaveURL(/#\/cubed$/);
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();

  // A link into the 2D game still opens it, and switching back remembers Flat.
  await page.getByRole('navigation', { name: 'Game' }).getByRole('link', { name: /Flat/ }).click();
  await expect(page.getByRole('heading', { name: 'Picross', exact: true })).toBeVisible();
  await page.goto('/?once-more');
  await expect(page).not.toHaveURL(/#\/cubed/);
  await expect(page.getByRole('heading', { name: 'Picross', exact: true })).toBeVisible();
});

test('a 3D puzzle plays in the app', async ({ page }) => {
  await page.goto('/#/cubed/play/steps');
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
});
