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
