import { expect, test } from '@playwright/test';
import { encounterSolution, runAt, seed, skipScene, solve, press } from './helpers';

const cleared = { plays: 1, wins: 1 };
const seenOpenings = ['after-hours-opening', 'deep-water-opening'];

const allOpenings = [
  ...seenOpenings,
  'green-thumbs-opening',
  'step-right-up-opening',
  'cold-snap-opening',
  'end-of-the-line-opening',
  'below-stairs-opening',
  'peer-review-opening',
  'wound-up-opening',
];

/** Every Overtime besides the Night Shift's, with its boss and that boss's node. */
const BOSSES = [
  { job: 'first-job', node: 4, boss: 'overtime-gremlin' },
  { job: 'deep-end', node: 5, boss: 'overtime-old-tess' },
  { job: 'glasshouse', node: 5, boss: 'overtime-mother-bramble' },
  { job: 'midway', node: 5, boss: 'overtime-ringmaster' },
  { job: 'summit-station', node: 5, boss: 'overtime-yeti' },
  { job: 'night-mail', node: 5, boss: 'overtime-the-1159' },
  { job: 'undercroft', node: 5, boss: 'overtime-old-wyrm' },
  { job: 'the-annex', node: 5, boss: 'overtime-ostrander' },
];

test.describe('Overtime', () => {
  test('stays hidden until its job is cleared', async ({ page, context }) => {
    await seed(context, {
      run: { seenScenes: seenOpenings, jobs: { 'first-job': cleared } },
    });
    await page.goto('/#/run');
    await expect(page.locator('.job h3').nth(1)).toHaveText('The Night Shift');
    await expect(page.locator('.job').nth(1).locator('.job-overtime')).toHaveCount(0);
    // The job you have cleared offers its own.
    await expect(page.locator('.job').first().locator('.job-overtime')).toHaveCount(1);
  });

  test('always plays with Hits on, whatever the mode picker says', async ({ page, context }) => {
    await seed(context, {
      run: { seenScenes: seenOpenings, jobs: { 'first-job': cleared, 'night-shift': cleared } },
    });
    await page.goto('/#/run');
    const offer = page.locator('.job').nth(1).locator('.job-overtime');
    await expect(offer).toHaveCount(1);
    await expect(offer).toContainText('Hits on only');
    await expect(page.getByRole('button', { name: 'Relaxed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await offer.getByRole('button', { name: 'Start Overtime' }).tap();
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
    await expect(page.locator('.job').nth(1).locator('.job-overtime .job-best')).toContainText(
      'Cleared 1×',
    );
  });

  test('every job but Closing Time offers one once cleared', async ({ page, context }) => {
    const jobs = ['night-shift', 'closing-time', ...BOSSES.map((b) => b.job)];
    await seed(context, {
      run: {
        seenScenes: allOpenings,
        jobs: Object.fromEntries(jobs.map((id) => [id, cleared])),
      },
    });
    await page.goto('/#/run');
    await expect(page.locator('.job h3').nth(9)).toHaveText('Closing Time');
    await expect(page.locator('.job-overtime')).toHaveCount(9);
    await expect(page.locator('.job').nth(9).locator('.job-overtime')).toHaveCount(0);
  });

  // Each boss stacks the most powers, so play every one through to the results.
  for (const { job, node, boss } of BOSSES) {
    test(`${job}: the boss can be finished, and results save apart from the job`, async ({
      page,
      context,
    }) => {
      test.setTimeout(180_000);
      await seed(context, {
        run: {
          seenScenes: seenOpenings,
          jobs: { 'first-job': cleared, [job]: cleared },
          // Plenty of HP: this checks the fight works, not how hard it is.
          current: runAt(`${job}-overtime`, node, { hp: 99, maxHp: 99 }),
        },
      });
      await page.goto('/#/run');
      await page.locator('.node.current .node-body').tap();
      await expect(page.locator('.dialogue')).toHaveCount(0);
      await solve(page, encounterSolution(boss));
      await press(page, 'See results');
      await expect(page.locator('.results h2')).toHaveText('Job done!');
      const jobs = await page.evaluate(() => JSON.parse(localStorage.getItem('picross:run')!).jobs);
      expect(jobs[`${job}-overtime`]).toMatchObject({ plays: 1, wins: 1, hitsOnWins: 1 });
      expect(jobs[job]).toEqual(cleared);
    });
  }
});
