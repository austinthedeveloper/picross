import { expect, test, type Page } from '@playwright/test';
import { breakCubes, encounterPuzzle, extras, focusBlock, shapeCubes } from './helpers';

/** Plays the current encounter by breaking every cube that isn't the shape. */
async function clearEncounter(page: Page, encounter: string) {
  await page.getByRole('link', { name: /current/ }).click();
  // A boss's entrance scene may play first.
  const skip = page.getByRole('button', { name: 'Skip ⏭' });
  await Promise.race([
    page.locator('canvas.block-canvas').waitFor(),
    skip.waitFor().then(() => skip.click()),
  ]);
  const puzzle = encounterPuzzle(encounter);
  await focusBlock(page);
  await breakCubes(page, puzzle, extras(puzzle));
  await expect(page.locator('.end-panel h2')).toHaveText(/Cleared|Boss down/);
}

test('the story card leads to the jobs board, chapters and all', async ({ page }) => {
  await page.goto('/');
  await page.locator('.story-card').click();
  // The first chapter's opening scene plays on the first visit.
  const skip = page.getByRole('button', { name: 'Skip ⏭' });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible();
  await expect(page.getByText('Chapter 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First Job' })).toBeVisible();
  await expect(page.locator('.chapter.locked').first()).toContainText('Clear First Job');
});

test('the First Job, from the intro to the results', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/#/story');
  const skip = page.getByRole('button', { name: 'Skip ⏭' });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
  await page
    .locator('.run-card')
    .filter({ hasText: 'First Job' })
    .getByRole('button', { name: 'Start' })
    .click();
  // The intro plays once.
  await skip.click();
  await expect(page.locator('.run-path .node')).toHaveCount(5);

  await clearEncounter(page, 'goblin');
  await page.getByRole('link', { name: 'Back to map →' }).click();
  await clearEncounter(page, 'dig-site');
  await expect(page.locator('.end-note')).toContainText('You got');
  await page.getByRole('link', { name: 'Back to map →' }).click();
  await expect(page.locator('.inventory')).toContainText('Bomb');
  await clearEncounter(page, 'fog-bat');
  await page.getByRole('link', { name: 'Back to map →' }).click();
  await clearEncounter(page, 'tea-break');
  await page.getByRole('link', { name: 'Back to map →' }).click();
  await clearEncounter(page, 'gremlin');
  await page.getByRole('link', { name: 'See results →' }).click();
  await expect(page.getByRole('heading', { name: 'Job done!' })).toBeVisible();
  await expect(page.locator('.sign-off').first()).toBeVisible();

  // Back on the board, the job is cleared and chapter 2 opens (with its opening scene).
  await page.getByRole('button', { name: 'Jobs board' }).click();
  await skip.click();
  await expect(page.locator('.run-card').filter({ hasText: 'First Job' })).toContainText(
    'Cleared 1×',
  );
});

test('with Hits on, breaking the shape costs HP, and a reload resumes the encounter', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hearts' }).click();
  await page.goto('/#/story');
  const skip = page.getByRole('button', { name: 'Skip ⏭' });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
  await page
    .locator('.run-card')
    .filter({ hasText: 'First Job' })
    .getByRole('button', { name: 'Start' })
    .click();
  await skip.click();
  await expect(page.locator('.run-mode-label')).toHaveText('♥ Hits on');
  await page.getByRole('link', { name: /current/ }).click();
  const goblin = encounterPuzzle('goblin');
  await focusBlock(page);
  await breakCubes(page, goblin, shapeCubes(goblin).slice(0, 1));
  await breakCubes(page, goblin, extras(goblin).slice(0, 2));
  await expect(page.locator('.coach')).not.toContainText('HP 12/12');
  await page.reload();
  await page.getByRole('link', { name: '← Map' }).click();
  await expect(page.locator('.hp-label')).not.toHaveText('HP 12/12');
  await expect(page.locator('.node.current')).toContainText('Continue');
});
