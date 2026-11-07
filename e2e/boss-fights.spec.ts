import { expect, test } from '@playwright/test';
import { press, seed } from './helpers';

const cleared = { plays: 1, wins: 1 };
// Every chapter opening through the one Summit Station opens, so no scene stops the board.
const seenScenes = [
  'after-hours-opening',
  'deep-water-opening',
  'green-thumbs-opening',
  'step-right-up-opening',
  'cold-snap-opening',
  'end-of-the-line-opening',
];
const jobs = ['first-job', 'night-shift', 'deep-end', 'glasshouse', 'midway'];

test.describe('boss fights', () => {
  test('the Weathervane waits for Summit Station', async ({ page, context }) => {
    await seed(context, {
      run: { seenScenes, jobs: Object.fromEntries(jobs.map((j) => [j, cleared])) },
    });
    await page.goto('/#/run');
    await expect(page.locator('.job h3', { hasText: 'Summit Station' })).toBeVisible();
    await expect(page.locator('.job-boss-fight')).toHaveCount(0);
  });

  test('clearing Summit Station offers the Weathervane on its card', async ({ page, context }) => {
    await seed(context, {
      run: {
        seenScenes,
        jobs: Object.fromEntries([...jobs, 'summit-station'].map((j) => [j, cleared])),
      },
    });
    await page.goto('/#/run');
    const offer = page.locator('.job-boss-fight');
    await expect(offer).toHaveCount(1);
    await expect(offer).toContainText('Boss fight: Weathervane');
    await expect(offer).toContainText('One fight');
    await expect(offer).toContainText('Not played yet');
    await expect(page.locator('.job', { has: offer }).locator('h3')).toHaveText('Summit Station');
    await press(page, 'Start boss fight');
    await expect(page.locator('h1')).toHaveText('The Weathervane');
    const run = await page.evaluate(() => JSON.parse(localStorage.getItem('picross:run')!).current);
    expect(run).toMatchObject({ runId: 'weathervane-boss' });
  });
});
