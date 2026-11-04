import { expect, test } from '@playwright/test';
import { encounterSolution, seed, skipScene, solve, press } from './helpers';

test('the whole Night Shift, from the jobs board to the Museum Rex', async ({ page, context }) => {
  test.setTimeout(240_000);
  await seed(context, {
    run: {
      seenScenes: ['first-job-intro'],
      jobs: { 'first-job': { plays: 1, wins: 1, bestHp: 12 } },
    },
  });
  await page.goto('/#/run');
  await skipScene(page); // chapter 2's opening
  await press(page, 'Hits on');
  await page.locator('.job').nth(1).locator('text=Start').tap();
  await skipScene(page);

  for (const id of [
    'mimic',
    'clockwork-owl',
    'forger',
    'dusty-exhibit',
    'armored-beetle',
    'break-room',
    'museum-rex',
  ]) {
    await page.locator('.node.current .node-body').tap();
    await skipScene(page);
    if (id === 'museum-rex') await expect(page.locator('.cell')).toHaveCount(400);
    await solve(page, encounterSolution(id));
    await press(page, id === 'museum-rex' ? 'See results' : 'Back to map');
  }

  await expect(page.locator('.results h2')).toHaveText('Job done!');
  await expect(page.locator('.results .run-meta').first()).toContainText('7/7 encounters cleared');
  await expect(page.locator('.sign-off')).toHaveCount(3);
});
