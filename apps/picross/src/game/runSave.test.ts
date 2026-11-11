import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startRun } from './run';

async function load() {
  vi.resetModules();
  return import('./runSave');
}

beforeEach(() => localStorage.clear());

describe('runSave', () => {
  it('restores the current run after a reload', async () => {
    const save = await load();
    expect(save.getCurrentRun()).toBeNull();
    save.saveCurrentRun({ ...startRun('r', 5), node: 2 });
    expect((await load()).getCurrentRun()).toMatchObject({ runId: 'r', node: 2, hp: 5 });
    save.saveCurrentRun(null);
    expect((await load()).getCurrentRun()).toBeNull();
  });
});

describe('when the run last changed', () => {
  const stamp = () => JSON.parse(localStorage.getItem('picross:run')!).currentUpdatedAt;

  it('is stamped when the run changes, and when it is cleared', async () => {
    vi.useFakeTimers({ now: 1000 });
    const save = await load();
    save.saveCurrentRun(startRun('r', 5));
    expect(stamp()).toBe(1000);
    vi.setSystemTime(2000);
    save.saveCurrentRun({ ...startRun('r', 5), node: 1 });
    expect(stamp()).toBe(2000);
    vi.setSystemTime(3000);
    save.saveCurrentRun(null);
    expect(stamp()).toBe(3000);
    vi.useRealTimers();
  });

  it("doesn't change when the same run is saved again, as opening it does", async () => {
    vi.useFakeTimers({ now: 1000 });
    const save = await load();
    const run = startRun('r', 5);
    save.saveCurrentRun(run);
    vi.setSystemTime(9000);
    save.saveCurrentRun({ ...run });
    expect(stamp()).toBe(1000);
    vi.useRealTimers();
  });
});

describe('seen scenes', () => {
  it('remembers scenes across reloads', async () => {
    const save = await load();
    expect(save.hasSeenScene('intro')).toBe(false);
    save.markSceneSeen('intro');
    expect((await load()).hasSeenScene('intro')).toBe(true);
  });
});

describe('job stats', () => {
  it('records each finished run once', async () => {
    const save = await load();
    const won = { ...startRun('job', 10, 'hearts'), hp: 7, status: 'won' as const };
    save.recordRunResult(save.recordRunResult(won)); // second call is a no-op
    save.recordRunResult({ ...startRun('job', 10, 'hearts'), hp: 0, status: 'lost' });
    expect((await load()).getJobStats('job')).toEqual({
      plays: 2,
      wins: 1,
      hitsOnWins: 1,
      bestHp: 7,
      wonOn: ['grid'],
    });
  });

  it('only lets Hits-on wins set the best HP', async () => {
    const save = await load();
    save.recordRunResult({ ...startRun('job', 10), hp: 10, status: 'won' });
    expect(save.getJobStats('job')).toEqual({ plays: 1, wins: 1, wonOn: ['grid'] });
    save.recordRunResult({ ...startRun('job', 10, 'hearts'), hp: 4, status: 'won' });
    save.recordRunResult({ ...startRun('job', 10, 'hearts'), hp: 2, status: 'won' });
    save.recordRunResult({ ...startRun('job', 10), hp: 10, status: 'won' });
    expect(save.getJobStats('job')).toEqual({
      plays: 4,
      wins: 4,
      hitsOnWins: 2,
      bestHp: 4,
      wonOn: ['grid'],
    });
  });

  it('starts fresh over a best HP from before modes were recorded', async () => {
    localStorage.setItem(
      'picross:run',
      JSON.stringify({ seenScenes: [], jobs: { job: { plays: 3, wins: 2, bestHp: 10 } } }),
    );
    const save = await load();
    save.recordRunResult({ ...startRun('job', 10, 'hearts'), hp: 3, status: 'won' });
    expect(save.getJobStats('job')).toEqual({
      plays: 4,
      wins: 3,
      hitsOnWins: 1,
      bestHp: 3,
      wonOn: ['grid'],
    });
  });

  it('keeps the old best HP on a Relaxed win, and it stays unused', async () => {
    localStorage.setItem(
      'picross:run',
      JSON.stringify({ seenScenes: [], jobs: { job: { plays: 1, wins: 1, bestHp: 10 } } }),
    );
    const save = await load();
    save.recordRunResult({ ...startRun('job', 10), hp: 10, status: 'won' });
    expect(save.getJobStats('job')).toEqual({ plays: 2, wins: 2, bestHp: 10, wonOn: ['grid'] });
  });

  it("doesn't count a loss as a board won on", async () => {
    const save = await load();
    save.recordRunResult({ ...startRun('job', 10), hp: 0, status: 'lost' });
    expect(save.getJobStats('job')).toEqual({ plays: 1, wins: 0 });
  });

  it('ignores runs still in progress', async () => {
    const save = await load();
    save.recordRunResult(startRun('job', 10));
    expect(save.getJobStats('job')).toBeUndefined();
  });
});

describe('endless stats', () => {
  it('keeps the deepest run', async () => {
    const save = await load();
    const endless = { seed: 1, fights: ['a'], digs: [] };
    const lost = (node: number) => ({
      ...startRun('endless', 14),
      node,
      hp: 0,
      status: 'lost' as const,
      endless,
    });
    save.recordRunResult(lost(6));
    save.recordRunResult(lost(3));
    expect((await load()).getJobStats('endless')).toEqual({ plays: 2, wins: 0, bestDepth: 6 });
  });
});

describe('power tips', () => {
  it('remember which tips you have dismissed', async () => {
    const save = await load();
    expect(save.hasSeenTip('fog')).toBe(false);
    save.markTipSeen('fog');
    save.markTipSeen('fog');
    expect((await load()).hasSeenTip('fog')).toBe(true);
    expect((await load()).hasSeenTip('ink')).toBe(false);
  });
});
