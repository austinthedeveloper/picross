import { expect, test, type Page } from '@playwright/test';
import { lineClues } from '@picross/grid/engine/clues';
import { fakeClue } from '@picross/grid/engine/fakes';
import { cell, encounterSolution, meter, press, seed, skipScene } from './helpers';

// Runs against a dev build (see playwright.config.ts); production has none of this.

const openPanel = (page: Page) => page.getByRole('button', { name: 'Debug tools' }).tap();

async function jump(page: Page, job: string, node: number) {
  await page.getByLabel('Job').selectOption(job);
  await page.getByLabel('Encounter').selectOption(String(node));
  await press(page, 'Go');
  await skipScene(page);
}

test('the dev build shows it, and unlock and reset work', async ({ page }) => {
  await page.goto('/#/');
  await expect(page).toHaveTitle(/^DEV /);
  await openPanel(page);
  await press(page, 'Unlock everything');
  await expect(page.locator('.job h3')).toHaveText([
    'First Job',
    'The Night Shift',
    'The Deep End',
    'The Glasshouse',
    'The Midway',
    'Summit Station',
    'The Night Mail',
    'The Undercroft',
    'The Annex',
    'Closing Time',
  ]);
  await expect(page.locator('.chapter.locked')).toHaveCount(0);
  await expect(page.locator('.dialogue')).toBeHidden(); // openings are marked seen

  await openPanel(page);
  await press(page, 'Reset everything');
  await expect(page.locator('.run-banner')).toContainText('1 of 10 jobs open');
});

test('jump to a boss, force a phase, deal damage, and solve the board', async ({ page }) => {
  await page.goto('/#/');
  await openPanel(page);
  await jump(page, 'night-shift', 6);
  await expect(page.locator('h1')).toHaveText('Museum Rex');
  await openPanel(page);
  await press(page, 'Next phase');
  await expect(page.locator('.battle-side.enemy .battle-name')).toHaveText('Wound-up Rex');
  const hp = await meter(page, 'enemy-hp');
  await press(page, 'Enemy −10');
  expect(await meter(page, 'enemy-hp')).toBe(hp - 10);
  await press(page, 'Solve board');
  await expect(page.locator('.end-panel:not([hidden]) .end-note')).toContainText('defeated');
});

/** What the real clues are hiding: the forgery each of these rows should keep showing. */
function forgedRows(encounter: string, rows: number[]) {
  const answer = encounterSolution(encounter);
  return rows.map((r) => ({
    row: r,
    numbers: fakeClue(lineClues([...answer[r]].map((c) => c === '#')), answer[r].length).map(
      String,
    ),
  }));
}

const clueNumbers = (page: Page, row: number) =>
  page.locator('.row-clue').nth(row).locator('span').allTextContents();

test('forged clues survive every phase of a fight that also scrambles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const forged = forgedRows('ringmaster', [0, 7]);

  await page.goto('/#/');
  await openPanel(page);
  await jump(page, 'midway', 5);
  await expect(page.locator('h1')).toHaveText('The Ringmaster');
  await expect(page.locator('.clue.scrambled')).toHaveCount(1);

  await openPanel(page);
  const phases = [
    { hp: 54, name: 'The Ringmaster', sprite: 'ringmaster', scrambled: 1 },
    { hp: 48, name: 'Grand Ringmaster', sprite: 'ringmaster', scrambled: 3 },
    { hp: 39, name: 'Grand Ringmaster', sprite: 'ringmaster', scrambled: 3 },
    { hp: 27, name: 'Showstopper', sprite: 'showstopper', scrambled: 3 },
  ];
  for (const { hp, name, sprite, scrambled } of phases) {
    await press(page, 'Next phase');
    expect(errors).toEqual([]);
    expect(await meter(page, 'enemy-hp')).toBe(hp);
    await expect(page.locator('.battle-side.enemy .battle-name')).toHaveText(name);
    await expect(page.locator('.enemy-sprite img')).toHaveAttribute(
      'src',
      `./art/enemies/${sprite}.png`,
    );
    await expect(page.locator('.clue.scrambled')).toHaveCount(scrambled);
    for (const { row, numbers } of forged) {
      expect(await clueNumbers(page, row)).toEqual(numbers);
    }
  }
  expect(errors).toEqual([]);
});

test('a fight with forged clues can start its phase and unscramble a clue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const forged = forgedRows('falling-star', [0, 12]);

  await page.goto('/#/');
  await openPanel(page);
  await jump(page, 'summit-station', 1);
  await expect(page.locator('h1')).toHaveText('Falling Star');
  await expect(page.locator('.clue.scrambled')).toHaveCount(2);

  // Solving a scrambled column restores it, on the same path as a phase change.
  const answer = encounterSolution('falling-star');
  const size = answer[0].length;
  for (let r = 0; r < answer.length; r++) {
    if (answer[r][5] === '#') await cell(page, r * size + 5).tap();
  }
  await expect(page.locator('.clue.scrambled')).toHaveCount(1);
  expect(errors).toEqual([]);
  const column = lineClues(answer.map((row) => row[5] === '#')).map(String);
  expect(await page.locator('.col-clue').nth(5).locator('span').allTextContents()).toEqual(column);

  await openPanel(page);
  await press(page, 'Next phase');
  await expect(page.locator('.battle-side.enemy .battle-name')).toHaveText('Blazing Star');
  for (const { row, numbers } of forged) {
    expect(await clueNumbers(page, row)).toEqual(numbers);
  }
  expect(errors).toEqual([]);
});

test('infinite health keeps your HP when the enemy hits', async ({ page, context }) => {
  await seed(context, { settings: { mode: 'hearts' } });
  await page.goto('/#/');
  await openPanel(page);
  await jump(page, 'first-job', 0);
  const goblin = encounterSolution('goblin');
  const wrong = goblin.join('').indexOf('.');
  await cell(page, wrong).tap();
  expect(await meter(page, 'player-hp')).toBeLessThan(12); // no cheat yet: it hurts

  const hp = await meter(page, 'player-hp');
  await openPanel(page);
  await page.getByLabel('Infinite health').check();
  await openPanel(page);
  await cell(page, goblin.join('').indexOf('.', wrong + 1)).tap();
  expect(await meter(page, 'player-hp')).toBe(hp);
});

test('win or lose the current run from anywhere', async ({ page }) => {
  await page.goto('/#/');
  await openPanel(page);
  await jump(page, 'first-job', 1);
  await openPanel(page);
  await press(page, 'Win run');
  await expect(page.locator('.results h2')).toHaveText('Job done!');
  await openPanel(page);
  await jump(page, 'first-job', 1);
  await openPanel(page);
  await press(page, 'Lose run');
  await expect(page.locator('.results h2')).toHaveText('Run over');
});
