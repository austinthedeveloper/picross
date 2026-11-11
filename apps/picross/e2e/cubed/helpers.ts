import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { skipScene } from '@picross/play-block/e2e/helpers';

// The block helpers both games' browser tests use; runAt below is Cubed's own story run.
export * from '@picross/play-block/e2e/helpers';

/** The story's data (encounters, jobs), in the story package. */
const STORY = path.join(import.meta.dirname, '../../../../packages/story/src/puzzles');

/**
 * Starts straight at one encounter of a job: seeds the run save, then opens the
 * encounter (skipping its entrance scene if it has one).
 */
export async function runAt(
  page: Page,
  jobId: string,
  node: number,
  opts: { mode?: 'relaxed' | 'hearts'; hp?: number; gadgets?: string[] } = {},
): Promise<void> {
  const job = JSON.parse(fs.readFileSync(path.join(STORY, 'runs', `${jobId}.json`), 'utf8'));
  const run = {
    runId: jobId,
    node,
    hp: opts.hp ?? job.hp,
    maxHp: job.hp,
    gadgets: opts.gadgets ?? job.gadgets ?? [],
    status: 'active',
    mode: opts.mode ?? 'relaxed',
    tally: { mistakes: 0, hintsUsed: 0, gadgetsUsed: 0 },
  };
  await page.goto('/#/cubed');
  // Cubed's run is `block` in the one run save (#155).
  await page.evaluate((save) => localStorage.setItem('picross:run', JSON.stringify(save)), {
    current: null,
    block: { current: run },
    seenScenes: [],
    seenTips: [],
    jobs: {},
  });
  // Saves are read once when the app loads, so load it again with the run in place. A new
  // query makes it a real page load (a bare hash change could redirect first).
  await page.goto('/?seeded#/cubed/story/play');
  await skipScene(page);
  await page.locator('canvas.block-canvas').waitFor();
}
