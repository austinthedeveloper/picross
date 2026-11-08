import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('installable, and it opens offline after a first visit', async ({ page, context }) => {
  await page.goto('/');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel=manifest]')!;
    return (await fetch(link.href)).json();
  });
  expect(manifest).toMatchObject({ name: 'Picross Cubed', display: 'standalone' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');
  // Wait for the service worker to take over, then visit the screens that load more code.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.goto('/#/play/steps');
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  await page.goto('/');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();
  await page.locator('.puzzle-card').first().click();
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  await context.setOffline(false);
});
