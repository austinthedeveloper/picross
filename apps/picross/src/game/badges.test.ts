import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEncounter } from '../puzzles/runs';
import { ENDLESS_ID } from '../puzzles/endless';
import { bump, startBattle, type Enemy } from './battle';
import {
  badgeCount,
  badgeNote,
  fightAwards,
  getEarned,
  nextTierHint,
  runAwards,
  runTier,
  statsAwards,
} from './badges';
import { addToTally, startRun, withBattle, type RunState } from './run';
import type { JobStats } from './runSave';

const won = (mode: 'hearts' | 'relaxed', extra: Partial<RunState> = {}): RunState => ({
  ...startRun('first-job', 12, mode),
  status: 'won',
  ...extra,
});

const clean = won('hearts');
const tally = (counts: Parameters<typeof addToTally>[1], hints = 0) =>
  addToTally(clean, counts, hints);

describe('runTier', () => {
  it('gives bronze for any Relaxed win, however clean', () => {
    expect(runTier(won('relaxed'))).toBe('bronze');
  });

  it('gives gold for a clean Hits-on win', () => {
    expect(runTier(clean)).toBe('gold');
  });

  it('drops to silver for a wrong fill, a hint, or a bomb', () => {
    expect(runTier(tally({ wrongFills: 1 }))).toBe('silver');
    expect(runTier(tally({}, 1))).toBe('silver');
    expect(runTier(tally({ gadgetsUsed: 1, bombsUsed: 1 }))).toBe('silver');
  });

  it('keeps gold with patch kits, sponges, zaps, and wrong accusations', () => {
    expect(runTier(tally({ gadgetsUsed: 2, spongesUsed: 1, zaps: 1, wrongAccusations: 1 }))).toBe(
      'gold',
    );
  });

  it('never gives gold to a run from before the tally', () => {
    expect(runTier({ ...clean, tally: undefined })).toBe('silver');
  });

  it('gives nothing for a loss or a run in progress', () => {
    expect(runTier({ ...clean, status: 'lost' })).toBeNull();
    expect(runTier({ ...clean, status: 'active' })).toBeNull();
  });
});

describe('runAwards', () => {
  it("awards the job's own badge and tier", () => {
    expect(runAwards(clean)).toContainEqual({ id: 'invoiced-a-bat', tier: 'gold' });
    expect(runAwards({ ...clean, runId: 'deep-end' })).toContainEqual({
      id: 'octopus-diplomacy',
      tier: 'gold',
    });
    expect(runAwards(clean).filter((a) => a.tier)).toHaveLength(1);
  });

  it('awards Toolbox Shut only for a Hits-on win with no gadgets', () => {
    const shut = { id: 'toolbox-shut' };
    expect(runAwards(clean)).toContainEqual(shut);
    expect(runAwards(tally({ gadgetsUsed: 1 }))).not.toContainEqual(shut);
    expect(runAwards(won('relaxed'))).not.toContainEqual(shut);
  });

  it('awards nothing for an endless run or a loss', () => {
    const endless = { seed: 1, fights: [], digs: [] };
    expect(runAwards({ ...clean, runId: ENDLESS_ID, endless })).toEqual([]);
    expect(runAwards({ ...clean, status: 'lost' })).toEqual([]);
  });
});

describe('fightAwards', () => {
  const base: Enemy = { name: 'Plain', sprite: '👾', hp: 10, attack: 2 };
  const eel: Enemy = { ...base, charge: 3 };
  const lateEel: Enemy = { ...base, phases: [{ at: 0.5, charge: 3 }] };
  const forger: Enemy = { ...base, fakes: { rows: [1], cols: [] } };
  const fight = (enemy: Enemy, change = (b: ReturnType<typeof startBattle>) => b) =>
    withBattle(startRun('deep-end', 14, 'hearts'), change(startBattle(enemy)));
  const ids = (run: RunState, enemy: Enemy, encounter = 'x') =>
    fightAwards(run, encounter, enemy).map((a) => a.id);

  it('Grounded: a charge with no zaps, blocked zaps counting', () => {
    expect(ids(fight(eel), eel)).toEqual(['grounded']);
    expect(
      ids(
        fight(eel, (b) => bump(b, 'zaps')),
        eel,
      ),
    ).toEqual([]);
  });

  it('Grounded: not if the charge never started', () => {
    expect(ids(fight(lateEel), lateEel)).toEqual([]);
    expect(
      ids(
        fight(lateEel, (b) => ({ ...b, phase: 1 })),
        lateEel,
      ),
    ).toEqual(['grounded']);
    expect(ids(fight(base), base)).toEqual([]);
  });

  it('Expert Witness: every forgery caught, no wrong accusations', () => {
    expect(ids(fight(forger), forger)).toEqual([]);
    const caught = (b: ReturnType<typeof startBattle>) => ({
      ...b,
      fakes: { rows: [], cols: [] },
    });
    expect(ids(fight(forger, caught), forger)).toEqual(['expert-witness']);
    expect(
      ids(
        fight(forger, (b) => bump(caught(b), 'wrongAccusations')),
        forger,
      ),
    ).toEqual([]);
  });

  it('No Sponge Required: only Old Tess, only without a sponge', () => {
    expect(ids(fight(base), base, 'old-tess')).toEqual(['no-sponge-required']);
    expect(
      ids(
        fight(base, (b) => bump(b, 'spongesUsed')),
        base,
        'old-tess',
      ),
    ).toEqual([]);
    expect(ids(fight(base), base, 'mimic')).toEqual([]);
  });

  it('names an encounter that really is Old Tess', () => {
    expect(getEncounter('old-tess')?.enemy?.name).toBe('Old Tess');
  });

  it('needs Hits on, and a run that was counted from the start', () => {
    const relaxed = withBattle(startRun('deep-end', 14, 'relaxed'), startBattle(eel));
    expect(ids(relaxed, eel)).toEqual([]);
    expect(ids({ ...fight(eel), tally: undefined }, eel)).toEqual([]);
  });
});

describe('statsAwards', () => {
  const stats =
    (jobs: Record<string, JobStats>) =>
    (id: string): JobStats | undefined =>
      jobs[id];

  it('gives nothing to a new player', () => {
    expect(statsAwards(stats({}), 0)).toEqual([]);
  });

  it('turns past wins into bronze, whatever their old best HP says', () => {
    expect(statsAwards(stats({ 'first-job': { plays: 1, wins: 1, bestHp: 12 } }), 0)).toEqual([
      { id: 'invoiced-a-bat', tier: 'bronze' },
    ]);
  });

  it('never proves gold, even for Hits-on wins', () => {
    expect(statsAwards(stats({ 'first-job': { plays: 1, wins: 1, hitsOnWins: 1 } }), 0)).toEqual([
      { id: 'invoiced-a-bat', tier: 'silver' },
    ]);
  });

  it('awards losses on the jobs that have them, past ones included', () => {
    const lost = { plays: 3, wins: 1 };
    expect(statsAwards(stats({ glasshouse: lost }), 0)).toContainEqual({ id: 'pruned' });
    expect(statsAwards(stats({ 'night-mail': lost }), 0)).toContainEqual({ id: 'fined' });
    expect(statsAwards(stats({ 'closing-time': lost }), 0)).toContainEqual({ id: 'exhibit-41' });
    const unbeaten = statsAwards(stats({ glasshouse: { plays: 2, wins: 2 } }), 0);
    expect(unbeaten).not.toContainEqual({ id: 'pruned' });
  });

  it('awards Endless depths at each threshold', () => {
    const at = (bestDepth: number) =>
      statsAwards(stats({ [ENDLESS_ID]: { plays: 1, wins: 0, bestDepth } }), 0).map((a) => a.id);
    expect(at(4)).toEqual([]);
    expect(at(5)).toEqual(['going-down']);
    expect(at(10)).toEqual(['going-down', 'deep-cover']);
    expect(at(20)).toEqual(['going-down', 'deep-cover', 'rock-bottom']);
  });

  it('awards daily streaks at each threshold', () => {
    const at = (days: number) => statsAwards(stats({}), days).map((a) => a.id);
    expect(at(6)).toEqual([]);
    expect(at(7)).toEqual(['regular']);
    expect(at(30)).toEqual(['regular', 'creature-of-habit']);
    expect(at(100)).toEqual(['regular', 'creature-of-habit', 'part-of-the-furniture']);
  });
});

describe('earning', () => {
  async function load() {
    vi.resetModules();
    return import('./badges');
  }
  const seedRun = (jobs: Record<string, JobStats>) =>
    localStorage.setItem('picross:run', JSON.stringify({ seenScenes: [], jobs }));

  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(getEarned('invoiced-a-bat')).toBeUndefined();
    expect(badgeCount().earned).toBe(0);
    expect(badgeCount().total).toBeGreaterThan(20);
  });

  it('awards an older save without dates, once, and keeps it across reloads', async () => {
    seedRun({ 'first-job': { plays: 2, wins: 1, bestHp: 12 } });
    const first = await load();
    first.syncBadges();
    expect(first.getEarned('invoiced-a-bat')).toEqual({ tier: 'bronze' });
    const again = await load();
    expect(again.getEarned('invoiced-a-bat')).toEqual({ tier: 'bronze' });
    expect(again.earnFromStats()).toEqual([]);
  });

  it('dates a badge when earned in play, and shows it only once', async () => {
    const save = await load();
    const run = { ...startRun('first-job', 12, 'hearts'), status: 'won' as const };
    const fresh = save.earnFromRun(run);
    expect(fresh.map((f) => f.badge.id)).toEqual(['invoiced-a-bat', 'toolbox-shut']);
    expect(fresh[0]).toMatchObject({ tier: 'gold', upgraded: false });
    expect(save.getEarned('invoiced-a-bat')?.at).toBeGreaterThan(0);
    expect(save.earnFromRun(run)).toEqual([]);
  });

  it('only lets tiers go up, keeping the first date', async () => {
    const save = await load();
    const relaxed = { ...startRun('first-job', 12), status: 'won' as const };
    const hitsOn = addToTally(
      { ...startRun('first-job', 12, 'hearts'), status: 'won' as const },
      { wrongFills: 1 },
    );
    save.earnFromRun(relaxed);
    const first = save.getEarned('invoiced-a-bat')!;
    expect(first.tier).toBe('bronze');

    const upgrade = save.earnFromRun(hitsOn);
    expect(upgrade[0]).toMatchObject({ tier: 'silver', upgraded: true });
    expect(save.getEarned('invoiced-a-bat')).toEqual({ tier: 'silver', at: first.at });

    expect(save.earnFromRun(relaxed)).toEqual([]);
    expect(save.getEarned('invoiced-a-bat')?.tier).toBe('silver');
  });

  it("doesn't let the stats undo a gold", async () => {
    const save = await load();
    save.earnFromRun({ ...startRun('first-job', 12, 'hearts'), status: 'won' });
    expect(save.getEarned('invoiced-a-bat')?.tier).toBe('gold');
    seedRun({ 'first-job': { plays: 1, wins: 1, hitsOnWins: 1 } });
    const reloaded = await load();
    reloaded.syncBadges();
    expect(reloaded.getEarned('invoiced-a-bat')?.tier).toBe('gold');
  });

  it("ignores saved badges the game doesn't know, without losing them", async () => {
    localStorage.setItem(
      'picross:badges',
      JSON.stringify({ earned: { 'from-the-future': { at: 5 } } }),
    );
    const save = await load();
    expect(save.badgeCount().earned).toBe(0);
    save.earnFromRun({ ...startRun('first-job', 12), status: 'won' });
    expect(JSON.parse(localStorage.getItem('picross:badges')!).earned).toHaveProperty(
      'from-the-future',
    );
  });
});

describe('wording', () => {
  it('writes the solved-screen line', () => {
    const badge = { name: 'Grounded' } as never;
    expect(badgeNote([])).toBe('');
    expect(badgeNote([{ badge, upgraded: false }])).toBe('Badge earned: Grounded!');
    expect(badgeNote([{ badge, tier: 'silver', upgraded: true }])).toBe(
      'Badge upgraded: Grounded (Silver)!',
    );
  });

  it('says what the next tier needs', () => {
    expect(nextTierHint()).toContain('Bronze');
    expect(nextTierHint({ tier: 'bronze' })).toContain('Silver');
    expect(nextTierHint({ tier: 'silver' })).toContain('no bombs');
    expect(nextTierHint({ tier: 'gold' })).toBe('Top tier.');
  });
});
