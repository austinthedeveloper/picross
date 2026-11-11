import { expect, test, type Locator, type Page } from '@playwright/test';
import { breakCubes, emptyLines, focusBlock, puzzle } from '@picross/play-block/e2e/helpers';
import { cell, seed } from './helpers';

/** The one settings screen (#154): both games' settings, at #/settings. */

const toggle = (page: Page, name: string) => page.getByRole('switch', { name, exact: true });
const html = (page: Page) => page.locator('html');

/** Opens the settings from a game's list with its Settings link. */
async function openFrom(page: Page, list: '/#/' | '/#/cubed') {
  await page.goto(list);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}

/** Presses Tab until `target` has the focus, which has to show. */
async function tabTo(page: Page, target: Locator) {
  for (let n = 0; n < 25; n++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((node) => node === document.activeElement)) {
      expect(await target.evaluate((node) => node.matches(':focus-visible'))).toBe(true);
      return;
    }
  }
  throw new Error(`Tab never reached ${target}`);
}

test.describe('the settings screen', () => {
  test('opens from both lists, and Home goes back to each', async ({ page }) => {
    await openFrom(page, '/#/');
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cubed' })).toBeVisible();
    // The 2D game has no settings of its own (its list keeps its filters), so no Flat group.
    await expect(page.getByRole('heading', { name: 'Flat' })).toHaveCount(0);
    await expect(page.getByText(/reduced motion, follow your device/)).toBeVisible();
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: 'Picross', exact: true })).toBeVisible();

    await openFrom(page, '/#/cubed');
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();
    // The lists' own sound and contrast buttons moved here.
    await expect(page.locator('.select .mute')).toHaveCount(0);
  });

  test('high contrast applies at once to both games, and a reload keeps it', async ({ page }) => {
    await openFrom(page, '/#/');
    await toggle(page, 'High contrast').check();
    await expect(html(page)).toHaveAttribute('data-contrast', 'high');
    await page.reload();
    await expect(toggle(page, 'High contrast')).toBeChecked();
    await expect(html(page)).toHaveAttribute('data-contrast', 'high');
    await page.goto('/#/play/heart');
    await expect(html(page)).toHaveAttribute('data-contrast', 'high');
    await page.goto('/#/cubed/play/steps');
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
    await expect(html(page)).toHaveAttribute('data-contrast', 'high');
    await page.goto('/#/settings');
    await toggle(page, 'High contrast').uncheck();
    await expect(html(page)).not.toHaveAttribute('data-contrast', 'high');
  });

  test("sound is the boards' mute buttons, both ways", async ({ page }) => {
    await page.goto('/#/play/heart');
    const mute = page.locator('.mute');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await page.goto('/#/settings');
    await expect(toggle(page, 'Sound')).not.toBeChecked();
    await toggle(page, 'Sound').check();
    await page.goto('/#/play/heart');
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/#/cubed/play/steps');
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    // A board's button changes the same setting.
    await mute.click();
    await page.goto('/#/settings');
    await expect(toggle(page, 'Sound')).not.toBeChecked();
    await page.reload();
    await expect(toggle(page, 'Sound')).not.toBeChecked();
  });

  test('haptics buzz on a board only while they are on', async ({ page, context }) => {
    // Counts the buzzes instead of buzzing.
    await context.addInitScript(() => {
      const w = window as unknown as { buzzes: number };
      w.buzzes = 0;
      Navigator.prototype.vibrate = () => (w.buzzes++, true);
    });
    const buzzes = () => page.evaluate(() => (window as unknown as { buzzes: number }).buzzes);
    await openFrom(page, '/#/');
    await expect(toggle(page, 'Haptics')).toBeChecked();
    await toggle(page, 'Haptics').uncheck();
    await page.reload();
    await expect(toggle(page, 'Haptics')).not.toBeChecked();
    await page.goto('/#/play/heart');
    await cell(page, 0).tap();
    expect(await buzzes()).toBe(0);
    await page.goto('/#/settings');
    // Turning them on buzzes once, so you know they work.
    await toggle(page, 'Haptics').check();
    expect(await buzzes()).toBe(1);
    await page.goto('/#/play/heart');
    await cell(page, 1).tap();
    await expect.poll(buzzes).toBeGreaterThan(1);
  });

  test('the mode is the lists’ mode', async ({ page }) => {
    await openFrom(page, '/#/');
    await page.getByRole('radio', { name: /Hearts/ }).check();
    await page.reload();
    await expect(page.getByRole('radio', { name: /Hearts/ })).toBeChecked();
    await page.goto('/#/');
    await expect(page.getByRole('button', { name: '♥ Hearts' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.goto('/#/cubed');
    await expect(page.getByRole('button', { name: 'Hearts' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('fading finished clues on a block, then not', async ({ page }) => {
    const steps = puzzle('steps');
    const [line] = emptyLines(steps);
    expect(line).toBeTruthy();
    const block = page.locator('canvas.block-canvas');
    await page.goto('/#/cubed/play/steps');
    await focusBlock(page);
    await breakCubes(page, steps, line);
    await expect(block).not.toHaveAttribute('data-faded', '0');
    await openFrom(page, '/#/cubed');
    await expect(toggle(page, 'Fade finished clues')).toBeChecked();
    await toggle(page, 'Fade finished clues').uncheck();
    // Back on the same board, its finished line no longer fades.
    await page.goto('/#/cubed/play/steps');
    await expect(block).toHaveAttribute('data-faded', '0');
    await page.reload();
    await expect(block).toHaveAttribute('data-faded', '0');
  });

  test("replays Cubed's tutorial", async ({ page }) => {
    await openFrom(page, '/#/cubed');
    await page.getByRole('link', { name: 'Play the tutorial' }).click();
    await expect(page).toHaveURL(/#\/cubed\/tutorial$/);
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
  });

  test('a change reaches a fight that switched to a block', async ({ page, context }) => {
    // The Curator, four phases in: unfolded into a block (as in switching-boss.spec.ts).
    await seed(context, {
      run: {
        current: {
          runId: 'closing-time',
          node: 3,
          hp: 18,
          maxHp: 18,
          gadgets: [],
          status: 'active',
          mode: 'relaxed',
          battle: { struck: [], enemyHp: 36, phase: 4 },
        },
      },
    });
    await page.goto('/#/run/play');
    await expect(html(page)).toHaveAttribute('data-board', 'block');
    await expect(page.locator('.mute')).toHaveAttribute('aria-pressed', 'false');
    await page.goto('/#/settings');
    await expect(html(page)).not.toHaveAttribute('data-board', 'block');
    await toggle(page, 'Sound').check();
    await toggle(page, 'High contrast').check();
    await page.goto('/#/run/play');
    await expect(html(page)).toHaveAttribute('data-board', 'block');
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
    await expect(page.locator('.mute')).toHaveAttribute('aria-pressed', 'true');
    await expect(html(page)).toHaveAttribute('data-contrast', 'high');
  });

  test('works with the keyboard alone', async ({ page }) => {
    await page.goto('/#/');
    await tabTo(page, page.getByRole('link', { name: 'Settings' }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await tabTo(page, toggle(page, 'Sound'));
    await page.keyboard.press('Space');
    await expect(toggle(page, 'Sound')).toBeChecked();
    await tabTo(page, toggle(page, 'High contrast'));
    await page.keyboard.press('Space');
    await expect(html(page)).toHaveAttribute('data-contrast', 'high');
    await tabTo(page, page.getByRole('radio', { name: /Relaxed/ }));
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: /Hearts/ })).toBeChecked();
    await tabTo(page, toggle(page, 'Fade finished clues'));
    await page.keyboard.press('Space');
    await expect(toggle(page, 'Fade finished clues')).not.toBeChecked();
    await tabTo(page, page.getByRole('link', { name: 'Play the tutorial' }));
    await page.reload();
    await expect(toggle(page, 'Sound')).toBeChecked();
    await expect(page.getByRole('radio', { name: /Hearts/ })).toBeChecked();
    await expect(toggle(page, 'Fade finished clues')).not.toBeChecked();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`fits a narrow phone, ${scheme}, and in high contrast`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto('/#/settings');
      const fits = () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(await fits()).toBe(true);
      // Every control is big enough to tap.
      for (const control of await page.locator('[role="switch"], .settings-screen a').all()) {
        const box = await control.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(24);
      }
      await toggle(page, 'High contrast').check();
      expect(await fits()).toBe(true);
      await page.goto('/#/cubed');
      expect(await fits()).toBe(true);
    });
  }
});
