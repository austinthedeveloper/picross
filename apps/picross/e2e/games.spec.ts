import { expect, test } from '@playwright/test';

// One site, two games: Flat (2D) at the root and Cubed (3D) under /3d/, with a switch on
// each home screen that remembers the last one picked.
test('the Flat | Cubed switch moves between the games and remembers', async ({ page }) => {
  await page.goto('/');
  const flat = page.getByRole('navigation', { name: 'Game' });
  await expect(flat.getByRole('link', { name: /Flat/ })).toHaveAttribute('aria-current', 'page');

  await flat.getByRole('link', { name: /Cubed/ }).click();
  await expect(page).toHaveURL(/\/3d\//);
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();
  const cubed = page.getByRole('navigation', { name: 'Game' });
  await expect(cubed.getByRole('link', { name: /Cubed/ })).toHaveAttribute('aria-current', 'page');

  // Opening the site again lands on Cubed, the last one played.
  await page.goto('/');
  await expect(page).toHaveURL(/\/3d\//);
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();

  // A link into the 2D game still opens it, and switching back remembers Flat.
  await page.getByRole('navigation', { name: 'Game' }).getByRole('link', { name: /Flat/ }).click();
  await expect(page.getByRole('heading', { name: 'Picross', exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/3d\//);
});

test('a 3D puzzle plays on the combined site', async ({ page }) => {
  await page.goto('/3d/#/play/steps');
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
});
