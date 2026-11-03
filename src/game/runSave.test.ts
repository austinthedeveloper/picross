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
    const won = { ...startRun('job', 10), hp: 7, status: 'won' as const };
    save.recordRunResult(save.recordRunResult(won)); // second call is a no-op
    save.recordRunResult({ ...startRun('job', 10), hp: 0, status: 'lost' });
    expect((await load()).getJobStats('job')).toEqual({ plays: 2, wins: 1, bestHp: 7 });
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
