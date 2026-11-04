import { expect, test } from '@playwright/test';
import { encounterSolution, seed, skipScene, solve, press } from './helpers';

test('the whole Deep End, from chapter 3 opening to Old Tess', async ({ page, context }) => {
  test.setTimeout(240_000);
  await seed(context, {
    run: {
      seenScenes: ['first-job-intro', 'after-hours-opening'],
      jobs: {
        'first-job': { plays: 1, wins: 1, bestHp: 12 },
        'night-shift': { plays: 1, wins: 1, bestHp: 10 },
      },
    },
  });
  await page.goto('/#/run');
  await expect(page.locator('.dialogue')).toContainText('Chapter 3: Deep Water');
  await page.locator('.skip').tap();
  await page.locator('.job').nth(2).locator('text=Start').tap();
  await skipScene(page);

  for (const id of [
    'electric-eel',
    'anglerfish',
    'gift-shop',
    'cuttlefish',
    'lifeguard-chair',
    'old-tess',
  ]) {
    await page.locator('.node.current .node-body').tap();
    await skipScene(page);
    if (id === 'anglerfish') await expect(page.locator('.clue.fogged')).toHaveCount(5);
    if (id === 'old-tess') await expect(page.locator('.cell')).toHaveCount(400);
    await solve(page, encounterSolution(id));
    if (id === 'gift-shop')
      await expect(page.locator('.end-panel:not([hidden])')).toContainText('Sponge');
    await press(page, id === 'old-tess' ? 'See results' : 'Back to map');
  }

  await expect(page.locator('.results h2')).toHaveText('Job done!');
  await expect(page.locator('.sign-off').first()).toContainText('sulking under her rock');
});
