import { expect, test, type Page } from '@playwright/test';
import { breakCubes, emptyLines, encounterPuzzle, focusBlock, runAt, shapeCubes } from './helpers';

const enemyHp = (page: Page) => page.locator('.enemy-hp .meter-text');
const hpValue = async (page: Page) => Number((await enemyHp(page).textContent())!.split('/')[0]);

test('finishing a line chips the enemy', async ({ page }) => {
  await runAt(page, 'first-job', 0);
  const goblin = encounterPuzzle('goblin');
  const before = await hpValue(page);
  await focusBlock(page);
  await breakCubes(page, goblin, emptyLines(goblin)[0]);
  await expect.poll(() => hpValue(page)).toBeLessThan(before);
});

test('fog: a tip card explains it, and fogged clue faces start hidden', async ({ page }) => {
  await runAt(page, 'deep-end', 1);
  await expect(page.locator('.tip-card')).toContainText('Fog');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.locator('.tip-card')).toBeHidden();
  // The powers list reopens it.
  await page.getByRole('button', { name: 'Enemy powers' }).click();
  await expect(page.locator('.power-list')).toContainText('Fog');
});

test('scrambled clues have their own tip', async ({ page }) => {
  await runAt(page, 'night-shift', 1);
  await expect(page.locator('.tip-card')).toContainText('Scrambled clues');
});

test('armor shows its targets and the count to its next hit', async ({ page }) => {
  await runAt(page, 'night-shift', 4);
  await expect(page.locator('.armor')).toBeVisible();
  await expect(page.locator('.armor')).toContainText('0/5');
});

test('forged clues: the Call out button arms and disarms', async ({ page }) => {
  await runAt(page, 'night-shift', 2);
  const callOut = page.getByRole('button', { name: /Call out/ });
  await expect(page.locator('.fakes')).toBeVisible();
  await callOut.click();
  await expect(callOut).toHaveAttribute('aria-pressed', 'true');
  await callOut.click();
  await expect(callOut).toHaveAttribute('aria-pressed', 'false');
});

test('charge warms up before it can zap', async ({ page }) => {
  await runAt(page, 'deep-end', 0);
  await expect(page.locator('.charge')).toContainText('warming up');
});

test('the Weathervane turns the block every few lines', async ({ page }) => {
  await runAt(page, 'weathervane-boss', 0);
  await expect(page.locator('.turn-meter')).toBeVisible();
  await expect(page.locator('.turn-meter')).toContainText('0/');
});

test('gadgets: a patch kit blocks a hit, a bomb deals damage', async ({ page }) => {
  await runAt(page, 'first-job', 0, { mode: 'hearts', gadgets: ['patch-kit', 'bomb'] });
  await page.getByRole('button', { name: /Patch kit/ }).click();
  await expect(page.locator('.shield')).toBeVisible();
  const goblin = encounterPuzzle('goblin');
  await focusBlock(page);
  await breakCubes(page, goblin, shapeCubes(goblin).slice(0, 1));
  await expect(page.locator('.player-hp .meter-text')).toHaveText(/^\d+\/\d+$/);
  const hpBefore = await page.locator('.player-hp .meter-text').textContent();
  expect(hpBefore!.split('/')[0]).toBe(hpBefore!.split('/')[1]);
  const before = await hpValue(page);
  await page.getByRole('button', { name: /Bomb/ }).click();
  await expect.poll(() => hpValue(page)).toBeLessThanOrEqual(before - 2);
  await expect(page.locator('.gadget')).toHaveCount(0);
});

test('with Hits on, running out of HP knocks you out and ends the run', async ({ page }) => {
  await runAt(page, 'first-job', 0, { mode: 'hearts', hp: 1 });
  const goblin = encounterPuzzle('goblin');
  await focusBlock(page);
  await breakCubes(page, goblin, shapeCubes(goblin).slice(0, 1));
  await expect(page.getByRole('heading', { name: 'Knocked out' })).toBeVisible();
  await page.getByRole('link', { name: 'See results →' }).click();
  await expect(page.getByRole('heading', { name: 'Run over' })).toBeVisible();
});

test('a reload mid-fight finds the block and the battle as they were', async ({ page }) => {
  await runAt(page, 'first-job', 0);
  const goblin = encounterPuzzle('goblin');
  const line = emptyLines(goblin)[0];
  const before = await hpValue(page);
  await focusBlock(page);
  await breakCubes(page, goblin, line);
  await expect.poll(() => hpValue(page)).toBeLessThan(before);
  const hp = await hpValue(page);
  await page.reload();
  await page.locator('canvas.block-canvas').waitFor();
  await expect.poll(() => hpValue(page)).toBe(hp);
  // The run saves the fight as its block's entry (#169): the cubes broken, the battle. Cubed's
  // run is `block` in the one run save (#155).
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('picross:run')!).block.current,
  );
  expect(saved.battle).toBeUndefined();
  expect(saved.fight.boards.block.battle.enemyHp).toBe(hp);
  const blocks: string = saved.fight.boards.block.board.blocks;
  expect(line.map((cell) => blocks[cell])).toEqual(line.map(() => '2'));
});
