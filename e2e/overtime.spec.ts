import { expect, test } from '@playwright/test';
import { encounterSolution, runAt, seed, skipScene, solve, press } from './helpers';

const cleared = { plays: 1, wins: 1 };
const seenOpenings = ['after-hours-opening', 'deep-water-opening'];

test.describe('Overtime', () => {
  test('stays hidden until its job is cleared', async ({ page, context }) => {
    await seed(context, {
      run: { seenScenes: seenOpenings, jobs: { 'first-job': cleared } },
    });
    await page.goto('/#/run');
    await expect(page.locator('.job h3').nth(1)).toHaveText('The Night Shift');
    await expect(page.locator('.job-overtime')).toHaveCount(0);
  });

  test('always plays with Hits on, whatever the mode picker says', async ({ page, context }) => {
    await seed(context, {
      run: { seenScenes: seenOpenings, jobs: { 'first-job': cleared, 'night-shift': cleared } },
    });
    await page.goto('/#/run');
    const offer = page.locator('.job-overtime');
    await expect(offer).toHaveCount(1);
    await expect(offer).toContainText('Hits on only');
    await expect(page.getByRole('button', { name: 'Relaxed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await press(page, 'Start Overtime');
    await expect(page.locator('h1')).toHaveText('The Night Shift: Overtime');
    const run = await page.evaluate(() => JSON.parse(localStorage.getItem('picross:run')!).current);
    expect(run).toMatchObject({ runId: 'night-shift-overtime', mode: 'hearts', gadgets: [] });
  });

  test('every encounter can be finished, and results save apart from the job', async ({
    page,
    context,
  }) => {
    test.setTimeout(300_000);
    await seed(context, {
      run: {
        seenScenes: seenOpenings,
        jobs: { 'first-job': cleared, 'night-shift': cleared },
        // Plenty of HP: this checks the fights work, not how hard they are.
        current: runAt('night-shift-overtime', 0, { hp: 99, maxHp: 99 }),
      },
    });
    await page.goto('/#/run');
    for (const id of [
      'overtime-mimic',
      'overtime-clockwork-owl',
      'overtime-forger',
      'dusty-exhibit',
      'overtime-armored-beetle',
      'break-room',
      'overtime-museum-rex',
    ]) {
      await page.locator('.node.current .node-body').tap();
      await expect(page.locator('.dialogue')).toHaveCount(0);
      await solve(page, encounterSolution(id));
      await press(page, id === 'overtime-museum-rex' ? 'See results' : 'Back to map');
    }
    await expect(page.locator('.results h2')).toHaveText('Job done!');
    const jobs = await page.evaluate(() => JSON.parse(localStorage.getItem('picross:run')!).jobs);
    expect(jobs['night-shift-overtime']).toMatchObject({ plays: 1, wins: 1, hitsOnWins: 1 });
    expect(jobs['night-shift']).toEqual(cleared);

    await press(page, 'Jobs board');
    await skipScene(page);
    await expect(page.locator('.job-overtime .job-best')).toContainText('Cleared 1×');
  });
});
