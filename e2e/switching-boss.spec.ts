import { expect, test, type Page } from '@playwright/test';
import { seed } from './helpers';

/** The Curator's fight (the last of Closing Time), already some way in. */
const curator = (battle: Record<string, unknown>) => ({
  run: {
    current: {
      runId: 'closing-time',
      node: 3,
      hp: 18,
      maxHp: 18,
      gadgets: [],
      status: 'active',
      mode: 'relaxed',
      battle: { struck: [], ...battle },
    },
  },
});

const enemyHp = (page: Page) => page.locator('[role="meter"][aria-label$=" HP"]').first();

test.describe('a boss that switches board', () => {
  test('the Curator unfolds into a block at 60%, with its HP share and phases', async ({
    page,
    context,
  }) => {
    // Four phases in: the fourth unfolds it.
    await seed(context, curator({ enemyHp: 36, phase: 4 }));
    await page.goto('/#/run/play');
    await expect(page.locator('html')).toHaveAttribute('data-board', 'block');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.battle-name').first()).toHaveText('Unfolded Curator');
    // The block has more lines, so more HP, but the same share of it is gone.
    const max = Number(await enemyHp(page).getAttribute('aria-valuemax'));
    const now = Number(await enemyHp(page).getAttribute('aria-valuenow'));
    expect(max).toBeGreaterThan(60);
    expect(now / max).toBeGreaterThan(0.3);
    expect(now / max).toBeLessThanOrEqual(0.6);
    // The flat game's screen styles are off while the block is up.
    await expect(page.locator('.board')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('a block whose HP has fallen into the last phase folds back flat', async ({
    page,
    context,
  }) => {
    await seed(context, curator({ enemyHp: 17, phase: 4 }));
    await page.goto('/#/run/play');
    await expect(page.locator('.battle-name').first()).toHaveText('Overwound Curator');
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-board', 'block');
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('picross:run')!).current,
    );
    expect(saved.battle.phase).toBe(5);
    expect(saved.block.battle).toBeTruthy();
  });
});
