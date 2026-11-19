import { expect, test, type Locator, type Page } from '@playwright/test';

// Brick kids (a prototype, docs/bricks.md): the build on its own, for little kids. Every
// action is a tap, nothing needs reading, and a finished toy goes on the shelf.

const screen = (page: Page) => page.locator('main.bk');
const trayBricks = (page: Page) => page.getByRole('group', { name: 'Bricks' }).getByRole('button');

/** The words a child would see: none, outside the grown-ups' panel and screen-reader text. */
const visibleText = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const walk = document.createTreeWalker(
      document.querySelector('main.bk')!,
      NodeFilter.SHOW_TEXT,
    );
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.parentElement?.closest('.sr-only, dialog')) continue;
      if (n.textContent?.trim()) out.push(n.textContent.trim());
    }
    return out;
  });

/** Builds the model on screen by taps: the tray's brick, then the plate, to the end. */
async function buildByTaps(page: Page) {
  const canvas = page.locator('canvas.build-canvas');
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  for (let i = 0; i < 40; i++) {
    if ((await screen(page).getAttribute('data-phase')) !== 'build') break;
    const bricks = trayBricks(page);
    // Between layers the tray is empty or waiting for a moment.
    if ((await bricks.count()) === 0 || (await bricks.first().isDisabled())) {
      await page.waitForTimeout(100);
      continue;
    }
    // Keep the brick in hand, or pick up the last kind in the tray.
    const held = page.getByRole('group', { name: 'Bricks' }).locator('[aria-pressed="true"]');
    if ((await held.count()) === 0) await bricks.last().click();
    await canvas.click();
  }
  await expect(screen(page)).toHaveAttribute('data-phase', 'shelf');
}

async function expectBig(target: Locator) {
  const box = (await target.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(64);
}

test('the picker is big picture cards, with nothing to read', async ({ page }) => {
  await page.goto('/#/bricks');
  await expect(page.getByRole('heading', { level: 1, name: 'Brick kids' })).toBeAttached();
  const cards = page.getByRole('navigation', { name: 'Models' }).getByRole('link');
  await expect(cards).toHaveCount(11);
  await expect(cards.first()).toHaveAccessibleName('Jack');
  await expectBig(cards.first());
  expect(await visibleText(page)).toEqual([]);
  await expect(page.getByRole('region', { name: 'Shelf' }).getByRole('link')).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test('a build by taps goes on the shelf, and plays its moment again', async ({ page }) => {
  await page.goto('/#/bricks');
  await page.getByRole('link', { name: 'Jack' }).click();
  await expect(page).toHaveURL(/#\/bricks\/jack$/);
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  // No words: no counts to read, no layers, no Turn button. Each tray brick is big.
  for (const brick of await trayBricks(page).all()) await expectBig(brick);
  await expectBig(page.getByRole('link', { name: 'Home' }));
  await expect(page.getByRole('button', { name: /turn/i })).toHaveCount(0);
  expect(await visibleText(page)).toEqual([]);

  await buildByTaps(page);
  const shelf = page.getByRole('region', { name: 'Shelf' });
  await expect(shelf.getByRole('link', { name: 'Jack' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build it again' })).toBeVisible();

  // Home: the shelf keeps it (on this device), and its card has a star.
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page).toHaveURL(/#\/bricks$/);
  await page.reload();
  await expect(shelf.getByRole('link', { name: 'Jack' })).toBeVisible();
  await expect(page.locator('.bk-card[data-id="jack"] .bk-star')).toHaveCount(1);
  await expect(page.locator('.bk-card[data-id="car"] .bk-star')).toHaveCount(0);

  // Tapping it plays its moment.
  await shelf.getByRole('link', { name: 'Jack' }).click();
  await expect(page).toHaveURL(/#\/bricks\/jack\/show$/);
  await expect(screen(page)).toHaveAttribute('data-phase', 'show');
  await page.getByRole('button', { name: 'Again' }).click();
  await page.getByRole('link', { name: 'Build the Jack' }).click();
  await expect(page).toHaveURL(/#\/bricks\/jack$/);
});

test('the tray shows every kind the layer needs, wrapping at phone width', async ({ page }) => {
  // The dog's fourth layer: four kinds of brick.
  await page.goto('/#/bricks/dog');
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  await page.evaluate(() =>
    localStorage.setItem('picross:bricks', JSON.stringify({ shelf: [], progress: { dog: 3 } })),
  );
  await page.reload();
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  const bricks = trayBricks(page);
  expect(await bricks.count()).toBeGreaterThan(1);
  // Counts as dots, one for each brick left.
  for (const brick of await bricks.all()) {
    await expectBig(brick);
    const count = Number(await brick.getAttribute('data-count'));
    await expect(brick.locator('.bk-pip')).toHaveCount(count);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  // Pick one kind, place one, and its dots go down by one.
  const brick = bricks.last();
  const kind = (await brick.getAttribute('data-kind'))!;
  const before = Number(await brick.getAttribute('data-count'));
  await brick.click();
  await page.locator('canvas.build-canvas').click();
  const after = page.locator(`.bk-brick-button[data-kind="${kind}"]`);
  if (before > 1) await expect(after.locator('.bk-pip')).toHaveCount(before - 1);
  else await expect(after).toHaveCount(0);
});

test('a tap anywhere on the plate snaps the brick into a ghost', async ({ page }) => {
  await page.goto('/#/bricks/car');
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  // The car's wheels: one kind on its bottom layer.
  const brick = trayBricks(page);
  await expect(brick).toHaveCount(1);
  await expect(brick).toHaveAttribute('data-count', '4');
  // Nothing in hand: a tap on the plate places nothing.
  await page.locator('canvas.build-canvas').click({ position: { x: 20, y: 20 } });
  await expect(brick).toHaveAttribute('data-count', '4');
  await brick.click();
  await expect(brick).toHaveAttribute('aria-pressed', 'true');
  // The stage's corner, far from any ghost.
  await page.locator('canvas.build-canvas').click({ position: { x: 20, y: 20 } });
  await expect(brick).toHaveAttribute('data-count', '3');
  // Still in hand: the next tap places the next one.
  await expect(brick).toHaveAttribute('aria-pressed', 'true');
});

test('a build left partway picks up on its layer', async ({ page }) => {
  await page.goto('/#/bricks/car');
  await expect(screen(page)).toHaveAttribute('data-layer', '1');
  await trayBricks(page).click();
  for (let i = 0; i < 4; i++) await page.locator('canvas.build-canvas').click();
  await expect(screen(page)).toHaveAttribute('data-layer', '2');
  await page.reload();
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  await expect(screen(page)).toHaveAttribute('data-layer', '2');
});

/** Holds the grown-ups' lock for `ms`. */
async function hold(page: Page, ms: number) {
  await page.locator('.bk-gate').hover();
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test("the grown-ups' corner opens only when held for three seconds", async ({ page }) => {
  await page.goto('/#/bricks/car');
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  await trayBricks(page).click();
  for (let i = 0; i < 4; i++) await page.locator('canvas.build-canvas').click();
  await expect(screen(page)).toHaveAttribute('data-layer', '2');

  const panel = page.getByRole('dialog', { name: 'Grown-ups' });
  await page.locator('.bk-gate').click();
  await hold(page, 1000);
  await expect(panel).toBeHidden();
  await hold(page, 3300);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: /Sound/ })).toBeVisible();

  // Start over asks once more, then goes back to the bottom.
  await panel.getByRole('button', { name: 'Start over' }).click();
  await panel.getByRole('button', { name: 'Start over? Tap again' }).click();
  await expect(screen(page)).toHaveAttribute('data-phase', 'build');
  await expect(screen(page)).toHaveAttribute('data-layer', '1');

  // On the picker it clears the shelf, and leads out to the main menu.
  await page.goto('/#/bricks');
  await hold(page, 3300);
  await panel.getByRole('link', { name: 'Leave for the main menu' }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('an unknown model goes back to the picker', async ({ page }) => {
  await page.goto('/#/bricks/mug');
  await expect(page).toHaveURL(/#\/bricks$/);
});
