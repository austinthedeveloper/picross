import { describe, expect, it, vi } from 'vitest';
import { addGadget, completeEncounter, damage, heal, removeGadget, startRun } from './run';

describe('runs', () => {
  it('lose at 0 HP and never go below', () => {
    const run = damage(startRun('job', 5, 'hearts'), 7);
    expect(run).toMatchObject({ hp: 0, status: 'lost' });
    expect(damage(run, 1)).toBe(run);
  });

  it('heal up to the max', () => {
    expect(heal(damage(startRun('job', 5, 'hearts'), 3), 10).hp).toBe(5);
  });

  it('win after the last encounter, clearing the board', () => {
    let run = startRun('job', 5, 'relaxed');
    run = { ...run, board: { blocks: '0' } };
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 1, status: 'active' });
    expect(run.board).toBeUndefined();
    expect(completeEncounter(run, 2).status).toBe('won');
  });

  it('hold and use gadgets', () => {
    const run = addGadget(startRun('job', 5, 'relaxed', ['patch-kit']), 'bomb');
    expect(run.gadgets).toEqual(['patch-kit', 'bomb']);
    expect(removeGadget(run, 'patch-kit').gadgets).toEqual(['bomb']);
  });
});

describe('run saves', () => {
  it('record a finished run once, with Hits-on wins and best HP', async () => {
    localStorage.clear();
    vi.resetModules();
    const saves = await import('./runSave');
    let run = completeEncounter(startRun('job', 6, 'hearts'), 1);
    run = saves.recordRunResult(run);
    saves.recordRunResult(run);
    expect(saves.getJobStats('job')).toEqual({ plays: 1, wins: 1, hitsOnWins: 1, bestHp: 6 });
    expect(saves.clearedJobs()).toEqual(['job']);
  });
});
