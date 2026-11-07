import { expect, test, type Page } from '@playwright/test';
import type { Line } from '../src/engine/lines';
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
  solutionFromClues,
  press,
} from './helpers';

/** Opens a run straight at one encounter, in a Hits-on run. */
async function fight(page: Page, runId: string, node: number, extra = {}) {
  await seed(page.context(), {
    run: {
      seenScenes: ['first-job-intro', 'night-shift-intro', 'deep-end-intro', 'tess-reveal'],
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
  await fight(page, 'first-job', 4);
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

test('mimic: wipes two whole lines, marks them until refilled, and refilling costs no HP', async ({
  page,
}) => {
  await fight(page, 'night-shift', 0);
  const chest = encounterSolution('mimic');
  for (const c of [1, 2, 3]) await cell(page, 10 * 15 + c).tap(); // progress in row 11
  for (let r = 0; r <= 6; r++) await fillRow(page, chest, r); // down to 85%
  await expect
    .poll(() => announcements(page))
    .toMatch(/swapped (rows|columns) \d+ and \d+ and ate \d+ marks/);
  await expect(page.locator('.clue.wiped')).toHaveCount(2);
  await expect(page.locator('.tip-card')).toContainText('Swaps.'); // the phase's power, once
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  // Refilling one wiped row clears its mark; the other stays.
  const wipedRow = await page.$$eval('.row-clue', (gs) =>
    gs.findIndex((g) => g.classList.contains('wiped')),
  );
  if (wipedRow >= 0) {
    await fillRow(page, chest, wipedRow);
    await expect(page.locator('.clue.wiped')).toHaveCount(1);
  }
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

test('forger: 🎭 suspects settle by logic; call out the fakes, not the honest ones', async ({
  page,
}) => {
  await fight(page, 'night-shift', 2);
  const palette = encounterSolution('forger');
  const rowClue = (r: number) => page.locator('.row-clue').nth(r);
  const suspects = page.locator('.clue.suspect');
  await expect(suspects).toHaveCount(5); // rows 3, 4, 7, 8, 14: three fakes, two honest
  await expect(page.locator('.battle .fakes')).toHaveText('3');
  await expect(rowClue(3)).toHaveText(/^6\D*7$/); // really 3 2 7

  // Only 🎭 clues can be accused: tapping another one costs nothing.
  await press(page, 'Call out');
  await rowClue(0).tap();
  await expect.poll(() => announcements(page)).toContain("Row 1 isn't a suspect.");
  expect(await meter(page, 'player-hp')).toBe(14);
  await press(page, 'Pick a clue');

  // An honest suspect, solved from the columns, lights up and loses its 🎭.
  await fillRow(page, palette, 2);
  await expect(suspects).toHaveCount(4);
  await expect.poll(() => announcements(page)).toContain('Row 3 checks out: honest.');

  // A forged one filled correctly stays dark, until you call it out.
  const hp = await meter(page, 'enemy-hp');
  await fillRow(page, palette, 7);
  expect(await meter(page, 'enemy-hp')).toBe(hp);
  await press(page, 'Call out');
  await rowClue(7).tap();
  await expect.poll(() => announcements(page)).toContain('Row 8 was a forgery');
  await expect(rowClue(7)).toHaveText(/^2\D*9$/);
  expect(await meter(page, 'enemy-hp')).toBe(hp - 6); // 5 for the call-out, 1 for the line
  await expect(suspects).toHaveCount(3);

  // Accusing an honest suspect hurts, but settles it.
  await press(page, 'Call out');
  await rowClue(6).tap();
  await expect.poll(() => announcements(page)).toContain('Row 7 was honest!');
  expect(await meter(page, 'player-hp')).toBe(12);
  await expect(suspects).toHaveCount(2);

  await solve(page, palette);
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('defeated');
});

test('armored beetle: armor blocks lines and hits harder until the weak points break it', async ({
  page,
}) => {
  await fight(page, 'night-shift', 4, { hp: 12, maxHp: 12 });
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

test('armor hits back every 5 other lines, and breaking it stops the count', async ({ page }) => {
  await fight(page, 'night-shift', 4, { hp: 12, maxHp: 12 });
  const beetle = encounterSolution('armored-beetle');
  await expect(page.locator('.armor')).toContainText('0/5');
  for (const r of [0, 1, 2, 3]) await fillRow(page, beetle, r);
  await expect(page.locator('.armor')).toContainText('4/5');
  expect(await meter(page, 'player-hp')).toBe(12);
  await fillRow(page, beetle, 4);
  await expect.poll(() => meter(page, 'player-hp')).toBe(10);
  await expect.poll(() => announcements(page)).toContain('hits back');
  await expect(page.locator('.armor')).toContainText('0/5');

  // The count survives a reload.
  await fillRow(page, beetle, 5);
  await page.reload();
  await skipScene(page);
  await expect(page.locator('.armor')).toContainText('1/5');

  // Armor gone: no more hits, however many lines you finish.
  await fillRow(page, beetle, 8);
  await fillRow(page, beetle, 11);
  for (let r = 0; r < 15; r++)
    if (beetle[r][2] === '#' && (await boardState(page))[r * 15 + 2] !== '#')
      await cell(page, r * 15 + 2).tap();
  await expect(page.locator('.armor')).toBeHidden();
  await solve(page, beetle);
  expect(await meter(page, 'player-hp')).toBe(10);
});

test('armor hits back only as a fizzle in a Relaxed run', async ({ page }) => {
  await fight(page, 'night-shift', 4, { hp: 12, maxHp: 12, mode: 'relaxed' });
  const beetle = encounterSolution('armored-beetle');
  for (const r of [0, 1, 2, 3, 4]) await fillRow(page, beetle, r);
  await expect.poll(() => announcements(page)).toContain('fizzles');
  expect(await meter(page, 'player-hp')).toBe(12);
});

test('bomb: 2 damage and a blast of revealed cells that survives a reload', async ({ page }) => {
  await fight(page, 'night-shift', 0, { hp: 14, maxHp: 14, gadgets: ['bomb'] });
  const before = await meter(page, 'enemy-hp');
  await page.locator('.gadget').tap();
  expect(await meter(page, 'enemy-hp')).toBe(before - 2);
  expect(await meter(page, 'player-hp')).toBe(14);
  await expect(page.locator('.gadget')).toHaveCount(0);
  // A 5×5 blast on an empty 15×15: every cell in it shows the truth.
  const shown = async () => (await boardState(page)).filter((c) => c !== '.').length;
  await expect.poll(shown).toBe(25);
  const revealed = await boardState(page);
  const rows = encounterSolution('mimic');
  revealed.forEach((c, i) => {
    if (c !== '.') expect(c).toBe(rows[Math.floor(i / 15)][i % 15] === '#' ? '#' : 'x');
  });

  await page.reload();
  await skipScene(page);
  await expect(page.locator('.battle')).toBeVisible();
  expect(await boardState(page)).toEqual(revealed);
  await expect(page.locator('.gadget')).toHaveCount(0);
});

test("bomb: a phase it starts can't cover what the blast reveals", async ({ page }) => {
  // The Cuttlefish's first ink lands at 40 HP, so this bomb sets it off.
  await fight(page, 'deep-end', 3, {
    hp: 16,
    maxHp: 16,
    gadgets: ['bomb'],
    battle: { enemyHp: 42, struck: [] },
  });
  await page.locator('.gadget').tap();
  const shown = () => page.locator('.cell.filled, .cell.marked');
  await expect(shown()).toHaveCount(25);
  await expect(page.locator('.cell.inked.filled, .cell.inked.marked')).toHaveCount(0);
});

test('bomb: still works at 1 HP, and a blast can land the finisher', async ({ page }) => {
  const rows = encounterSolution('goblin');
  // Every cell shows the truth except one, so the blast has to land on it, and that wins.
  const missing = rows.join('').indexOf('#');
  const cells = [...rows.join('')]
    .map((c, i) => (i === missing ? '0' : c === '#' ? '1' : '2'))
    .join('');
  await fight(page, 'first-job', 0, {
    hp: 12,
    maxHp: 12,
    gadgets: ['bomb'],
    battle: { enemyHp: 1, struck: [] },
    board: { cells, elapsed: 0, mode: 'battle' },
  });
  await expect(page.locator('.gadget')).toBeEnabled();
  await page.locator('.gadget').tap();
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('defeated');
  expect(await meter(page, 'player-hp')).toBe(12);
});

test('electric eel: the charge warms up before any line goes live', async ({ page }) => {
  await fight(page, 'deep-end', 0);
  const eel = encounterSolution('electric-eel');
  const charge = page.locator('.battle .charge');
  await expect(charge).toBeVisible();
  await expect(charge).toContainText('Warming up · 8 lines');
  await expect(page.locator('.clue.live')).toHaveCount(0);

  // Lines finished in the warm-up count down to the first live line and never zap.
  await fillRow(page, eel, 0);
  await expect(charge).toContainText(/Warming up · [1-7] lines?/);
  for (let r = 1; r < eel.length; r++) {
    if (await page.locator('.clue.live').count()) break;
    await fillRow(page, eel, r);
  }
  await expect(page.locator('.clue.live')).toHaveCount(1);
  await expect(charge).toContainText('5 left');
  expect(await meter(page, 'player-hp')).toBe(14);
});

test('electric eel: thinking is free, other lines charge it, the live line grounds it', async ({
  page,
}) => {
  await page.clock.install();
  // Past the warm-up, so a line is live from the start.
  await fight(page, 'deep-end', 0, { battle: { enemyHp: 45, struck: [], warmUp: 0 } });
  const eel = encounterSolution('electric-eel');
  const charge = page.locator('.battle .charge');
  const level = () => charge.evaluate((e) => Number(e.style.getPropertyValue('--charge')));
  const live = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('picross:run')!).current.battle.live as Line | undefined,
    );
  await expect(charge).toBeVisible();
  await expect(page.locator('.clue.live')).toHaveCount(1);
  await expect(charge).toContainText('5 left');

  // Five minutes of staring at the board costs nothing.
  await page.clock.runFor(300_000);
  expect(await level()).toBe(0);
  expect(await meter(page, 'player-hp')).toBe(14);
  await page.clock.resume();

  // Finishing other lines charges it, and at five it zaps for 2.
  const aimedAt = (await live())!;
  const rows = eel.map((_, r) => r).filter((r) => aimedAt.kind !== 'row' || r !== aimedAt.index);
  const before = await level();
  await fillRow(page, eel, rows[0]);
  await expect.poll(level).toBeGreaterThan(before);

  // It survives a reload.
  const midway = await level();
  await page.reload();
  await expect(charge).toBeVisible();
  expect(await level()).toBe(midway);
  await expect(page.locator('.clue.live')).toHaveCount(1);

  for (const r of rows.slice(1)) {
    await fillRow(page, eel, r);
    if ((await meter(page, 'player-hp')) < 14) break;
  }
  await expect.poll(() => meter(page, 'player-hp')).toBe(12);
  await expect.poll(() => announcements(page)).toContain('Electric Eel zaps you!');
  await expect.poll(level).toBeLessThan(1);

  // A new line went live. Finishing it grounds the charge.
  const next = (await live())!;
  const n = eel[0].length;
  const cells =
    next.kind === 'row'
      ? [...eel[0]].map((_, c) => next.index * n + c)
      : eel.map((_, r) => r * n + next.index);
  const board = await boardState(page);
  for (const i of cells) {
    if (eel[Math.floor(i / n)][i % n] === '#' && board[i] !== '#') await cell(page, i).tap();
  }
  await expect.poll(() => announcements(page)).toContain('Grounded!');
  await expect.poll(level).toBe(0);
  expect(await meter(page, 'player-hp')).toBe(12);
});

test('cuttlefish: ink hides your marks, lines wash it off, and a sponge wipes it', async ({
  page,
}) => {
  await fight(page, 'deep-end', 3, { gadgets: ['sponge'] });
  const cuttle = encounterSolution('cuttlefish');
  const inked = page.locator('.cell.inked');
  await expect(page.getByRole('button', { name: /Use Sponge/ })).toBeDisabled();
  for (let r = 0; r <= 4; r++) await fillRow(page, cuttle, r); // down to 90%: ink
  await expect(inked).toHaveCount(16);
  const firstInked = Number(await inked.first().getAttribute('data-i'));
  await fillRow(page, cuttle, Math.floor(firstInked / 15));
  await expect(inked).toHaveCount(12);
  await expect.poll(() => announcements(page)).toContain('The ink washes away.');
  await press(page, 'Use Sponge');
  await expect(inked).toHaveCount(0);
  await solve(page, cuttle);
});

test('power tips: explained once, and the ⓘ lists an enemy’s powers anytime', async ({ page }) => {
  await fight(page, 'first-job', 2); // the fog bat
  const tip = page.locator('.tip-card');
  await expect(tip).toContainText('Fog. Some clues are hidden.');
  await press(page, 'Got it');
  await expect(tip).toBeHidden();
  await page.reload();
  await expect(page.locator('.battle')).toBeVisible();
  await expect(tip).toBeHidden(); // seen: it doesn't come back

  await page.getByRole('button', { name: 'What can Fog bat do?' }).tap();
  await expect(page.locator('.tip-card.powers')).toContainText('Fog.');
  await press(page, 'Close');
  await expect(tip).toBeHidden();
});

test('weathervane: the board turns a quarter clockwise, marks, clues and undo and all', async ({
  page,
}) => {
  // An Endless run of just the Weathervane, so it can be seeded mid-fight. Row 1 is one
  // cell short, and the next finished line turns the board.
  const vane = encounterSolution('weathervane');
  const n = vane.length;
  const missing = vane[0].indexOf('#');
  const cells = [...vane.join('')]
    .map((c, i) => (i < n && i !== missing && c === '#' ? '1' : '0'))
    .join('');
  await fight(page, 'endless', 0, {
    mode: 'relaxed',
    endless: { seed: 0, fights: ['weathervane'], digs: [], rests: [] },
    battle: { enemyHp: 45, struck: [], turning: 5 },
    board: { cells, elapsed: 0, mode: 'relaxed' },
  });
  const turnMeter = page.locator('.battle .turn-meter');
  await expect(turnMeter).toContainText('Turns in 1 line');
  await expect(page.locator('.tip-card')).toContainText('Turns. Every few lines');

  // Row 1 lands in column 15, read top to bottom, and its clue goes with it.
  await cell(page, missing).tap();
  await expect.poll(() => announcements(page)).toContain('The board turns a quarter clockwise.');
  const filled = [...vane[0]].flatMap((c, col) => (c === '#' ? [col * n + n - 1] : []));
  const turned = Array.from({ length: n * n }, (_, i) => (filled.includes(i) ? '#' : '.'));
  await expect.poll(() => boardState(page)).toEqual(turned);
  await expect(page.locator('.col-clue').nth(n - 1)).toHaveText('2');
  await expect(turnMeter).toContainText('Turns in 6 lines');

  // Undo follows the cell you tapped to where it turned.
  await press(page, 'Undo');
  await expect(cell(page, missing * n + n - 1)).not.toHaveClass(/filled/);
  await press(page, 'Redo');
  await expect(cell(page, missing * n + n - 1)).toHaveClass(/filled/);

  // A reload comes back turned.
  await page.reload();
  await expect(page.locator('.battle')).toBeVisible();
  await expect.poll(() => boardState(page)).toEqual(turned);
  await expect(page.locator('.col-clue').nth(n - 1)).toHaveText('2');
  const turns = await page.evaluate(
    () => JSON.parse(localStorage.getItem('picross:run')!).current.battle.turns,
  );
  expect(turns).toBe(1);

  // Solve it from the clues on screen, a row at a time: the board keeps turning.
  const done = () => page.locator('.end-panel:not([hidden])').isVisible();
  for (let pass = 0; pass < 100 && !(await done()); pass++) {
    const rows = await solutionFromClues(page);
    const state = await boardState(page);
    const wrong = [...Array(n * n).keys()].filter(
      (i) => (rows[Math.floor(i / n)][i % n] === '#') !== (state[i] === '#'),
    );
    const r = Math.floor(wrong[0] / n);
    for (const i of wrong.filter((i) => Math.floor(i / n) === r)) {
      if (state[i] === 'x') await cell(page, i).tap();
      await cell(page, i).tap();
    }
  }
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('defeated');
});
