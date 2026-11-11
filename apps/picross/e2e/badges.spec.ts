import { expect, test, type Page } from '@playwright/test';
import {
  cell,
  encounterSolution,
  meter,
  press,
  runAt,
  seed,
  skipScene,
  solution,
  solve,
} from './helpers';

/** Saves solved puzzles to the progress key before the app loads. */
async function seedSolved(page: Page, ids: string[]) {
  await page.context().addInitScript((list) => {
    if (sessionStorage.getItem('solved')) return;
    sessionStorage.setItem('solved', '1');
    const solved = Object.fromEntries(
      list.map((id) => [`grid:${id}`, { solves: 1, bestTime: 1000 }]),
    );
    localStorage.setItem('picross:v2', JSON.stringify({ solved, boards: {}, time: {} }));
  }, ids);
}

/** Opens a job at its last encounter, ready to finish the run. */
async function lastFight(page: Page, extra: Record<string, unknown>) {
  await seed(page.context(), {
    run: {
      seenScenes: ['first-job-intro', 'gremlin-intro', 'first-job-outro'],
      current: runAt('first-job', 4, { hp: 12, maxHp: 12, ...extra }),
    },
  });
  await page.goto('/#/run/play');
  await skipScene(page);
  await expect(page.locator('.battle')).toBeVisible();
}

const CLEAN = {
  wrongFills: 0,
  zaps: 0,
  wrongAccusations: 0,
  gadgetsUsed: 0,
  bombsUsed: 0,
  spongesUsed: 0,
  hintsUsed: 0,
};

test.describe('rank', () => {
  test('a new player starts at the bottom of the ladder', async ({ page }) => {
    await page.goto('/#/');
    const card = page.locator('.rank-card');
    await expect(card.locator('.rank-name')).toHaveText('Hobbyist');
    await expect(card.locator('.rank-progress')).toHaveText('0 points · 10 to Tinkerer');
  });

  test('an older save shows the right rank, and a solve announces the rank-up once', async ({
    page,
  }) => {
    // Three 15×15s make 9 points, so the next puzzle of any size crosses 10.
    await seedSolved(page, ['abacus', 'acorn', 'alarm-clock']);
    await page.goto('/#/');
    await expect(page.locator('.rank-name')).toHaveText('Hobbyist');
    await expect(page.locator('.rank-progress')).toHaveText('9 points · 1 to Tinkerer');

    await page.goto('/#/play/heart');
    await solve(page, solution('heart'));
    await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText(
      'New rank: Tinkerer!',
    );
    await page.goto('/#/');
    await expect(page.locator('.rank-name')).toHaveText('Tinkerer');

    // The same puzzle again earns nothing.
    await page.goto('/#/play/heart');
    await page.getByRole('button', { name: 'Reset' }).tap();
    await solve(page, solution('heart'));
    await expect(page.locator('.end-panel:not([hidden]) .end-note')).not.toContainText('New rank');
    await page.goto('/#/');
    await expect(page.locator('.rank-progress')).toHaveText('10 points · 20 to Odd-Jobber');
  });
});

test.describe('job badges', () => {
  test('a clean Hits-on clear earns gold, once, and shows on the board', async ({ page }) => {
    await lastFight(page, { tally: CLEAN });
    await solve(page, encounterSolution('gremlin'));
    await press(page, 'See results');
    const earned = page.locator('.badges-earned');
    await expect(earned.locator('.badge-row')).toHaveCount(2);
    await expect(earned).toContainText('Invoiced a Bat');
    await expect(earned).toContainText('Gold');
    await expect(earned).toContainText('Toolbox Shut');

    // A reload doesn't show them again.
    await page.reload();
    await expect(page.locator('.run-card.results')).toBeVisible();
    await expect(page.locator('.badges-earned')).toHaveCount(0);

    await press(page, 'Jobs board');
    await skipScene(page);
    const card = page.locator('.job').first();
    await expect(card.locator('.job-badge')).toContainText('Invoiced a Bat');
    await expect(card.locator('.job-badge')).toContainText('Gold');
    await expect(card.locator(':scope > .job-best')).toContainText('best');
  });

  test('a run with a wrong fill earns silver', async ({ page }) => {
    await lastFight(page, { tally: { ...CLEAN, wrongFills: 1 } });
    await solve(page, encounterSolution('gremlin'));
    await press(page, 'See results');
    await expect(page.locator('.badges-earned')).toContainText('Silver');
  });

  test('a wrong fill a patch kit blocks still counts, even after a reload', async ({ page }) => {
    await lastFight(page, { tally: CLEAN, gadgets: ['patch-kit'] });
    await page.locator('.gadget').tap();
    await expect(page.locator('.shield')).toBeVisible();
    const rows = encounterSolution('gremlin');
    await cell(page, rows.join('').indexOf('.')).tap();
    expect(await meter(page, 'player-hp')).toBe(12);

    await page.reload();
    await skipScene(page);
    await expect(page.locator('.battle')).toBeVisible();
    await solve(page, rows);
    await press(page, 'See results');
    await expect(page.locator('.badges-earned')).toContainText('Silver');
    // The patch kit was a gadget too, so Toolbox Shut is out.
    await expect(page.locator('.badges-earned')).not.toContainText('Toolbox Shut');
  });

  test('a run started before the tally tops out at silver', async ({ page }) => {
    await lastFight(page, {});
    await solve(page, encounterSolution('gremlin'));
    await press(page, 'See results');
    await expect(page.locator('.badges-earned')).toContainText('Silver');
    await expect(page.locator('.badges-earned')).not.toContainText('Toolbox Shut');
  });

  test('a Relaxed win earns bronze and shows no HP best', async ({ page }) => {
    await lastFight(page, { mode: 'relaxed', tally: CLEAN });
    await solve(page, encounterSolution('gremlin'));
    await press(page, 'See results');
    await expect(page.locator('.badges-earned')).toContainText('Bronze');
    await press(page, 'Jobs board');
    await skipScene(page);
    await expect(page.locator('.job').first().locator(':scope > .job-best')).toHaveText(
      'Cleared 1×',
    );
  });
});

test.describe('badge shelf', () => {
  test('a new player sees no job or enemy names past First Job', async ({ page }) => {
    await page.goto('/#/badges');
    await expect(page.locator('h1')).toHaveText('Badges');
    await expect(page.locator('.run-meta').first()).toContainText('0 of 23 earned');
    const text = await page.locator('main').innerText();
    expect(text).toContain('Invoiced a Bat');
    expect(text).toContain('Toolbox Shut');
    for (const secret of [
      'After Hours',
      'Double Rates',
      'Octopus Diplomacy',
      'Invoice Paid',
      'Old Tess',
      'Exhibit 41',
      'Closing Time',
      'The Night Mail',
      'Going Down',
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    await expect(page.locator('.hidden-badge').first()).toContainText('???');
  });

  test("clearing a job opens the next chapter's section, and old wins count", async ({ page }) => {
    await seed(page.context(), {
      run: { jobs: { 'first-job': { plays: 3, wins: 1, bestHp: 12 } } },
    });
    await page.goto('/#/badges');
    const text = await page.locator('main').innerText();
    expect(text).toContain('After Hours');
    expect(text).toContain('Double Rates');
    expect(text).toContain('Going Down');
    expect(text).toContain('Expert Witness');
    expect(text).not.toContain('Octopus Diplomacy');
    await expect(page.locator('.run-meta').first()).toContainText('1 of 23 earned');
    const earned = page.locator('.badge-card.earned');
    await expect(earned).toContainText('Invoiced a Bat');
    await expect(earned).toContainText('Bronze');
    await expect(earned).toContainText('Silver: clear it with Hits on.');
  });

  test('stays within a phone screen, and the links reach it', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('.rank-badges').tap();
    await expect(page).toHaveURL(/#\/badges$/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await page.goto('/#/run');
    await skipScene(page);
    await page.locator('.jobs-badges').tap();
    await expect(page).toHaveURL(/#\/badges$/);
  });
});

test.describe('other badges', () => {
  test('Grounded shows on the victory panel when a charge never lands', async ({ page }) => {
    // Every cell shows the truth but one, so the fight ends before the charge can zap.
    const rows = encounterSolution('electric-eel');
    const flat = rows.join('');
    const missing = flat.indexOf('#');
    const cells = [...flat].map((c, i) => (i === missing ? '0' : c === '#' ? '1' : '2')).join('');
    await seed(page.context(), {
      run: {
        seenScenes: ['deep-end-intro', 'deep-water-opening'],
        current: runAt('deep-end', 0, {
          hp: 16,
          maxHp: 16,
          tally: CLEAN,
          board: { cells, elapsed: 0, mode: 'battle' },
        }),
      },
    });
    await page.goto('/#/run/play');
    await skipScene(page);
    await solve(page, rows);
    await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText(
      'Badge earned: Grounded!',
    );
  });

  test('a loss earns a joke badge, in any mode', async ({ page }) => {
    await seed(page.context(), {
      run: {
        seenScenes: ['glasshouse-intro'],
        jobs: {
          'first-job': { plays: 1, wins: 1 },
          'night-shift': { plays: 1, wins: 1 },
          'deep-end': { plays: 1, wins: 1 },
        },
        current: runAt('glasshouse', 2, { hp: 0, maxHp: 16, status: 'lost', tally: CLEAN }),
      },
    });
    await page.goto('/#/run');
    await expect(page.locator('.badges-earned')).toContainText('Pruned');
  });

  test('milestones come from existing bests, and a broken streak keeps them', async ({ page }) => {
    await seed(page.context(), {
      run: { jobs: { endless: { plays: 2, wins: 0, bestDepth: 11 } } },
    });
    await page.context().addInitScript(() => {
      localStorage.setItem(
        'picross:daily',
        JSON.stringify({ lastSolved: '2020-01-01', streak: 1, best: 8, solves: 9 }),
      );
    });
    await page.goto('/#/badges');
    const earned = page.locator('.badge-card.earned');
    await expect(earned.filter({ hasText: 'Going Down' })).toHaveCount(1);
    await expect(earned.filter({ hasText: 'Deep Cover' })).toHaveCount(1);
    await expect(earned.filter({ hasText: 'Regular' })).toHaveCount(1);
    await expect(earned.filter({ hasText: 'Rock Bottom' })).toHaveCount(0);
    await expect(earned.filter({ hasText: 'Creature of Habit' })).toHaveCount(0);
  });
});
