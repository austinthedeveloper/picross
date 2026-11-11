import { expect, test } from '@playwright/test';
import {
  breakBlock,
  encounterSolution,
  press,
  savedPhase,
  seed,
  skipScene,
  solve,
} from './helpers';

const won = { plays: 1, wins: 1, bestHp: 10 };

/** Every job in board order, and the opening scene of the chapter that each job after the first starts. */
const ORDER = [
  'first-job',
  'night-shift',
  'deep-end',
  'glasshouse',
  'midway',
  'summit-station',
  'night-mail',
  'undercroft',
  'the-annex',
];
const OPENINGS = [
  'after-hours-opening',
  'deep-water-opening',
  'green-thumbs-opening',
  'step-right-up-opening',
  'cold-snap-opening',
  'end-of-the-line-opening',
  'below-stairs-opening',
  'peer-review-opening',
];

const JOBS = [
  {
    job: 'glasshouse',
    opening: 'Chapter 4: Green Thumbs',
    nodes: ['snapjaw', 'spore-puff', 'potting-shed', 'ironbark', 'garden-bench', 'mother-bramble'],
    gadget: { at: 'potting-shed', name: 'Sponge' },
    signOff: 'bad-tempered rose',
  },
  {
    job: 'midway',
    opening: 'Chapter 5: Step Right Up',
    nodes: [
      'funhouse-mirror',
      'madame-vesper',
      'prop-wagon',
      'great-bruno',
      'popcorn-stand',
      'ringmaster',
    ],
    gadget: { at: 'prop-wagon', name: 'Bomb' },
    signOff: 'happy to be bankrupt',
  },
  {
    job: 'summit-station',
    opening: 'Chapter 6: Cold Snap',
    nodes: ['whiteout', 'falling-star', 'supply-cache', 'ice-mammoth', 'cocoa-break', 'yeti'],
    gadget: { at: 'supply-cache', name: 'Patch kit' },
    signOff: 'taking off one coat',
  },
  {
    job: 'night-mail',
    opening: 'Chapter 7: End of the Line',
    nodes: [
      'signal-box',
      'ticket-inspector',
      'lost-property',
      'coal-heap',
      'station-buffet',
      'the-1159',
    ],
    gadget: { at: 'lost-property', name: 'Sponge' },
    signOff: 'Forty years late',
  },
  {
    job: 'undercroft',
    opening: 'Chapter 8: Below Stairs',
    nodes: ['rusted-sentry', 'cellar-ooze', 'wine-cellar', 'rat-king', 'guard-room', 'old-wyrm'],
    gadget: { at: 'wine-cellar', name: 'Bomb' },
    signOff: 'One flight of stairs',
  },
  {
    job: 'the-annex',
    opening: 'Chapter 9: Peer Review',
    nodes: [
      'spark-hound',
      'failed-clone',
      'supply-closet',
      'reviewer-two',
      'faculty-lounge',
      'ostrander',
    ],
    gadget: { at: 'supply-closet', name: 'Sponge' },
    signOff: 'back on the map',
  },
  {
    job: 'closing-time',
    opening: 'Wound Up',
    nodes: ['tin-soldier', 'dusty-exhibit', 'break-room', 'curator'],
    gadget: { at: 'dusty-exhibit', name: 'Patch kit' },
    signOff: 'back in his case',
  },
];

JOBS.forEach(({ job, opening, nodes, gadget, signOff }, i) => {
  const before = ORDER.slice(0, 3 + i);
  test(`the whole of ${job}, from its chapter opening to its boss`, async ({ page, context }) => {
    test.setTimeout(240_000);
    // An exception in a click handler doesn't fail a test or stop the solve, so watch for them.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await seed(context, {
      run: {
        seenScenes: ['first-job-intro', ...OPENINGS.slice(0, before.length - 1)],
        jobs: Object.fromEntries(before.map((id) => [id, won])),
      },
    });
    await page.goto('/#/run');
    await expect(page.locator('.dialogue')).toContainText(opening);
    await page.locator('.skip').tap();
    await page.locator('.job').nth(before.length).locator('text=Start').tap();
    await skipScene(page);

    const boss = nodes[nodes.length - 1];
    for (const id of nodes) {
      await page.locator('.node.current .node-body').tap();
      await skipScene(page);
      if (id === boss) await expect(page.locator('.cell')).toHaveCount(400);
      if (id === 'curator') {
        // The Curator unfolds into a block at 60% and folds back flat at 30%.
        await expect(page.locator('.clue.fogged')).toHaveCount(2);
        const name = page.locator('.battle-name').first();
        await solve(page, encounterSolution(id), async () => (await savedPhase(page)) >= 4);
        await expect(page.locator('canvas.block-canvas')).toBeVisible();
        await expect(name).toHaveText('Unfolded Curator');
        await breakBlock(page, id, async () => (await savedPhase(page)) >= 5);
        if (!(await page.locator('.end-panel:not([hidden])').isVisible())) {
          await expect(page.locator('.board')).toBeVisible();
          await expect(name).toHaveText('Overwound Curator');
          await solve(page, encounterSolution(id));
        }
      } else await solve(page, encounterSolution(id));
      if (id === gadget.at)
        await expect(page.locator('.end-panel:not([hidden])')).toContainText(gadget.name);
      await press(page, id === boss ? 'See results' : 'Back to map');
    }

    await expect(page.locator('.results h2')).toHaveText('Job done!');
    await expect(page.locator('.sign-off').first()).toContainText(signOff);
    expect(errors).toEqual([]);
  });
});
