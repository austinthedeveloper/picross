import { expect, test, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { cell, skipScene } from './helpers';

/**
 * The first-launch save merge (#155) in the built app: a player arrives with both old games'
 * saves (a fixture from real play, src/game/fixtures/legacy/), and both games pick them up.
 * This also checks the migration really runs before the stores read storage in the bundle.
 */

const FIXTURES = path.join(import.meta.dirname, '../src/game/fixtures/legacy');

function oldKeys(name: string): Record<string, string> {
  const { keys } = JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8')) as {
    keys: Record<string, unknown>;
  };
  return Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
}

/** Puts the old games' keys in place before the app first loads (and never after the merge). */
async function arriveWith(context: BrowserContext, name: string) {
  await context.addInitScript((keys) => {
    if (localStorage.getItem('picross:save')) return;
    for (const [key, value] of Object.entries(keys)) localStorage.setItem(key, value);
  }, oldKeys(name));
}

test('both games keep their solves and runs in progress', async ({ page, context }) => {
  await arriveWith(context, 'both-mid-run');
  await page.goto('/#/');
  // Cubed was played last, so the app opens on it, as before the merge.
  await expect(page).toHaveURL(/#\/cubed$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('picross:save')!))).toEqual({
    version: 3,
    mergedAt: expect.any(Number),
  });

  // Picross Cubed: its solves (heart is in both packs), its half-done block, its run.
  await expect(page.locator('.puzzle-card.solved[href="#/cubed/play/steps"]')).toContainText(
    'Steps',
  );
  await expect(page.locator('.puzzle-card.solved[href="#/cubed/play/heart"]')).toContainText(
    'Heart',
  );
  await expect(page.locator('.puzzle-card[href="#/cubed/play/mug"] .card-meta')).toContainText(
    'in progress',
  );
  await expect(page.locator('.story-card')).toContainText('Continue First Job · encounter 2 of 5');

  // The 2D game: the same, from its own old save.
  await page.getByRole('link', { name: /Flat/ }).click();
  await expect(page.locator('a.card.solved[href="#/play/heart"]')).toContainText('Heart');
  await expect(page.locator('a.card[href="#/play/flag"] .status')).toHaveText('In progress');
  await expect(page.locator('.run-banner')).toContainText('Continue run');
  await expect(page.locator('.run-banner')).toContainText('First Job · encounter 2 of 5');

  // The 2D run resumes on its board as it was left, with its first cell filled.
  await page.locator('.run-banner').tap();
  await page.locator('.node.current .node-body').tap();
  await skipScene(page);
  await expect(cell(page, 0)).toHaveClass(/filled/);

  // And Cubed's, with two cubes broken.
  await page.goto('/#/cubed/story');
  await page.getByRole('link', { name: /current/ }).click();
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  const cubed = await page.evaluate(
    () => JSON.parse(localStorage.getItem('picross:run')!).block.current,
  );
  expect(cubed.node).toBe(1);
  expect(cubed.board.blocks.startsWith('22')).toBe(true);
});

test('both dailies become one, with one streak (#156)', async ({ page, context }) => {
  // Both games solved the daily on 2026-11-11, a Cubed day of the one daily.
  await arriveWith(context, 'both');
  await page.clock.setFixedTime(new Date(2026, 10, 11, 12));
  await page.goto('/#/');
  await page.getByRole('link', { name: /Flat/ }).click();
  const card = page.locator('.daily-card');
  await expect(card).toContainText('Today: Cubed · ✓ Solved in');
  await expect(card).toContainText('🔥 1 day in a row · best 1');
  // The next day, a Flat one: the streak is still alive, on both lists.
  await page.clock.setFixedTime(new Date(2026, 10, 12, 12));
  await page.reload();
  await expect(card).toContainText(/Today: Flat · \d+×\d+ · Not solved yet/);
  await expect(card).toContainText('🔥 1 day in a row');
  await page.goto('/#/cubed');
  await expect(page.locator('.daily-card')).toContainText('Keep your 1 day streak going.');
});

test("a later launch doesn't merge the old saves again", async ({ page, context }) => {
  await arriveWith(context, 'cubed-only');
  await page.goto('/#/cubed');
  await expect(page.locator('.puzzle-card.solved')).toHaveCount(2);
  // An old key changing now (an old tab, say) changes nothing.
  await page.evaluate(() => {
    const old = JSON.parse(localStorage.getItem('picross3d:v1')!);
    old.solved.mug = { solves: 1, bestTime: 1000, clean: 1 };
    localStorage.setItem('picross3d:v1', JSON.stringify(old));
  });
  await page.reload();
  // The list shows Done puzzles only (the player's filter), so mug would show if it had come in.
  await expect(page.locator('.puzzle-card.solved')).toHaveCount(2);
  await expect(page.locator('.puzzle-card[href="#/cubed/play/mug"]')).toHaveCount(0);
});

test("Cubed's settings come with it when the 2D game had none", async ({ page, context }) => {
  await arriveWith(context, 'cubed-only');
  await page.goto('/#/cubed');
  // Cubed-only: sound on, the list on Done, fading off, the tutorial skipped.
  await expect(page.locator('.mute').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.tutorial-card')).toHaveCount(0);
  // One settings save: the 2D game's list has sound on too.
  await page.goto('/#/');
  await expect(page.locator('.mute').first()).toHaveAttribute('aria-pressed', 'true');
});
