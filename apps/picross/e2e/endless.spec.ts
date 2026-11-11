import { expect, test } from '@playwright/test';
import { encounterSolution, runAt, seed, solve, press, updateSave } from './helpers';

const setup = { seed: 5, fights: ['goblin'], digs: ['dig-site'] };

test('endless opens after First Job and starts a run', async ({ page }) => {
  await page.goto('/#/run');
  await expect(page.locator('.chapter.endless')).toContainText('Clear First Job to open Endless.');
  await updateSave(page, {
    seenScenes: ['after-hours-opening'],
    jobs: { 'first-job': { plays: 1, wins: 1, bestHp: 12 } },
  });
  await page.locator('.job.endless').getByRole('button', { name: 'Start' }).tap();
  await expect(page.locator('h1')).toHaveText('Endless');
  await expect(page.locator('.run-depth')).toHaveText('Depth 1');
  await expect(page.locator('.node')).toHaveCount(4); // the current one and three ahead
});

test('a fight heals you, the map moves on, and a loss records your best depth', async ({
  page,
  context,
}) => {
  await seed(context, {
    run: {
      current: runAt('endless', 0, { hp: 10, endless: setup }),
      seenScenes: ['after-hours-opening'],
      jobs: { 'first-job': { plays: 1, wins: 1, bestHp: 12 } },
    },
  });
  await page.goto('/#/run/play');
  await solve(page, encounterSolution('goblin'));
  await expect(page.locator('.end-panel:not([hidden])')).toContainText('+2 HP');
  await press(page, 'Back to map');
  await expect(page.locator('.run-depth')).toHaveText('Depth 2');
  await expect(page.locator('.hp-label')).toHaveText('HP 12/14');

  // Knocked out at depth 6: the results show it, and the board keeps it.
  await updateSave(page, {
    current: runAt('endless', 6, { hp: 0, status: 'lost', endless: setup }),
  });
  await page.goto('/#/run');
  await expect(page.locator('.results .run-meta').first()).toHaveText(
    'Depth 6 · best 6 · new best!',
  );
  await press(page, 'Jobs board');
  await expect(page.locator('.job.endless .job-best')).toHaveText('Best depth: 6');
});
