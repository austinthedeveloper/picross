import { expect, test, type Page } from '@playwright/test';
import { runAt, seed } from './helpers';

/** Each way in from the menu (#152), and where it lands. */
const ENTRIES: { name: RegExp; hash: RegExp; heading: string | RegExp }[] = [
  { name: /^Story/, hash: /#\/run$/, heading: 'Jobs' },
  { name: /^Free play/, hash: /#\/free\/flat$/, heading: 'Free play' },
  { name: /^Endless/, hash: /#\/endless$/, heading: 'Jobs' },
  { name: /^Badges/, hash: /#\/badges$/, heading: 'Badges' },
  { name: /^Editor/, hash: /#\/editor$/, heading: 'Editor' },
  { name: /^How to play/, hash: /#\/how-to-play$/, heading: 'How to play' },
  { name: /^Settings/, hash: /#\/settings$/, heading: 'Settings' },
];

const menu = (page: Page) => page.getByRole('navigation', { name: 'Menu' });

for (const colorScheme of ['light', 'dark'] as const) {
  for (const [width, height] of [
    [390, 844],
    [1280, 800],
  ]) {
    test(`every menu entry opens its screen (${colorScheme}, ${width} wide)`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme });
      await page.goto('/#/');
      await expect(page.getByRole('heading', { level: 1, name: 'Picross' })).toBeVisible();
      // One home: no Flat | Cubed switch on it (the board is picked where it matters).
      await expect(page.locator('.game-switch')).toHaveCount(0);
      await expect(menu(page).getByRole('link')).toHaveCount(ENTRIES.length);
      // Nothing on the menu runs off a phone's screen.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);

      for (const entry of ENTRIES) {
        await page.goto('/#/');
        await menu(page).getByRole('link', { name: entry.name }).click();
        await expect(page).toHaveURL(entry.hash);
        await expect(page.getByRole('heading', { level: 1, name: entry.heading })).toBeVisible();
      }
      // The daily is its card, above the menu.
      await page.goto('/#/');
      await page.locator('.daily-card').click();
      await expect(page).toHaveURL(/#\/daily$/);
    });
  }
}

test('Endless opens the jobs board at its Endless section', async ({ page }) => {
  await page.goto('/#/endless');
  await expect(page.locator('.chapter.endless')).toBeInViewport();
});

test('a run in progress gets a Continue card, on either board', async ({ page, context }) => {
  await seed(context, { run: { current: runAt('first-job', 1) } });
  await page.goto('/#/');
  const cont = page.getByRole('region', { name: 'Continue' });
  await expect(cont.locator('.run-banner')).toHaveCount(1);
  await expect(cont).toContainText('Continue run');
  await cont.locator('.run-banner').click();
  await expect(page).toHaveURL(/#\/run$/);

  // Cubed's run saves beside it (#155): a card of its own, to Cubed's story.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('picross:run')!);
    save.block = {
      current: { runId: 'first-job', node: 0, hp: 12, maxHp: 12, gadgets: [], status: 'active' },
    };
    localStorage.setItem('picross:run', JSON.stringify(save));
  });
  await page.goto('/?again#/');
  await expect(cont.locator('.run-banner')).toHaveCount(2);
  await expect(cont).toContainText('Continue on blocks');
  await cont.getByRole('link', { name: /Continue on blocks/ }).click();
  await expect(page).toHaveURL(/#\/cubed\/story$/);
});

test('with no run in progress there is no Continue card', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByRole('region', { name: 'Continue' })).toHaveCount(0);
});

test("Cubed's old home goes to its list, free play's Cubed tab", async ({ page }) => {
  await page.goto('/#/cubed');
  await expect(page).toHaveURL(/#\/free\/cubed$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Free play' })).toBeVisible();
});

test('the editor picks its board with Flat | Cubed tabs', async ({ page }) => {
  await page.goto('/#/editor/flat');
  const tabs = page.getByRole('navigation', { name: 'Board' });
  await expect(tabs.getByRole('link', { name: /Flat/ })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: /Cubed/ }).click();
  await expect(page).toHaveURL(/#\/cubed\/editor$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Board' }).getByRole('link', { name: /Flat/ }).click();
  await expect(page).toHaveURL(/#\/editor\/flat$/);
});
