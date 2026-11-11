import { describe, expect, it, vi } from 'vitest';

/**
 * After the first-launch merge (#155), both games' stores read the one save: the 2D game's
 * modules directly, Cubed's through its views here. Fixtures from real play, as in
 * game/migrate.test.ts.
 */

const files = import.meta.glob<{ keys: Record<string, unknown> }>(
  '../../game/fixtures/legacy/*.json',
  { eager: true, import: 'default' },
);
const NAMES = ['flat-only', 'cubed-only', 'both', 'both-mid-run'] as const;
type Name = (typeof NAMES)[number];

function fixture(name: Name): Record<string, string> {
  const { keys } = files[`../../game/fixtures/legacy/${name}.json`];
  return Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
}

const parsed = (name: Name, key: string) => {
  const text = fixture(name)[key];
  return text === undefined ? undefined : JSON.parse(text);
};

function seed(keys: Record<string, string>) {
  localStorage.clear();
  for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
}

describe.each(NAMES)('%s', (name) => {
  const before = fixture(name);

  it('gives both games the merged save through their stores', async () => {
    seed(before);
    // As main.ts does: the migration first, then the stores read the merged keys.
    vi.resetModules();
    await import('../../game/migrate');
    const flatProgress = await import('../../game/progress');
    const cubedProgress = await import('./progress');
    const flatRuns = await import('../../game/runSave');
    const cubedRuns = await import('./runSave');
    const flatSettings = await import('../../game/settings');
    const cubedSettings = await import('./settings');

    const v1 = parsed(name, 'picross:v1');
    const v3d = parsed(name, 'picross3d:v1');
    for (const [id, stats] of Object.entries(v1?.solved ?? {})) {
      expect(flatProgress.getPuzzleStats(id)).toEqual(stats);
    }
    for (const [id, stats] of Object.entries(v3d?.solved ?? {})) {
      expect(cubedProgress.getPuzzleStats(id)).toEqual(stats);
    }
    for (const [id, board] of Object.entries(v1?.boards ?? {})) {
      expect(flatProgress.getSavedBoard(id)).toEqual(board);
    }
    for (const [id, board] of Object.entries(v3d?.boards ?? {})) {
      expect(cubedProgress.getSavedBoard(id)).toEqual(board);
    }
    expect(flatProgress.getOverallStats().totalTime).toBe(v1?.totalTime ?? 0);
    expect(cubedProgress.getOverallStats().totalTime).toBe(v3d?.totalTime ?? 0);

    expect(flatRuns.getCurrentRun()).toEqual(parsed(name, 'picross:run')?.current ?? null);
    expect(cubedRuns.getCurrentRun()).toEqual(parsed(name, 'picross3d:run')?.current ?? null);
    expect(cubedRuns.clearedJobs()).toEqual(flatRuns.clearedJobs());

    const flatSet = parsed(name, 'picross:settings');
    const cubedSet = parsed(name, 'picross3d:settings');
    if (flatSet) expect(flatSettings.getSettings()).toMatchObject(flatSet);
    if (cubedSet) {
      const { dimDone, tutorialDone } = cubedSet;
      expect(cubedSettings.getSettings()).toMatchObject({ dimDone, tutorialDone });
      if (!flatSet) expect(cubedSettings.getSettings()).toEqual(cubedSet);
    }
    expect(flatSettings.getSettings().freePlayTab).toBe(before['picross:game']);
  });
});
