import { expect, test } from '@playwright/test';
import { encounterSolution, meter, runAt, seed, skipScene, solve, press } from './helpers';

test.describe('jobs board', () => {
  test('chapter 2 is locked until First Job is won', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('.run-banner')).toContainText('1 of 10 jobs open');
    await page.locator('.run-banner').tap();
    await expect(page.locator('.chapter-title').first()).toHaveText('Chapter 1Odd Jobs');
    await expect(page.locator('.job h3')).toHaveText(['First Job']);
    await expect(page.locator('.chapter.locked:not(.endless) .chapter-blurb')).toHaveText([
      'Clear First Job to continue the story.',
      'Clear The Night Shift to continue the story.',
      'Clear The Deep End to continue the story.',
      'Clear The Glasshouse to continue the story.',
      'Clear The Midway to continue the story.',
      'Clear Summit Station to continue the story.',
      'Clear The Night Mail to continue the story.',
      'Clear The Undercroft to continue the story.',
      'Clear The Annex to continue the story.',
    ]);
  });

  test('a First Job win opens chapter 2 with its story, then shows the best result', async ({
    page,
    context,
  }) => {
    await seed(context, {
      run: { jobs: { 'first-job': { plays: 2, wins: 1, hitsOnWins: 1, bestHp: 9 } } },
    });
    await page.goto('/#/run');
    await expect(page.locator('.dialogue')).toContainText('Chapter 2: After Hours');
    await page.locator('.skip').tap();
    await expect(page.locator('.job h3')).toHaveText(['First Job', 'The Night Shift']);
    await expect(page.locator('.chapter-progress')).toHaveText(['1/1 cleared', '0/1 cleared']);
    await expect(page.locator('.job').first().locator('.job-best')).toHaveText(
      'Cleared 1× · best 9/12 HP left',
    );
    // The opening only plays once, then it's a replay button.
    await page.reload();
    await expect(page.locator('.dialogue')).toBeHidden();
    await expect(page.getByRole('button', { name: '▶ Chapter story' })).toBeVisible();
  });
});

test.describe('First Job', () => {
  test('the intro plays once, the run finishes, and the result is recorded', async ({ page }) => {
    await page.goto('/#/run');
    await page.locator('.job').first().locator('text=Start').tap();
    await expect(page.locator('.dialogue')).toBeVisible();
    await page.locator('.skip').tap();

    for (const id of ['goblin', 'dig-site', 'fog-bat', 'tea-break', 'gremlin']) {
      await page.locator('.node.current .node-body').tap();
      await skipScene(page);
      await solve(page, encounterSolution(id));
      const next = id === 'gremlin' ? 'See results' : 'Back to map';
      await press(page, next);
    }

    await expect(page.locator('.results h2')).toHaveText('Job done!');
    await expect(page.locator('.sign-off')).toContainText("the gremlin's evicted");
    await press(page, 'Jobs board');
    await skipScene(page); // chapter 2 opens
    await expect(page.locator('.job').first().locator('.job-best')).toContainText('Cleared 1×');

    // The intro only plays automatically the first time.
    await page.locator('.job').first().locator('text=Start').tap();
    await expect(page.locator('.run-path')).toBeVisible();
    await expect(page.locator('.dialogue')).toBeHidden();
  });

  test('mistakes in a Hits-on run can knock you out', async ({ page, context }) => {
    await seed(context, {
      run: {
        seenScenes: ['first-job-intro'],
        current: runAt('first-job', 0, { hp: 2, maxHp: 12 }),
      },
    });
    await page.goto('/#/run/play');
    await expect(page.locator('.battle')).toBeVisible();
    await page.locator('.cell[data-i="0"]').tap(); // empty in the sword: a 2-damage hit
    await expect(page.getByRole('heading', { name: 'Knocked out' })).toBeVisible();
    expect(await meter(page, 'player-hp')).toBe(0);
    await press(page, 'See results');
    await expect(page.locator('.results h2')).toHaveText('Run over');
    await expect(page.locator('.sign-off')).toContainText('alive');
  });
});

test.describe('rest stops', () => {
  const restAt = { hp: 8, maxHp: 14 };

  test('solving in time heals the full amount', async ({ page, context }) => {
    await seed(context, { run: { current: runAt('first-job', 3, restAt) } });
    await page.goto('/#/run/play');
    await expect(page.locator('.rest')).toContainText('+4 HP');
    await solve(page, encounterSolution('tea-break'));
    await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('Rested · 0:');
    await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('+4 HP');
    await press(page, 'Back to map');
    await expect(page.locator('.hp-label')).toHaveText('HP 12/14');
  });

  test('finishing late still heals a little', async ({ page, context }) => {
    await seed(context, { run: { current: runAt('first-job', 3, restAt) } });
    await page.clock.install();
    await page.goto('/#/run/play');
    await page.clock.runFor(121_000);
    await page.clock.resume();
    await expect(page.locator('.rest-clock')).toHaveClass(/late/);
    await expect(page.locator('.rest')).toContainText('Finish anyway for +1 HP');
    await solve(page, encounterSolution('tea-break'));
    await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText(
      'Too slow for a full rest',
    );
    await press(page, 'Back to map');
    await expect(page.locator('.hp-label')).toHaveText('HP 9/14');
  });
});
