import { expect, test } from '@playwright/test';
import { encounterSolution, press, seed, skipScene, solve } from './helpers';

const won = { plays: 1, wins: 1, bestHp: 10 };

/** Every job in board order, and the opening scene of the chapter that each job after the first starts. */
const ORDER = ['first-job', 'night-shift', 'deep-end', 'glasshouse', 'midway', 'summit-station'];
const OPENINGS = [
  'after-hours-opening',
  'deep-water-opening',
  'green-thumbs-opening',
  'step-right-up-opening',
  'cold-snap-opening',
];

const JOBS = [
  {
    job: 'glasshouse',
    opening: 'Chapter 4: Green Thumbs',
    nodes: ['snapjaw', 'spore-puff', 'potting-shed', 'ironbark', 'garden-bench', 'mother-bramble'],
    gadget: { at: 'potting-shed', name: 'You got 🧽 Sponge' },
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
    gadget: { at: 'prop-wagon', name: 'You got 💣 Bomb' },
    signOff: 'happy to be bankrupt',
  },
  {
    job: 'summit-station',
    opening: 'Chapter 6: Cold Snap',
    nodes: ['whiteout', 'falling-star', 'supply-cache', 'ice-mammoth', 'cocoa-break', 'yeti'],
    gadget: { at: 'supply-cache', name: 'You got 🩹 Patch kit' },
    signOff: 'taking off one coat',
  },
  {
    job: 'closing-time',
    opening: 'Wound Up',
    nodes: ['tin-soldier', 'dusty-exhibit', 'break-room', 'curator'],
    gadget: { at: 'dusty-exhibit', name: 'You got 🩹 Patch kit' },
    signOff: 'back in his case',
  },
];

JOBS.forEach(({ job, opening, nodes, gadget, signOff }, i) => {
  const before = ORDER.slice(0, 3 + i);
  test(`the whole of ${job}, from its chapter opening to its boss`, async ({ page, context }) => {
    test.setTimeout(240_000);
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
      if (id === 'curator') await expect(page.locator('.clue.fogged')).toHaveCount(2);
      await solve(page, encounterSolution(id));
      if (id === gadget.at)
        await expect(page.locator('.end-panel:not([hidden])')).toContainText(gadget.name);
      await press(page, id === boss ? 'See results' : 'Back to map');
    }

    await expect(page.locator('.results h2')).toHaveText('Job done!');
    await expect(page.locator('.sign-off').first()).toContainText(signOff);
  });
});
