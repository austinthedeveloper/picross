import { expect, test, type Page } from '@playwright/test';
import {
  announcements,
  boardState,
  cell,
  encounterSolution,
  fillRow,
  meter,
  runAt,
  seed,
  skipScene,
  solve,
  press,
} from './helpers';

/** Opens a run straight at one encounter, in a Hits-on run. */
async function fight(page: Page, runId: string, node: number, extra = {}) {
  await seed(page.context(), {
    run: {
      seenScenes: ['first-job-intro', 'night-shift-intro'],
      current: runAt(runId, node, extra),
    },
  });
  await page.goto('/#/run/play');
  await skipScene(page);
  await expect(page.locator('.battle')).toBeVisible();
}

const fogged = (page: Page) =>
  page.$$eval('.clue.fogged', (g) =>
    g.map((x) => x.getAttribute('aria-label')!.split(' clues')[0]),
  );

test('fog bat: fog only lifts from the row you solve', async ({ page }) => {
  await fight(page, 'first-job', 2);
  const bat = encounterSolution('fog-bat');
  await expect.poll(() => fogged(page)).toEqual(['Row 4', 'Row 6', 'Row 7', 'Row 10']);
  for (let r = 0; r < 10; r++) if (bat[r][0] === '#') await cell(page, r * 10).tap(); // column 1
  expect(await fogged(page)).toHaveLength(4);
  await fillRow(page, bat, 3);
  await expect.poll(() => fogged(page)).toEqual(['Row 6', 'Row 7', 'Row 10']);
  await expect.poll(() => announcements(page)).toContain('row 4 revealed');
  await solve(page, bat);
});

test('gremlin: fog waves land on unsolved rows as it turns Overcharged, then Blackout', async ({
  page,
}) => {
  await fight(page, 'first-job', 3);
  const wrench = encounterSolution('gremlin');
  await expect.poll(() => fogged(page)).toHaveLength(3);
  const forms = new Set<string>();
  for (const r of [0, 2, 5, 6, 11, 12, 13, 1, 7, 14, 4, 9]) {
    if ((await fogged(page)).includes(`Row ${r + 1}`)) continue;
    await fillRow(page, wrench, r);
    forms.add((await page.locator('.battle-side.enemy .battle-name').textContent())!);
  }
  expect([...forms]).toEqual(expect.arrayContaining(['Overcharged Gremlin', 'Blackout Gremlin']));
  expect((await fogged(page)).length).toBeGreaterThan(3);
  await solve(page, wrench);
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText(
    'Blackout Gremlin defeated!',
  );
});

test('mimic: swaps two of your rows, and cleaning up costs no HP', async ({ page }) => {
  await fight(page, 'night-shift', 0);
  const chest = encounterSolution('mimic');
  for (const c of [1, 2, 3]) await cell(page, 10 * 15 + c).tap(); // progress in row 11
  for (let r = 0; r <= 4; r++) await fillRow(page, chest, r);
  await expect.poll(() => announcements(page)).toMatch(/swapped rows \d+ and \d+/);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  const hp = await meter(page, 'player-hp');
  await solve(page, chest);
  expect(await meter(page, 'player-hp')).toBe(hp);
});

test('clockwork owl: scrambled clues show sorted and restore when solved', async ({ page }) => {
  await fight(page, 'night-shift', 1);
  const owl = encounterSolution('clockwork-owl');
  await expect(page.locator('.clue.scrambled')).toHaveCount(7);
  const row6 = page.locator('.row-clue').nth(5);
  await expect(row6).toHaveText(/1\D*1\D*1\D*2\D*2/);
  await fillRow(page, owl, 5);
  await expect(row6).toHaveText(/2\D*1\D*1\D*1\D*2/);
  await expect.poll(() => announcements(page)).toContain('Gears click back into place');
  await solve(page, owl);
});

test('armored beetle: armor blocks lines and hits harder until the weak points break it', async ({
  page,
}) => {
  await fight(page, 'night-shift', 3, { hp: 12, maxHp: 12 });
  const beetle = encounterSolution('armored-beetle');
  await expect(page.locator('.clue.weak-point')).toHaveCount(3);
  await fillRow(page, beetle, 0);
  expect(await meter(page, 'enemy-hp')).toBe(45);
  await cell(page, 15 + beetle[1].indexOf('.')).tap(); // a mistake while armored
  expect(await meter(page, 'player-hp')).toBe(8);
  await fillRow(page, beetle, 8);
  await fillRow(page, beetle, 11);
  for (let r = 0; r < 15; r++)
    if (beetle[r][2] === '#' && (await boardState(page))[r * 15 + 2] !== '#')
      await cell(page, r * 15 + 2).tap();
  await expect(page.locator('.armor')).toBeHidden();
  await expect.poll(() => announcements(page)).toContain('armor breaks');
  await cell(page, 3 * 15 + beetle[3].indexOf('.')).tap(); // softer hit now
  expect(await meter(page, 'player-hp')).toBe(6);
  await solve(page, beetle);
});

test('gadgets: a patch kit blocks a hit and the dig hands over a bomb', async ({ page }) => {
  await fight(page, 'first-job', 0, { hp: 12, maxHp: 12, gadgets: ['patch-kit'] });
  await page.locator('.gadget').tap();
  await expect(page.locator('.shield')).toBeVisible();
  await cell(page, 0).tap();
  expect(await meter(page, 'player-hp')).toBe(12);
  await solve(page, encounterSolution('goblin'));
  await press(page, 'Back to map');
  await page.locator('.node.current .node-body').tap();
  await solve(page, encounterSolution('dig-site'));
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('Bomb');
  await press(page, 'Back to map');
  await expect(page.locator('.inventory')).toContainText('Bomb');
});
