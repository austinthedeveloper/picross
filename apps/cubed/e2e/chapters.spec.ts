import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { encounterPuzzle, extras, moveTo, focusBlock } from './helpers';

/**
 * Every chapter, from its opening scene through each of its jobs to the boss. Each
 * encounter starts from a board one cube short of solved (seeded into the run save), so
 * the test checks the flow, not hundreds of keypresses; the fight is seeded past its
 * phases, so the last break always solves it.
 */
// The story's chapters and jobs, in the shared package.
const ROOT = path.join(import.meta.dirname, '../../../packages/shared/src/puzzles');
const read = (dir: string, id: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, dir, `${id}.json`), 'utf8'));
const chapters = fs
  .readdirSync(path.join(ROOT, 'chapters'))
  .map((f) => read('chapters', f.replace('.json', '')))
  .sort((a, b) => a.order - b.order);

const skip = async (page: Page) => {
  const button = page.getByRole('button', { name: 'Skip ⏭' });
  if (await button.isVisible({ timeout: 2000 }).catch(() => false)) await button.click();
};

/** Puts a nearly solved board (and a fight with nothing left to do) into the current run. */
async function seedNearlySolved(page: Page, encounter: string): Promise<number> {
  const puzzle = encounterPuzzle(encounter);
  const left = extras(puzzle);
  const last = left[left.length - 1];
  const blocks = [...puzzle.solution].map((c, i) => (c || i === last ? '0' : '2')).join('');
  const lines = puzzle.lines.map((l) => l.id);
  await page.evaluate(
    ({ blocks, lines }) => {
      const save = JSON.parse(localStorage.getItem('picross3d:run')!);
      save.current.board = { blocks };
      save.current.battle = {
        enemyHp: 1,
        maxHp: 1,
        phase: 99,
        struck: lines,
        fog: [],
        scramble: [],
        targets: [],
        armorLines: 0,
        suspects: [],
        fakes: [],
        forged: {},
        ink: [],
        swapped: [],
        shield: 0,
        seed: 1,
        counts: { mistakes: 0, zaps: 0, wrongAccusations: 0, gadgetsUsed: 0 },
      };
      localStorage.setItem('picross3d:run', JSON.stringify(save));
    },
    { blocks, lines },
  );
  await page.reload();
  return last;
}

for (const chapter of chapters) {
  test(`chapter ${chapter.order}: ${chapter.title}, from its opening to its boss`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    // Every earlier job won, so this chapter is open.
    const before = chapters.filter((c) => c.order < chapter.order);
    const earlier = before.flatMap((c) => c.jobs);
    // Their openings were seen back then.
    const seen = before.flatMap((c) => (c.opening ? [c.opening] : []));
    await page.goto('/');
    await page.evaluate(
      ({ jobs, seen }) =>
        localStorage.setItem(
          'picross3d:run',
          JSON.stringify({
            current: null,
            seenScenes: seen,
            seenTips: ['fog', 'scramble', 'armor', 'fakes', 'charge', 'ink', 'swap', 'rotate'],
            jobs: Object.fromEntries(jobs.map((j: string) => [j, { plays: 1, wins: 1 }])),
          }),
        ),
      { jobs: earlier, seen },
    );
    await page.goto('/#/story');
    await page.reload();
    // The chapter's opening (if it has one) plays on the way in.
    await skip(page);
    await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible();

    for (const jobId of chapter.jobs) {
      const job = read('runs', jobId);
      await page
        .locator('.run-card')
        .filter({ hasText: job.name })
        .first()
        .getByRole('button', { name: 'Start', exact: true })
        .click();
      await skip(page);
      await expect(page.locator('.run-path .node')).toHaveCount(job.encounters.length);
      for (const [i, encounter] of job.encounters.entries()) {
        const last = await seedNearlySolved(page, encounter);
        await page.locator('.node.current a').click();
        await skip(page);
        await focusBlock(page);
        await moveTo(page, encounterPuzzle(encounter), last);
        await page.keyboard.press('x');
        await expect(page.locator('.end-panel h2')).toHaveText(/Cleared|Boss down/);
        const done = i === job.encounters.length - 1;
        await page.getByRole('link', { name: done ? 'See results →' : 'Back to map →' }).click();
      }
      await expect(page.getByRole('heading', { name: 'Job done!' })).toBeVisible();
      await page.getByRole('button', { name: 'Jobs board' }).click();
      await skip(page);
      const card = page.locator('.run-card').filter({ hasText: job.name }).first();
      await expect(card).toContainText('Cleared');
      // A cleared job offers its Overtime and any boss fight it unlocks.
      const extras = fs
        .readdirSync(path.join(ROOT, 'runs'))
        .map((f) => read('runs', f.replace('.json', '')))
        .filter((r) => r.overtimeOf === jobId || r.bossOf === jobId);
      for (const extra of extras) {
        await expect(card).toContainText(extra.overtimeOf ? 'Overtime' : 'Boss fight');
      }
    }
  });
}
