import { expect, test, type Page } from '@playwright/test';
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
    'Closing Time',
  ]);
  await expect(page.locator('.chapter.locked')).toHaveCount(0);
  await expect(page.locator('.dialogue')).toBeHidden(); // openings are marked seen

  await openPanel(page);
  await press(page, 'Reset everything');
  await expect(page.locator('.run-banner')).toContainText('1 of 7 jobs open');
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
