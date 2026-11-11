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
    expect(saves.getJobStats('job')).toEqual({
      plays: 1,
      wins: 1,
      hitsOnWins: 1,
      bestHp: 6,
      wonOn: ['block'],
    });
    expect(saves.clearedJobs()).toEqual(['job']);
  });

  it('live in the one run save, beside the 2D run (#155)', async () => {
    localStorage.clear();
    vi.resetModules();
    const saves = await import('./runSave');
    const flat = await import('../../game/runSave');
    const run = startRun('job', 6, 'relaxed');
    saves.saveCurrentRun(run);
    expect(flat.getCurrentRun()).toBeNull();
    const stored = JSON.parse(localStorage.getItem('picross:run')!);
    expect(stored.block.current).toEqual(run);
    expect(typeof stored.block.currentUpdatedAt).toBe('number');
    expect(localStorage.getItem('picross3d:run')).toBeNull();
    // A job won on both boards says so, and keeps the 2D game's fields.
    const flatRun = (await import('../../game/run')).startRun('job', 10);
    flat.recordRunResult({ ...flatRun, status: 'won' });
    expect(saves.getCurrentRun()).toEqual(run);
    saves.recordRunResult(completeEncounter(run, 1));
    expect(saves.getJobStats('job')).toMatchObject({ plays: 2, wins: 2, wonOn: ['block', 'grid'] });
  });
});

describe('a fight in the run save (#169)', () => {
  const load = async () => {
    vi.resetModules();
    return import('./runSave');
  };
  const board = { blocks: '2010', elapsed: 4000 };
  const battle = { enemyHp: 9, maxHp: 14, phase: -1, struck: [1] };
  /** Cubed's run as the one run save holds it (`picross:run`'s `block`). */
  const stored = () => JSON.parse(localStorage.getItem('picross:run')!).block;

  it("is saved as the fight's block entry, and reloads as it was played", async () => {
    localStorage.clear();
    const saves = await load();
    const run = { ...startRun('first-job', 12, 'relaxed'), board, battle };
    saves.saveCurrentRun(run);
    const saved = stored().current;
    expect(saved.fight).toEqual({ v: 2, boards: { block: { board, battle } } });
    expect(saved).not.toHaveProperty('battle');
    expect(localStorage.getItem('picross3d:run')).toBeNull();
    expect((await load()).getCurrentRun()).toEqual(run);
  });

  it('loads a run saved before it; saving it unchanged writes the new shape, not a new stamp', async () => {
    vi.useFakeTimers({ now: 1000 });
    const old = { ...startRun('first-job', 12, 'relaxed'), board, battle };
    // As the first-launch merge (#155) leaves a Cubed run from before #169.
    localStorage.setItem(
      'picross:run',
      JSON.stringify({
        current: null,
        seenScenes: [],
        jobs: {},
        block: { current: old, currentUpdatedAt: 500 },
      }),
    );
    const saves = await load();
    const run = saves.getCurrentRun()!;
    expect(run).toEqual(old);
    expect(saves.getCurrentRun()).toBe(run);
    saves.saveCurrentRun(run);
    expect(stored().current.fight.boards).toEqual({ block: { board, battle } });
    expect(stored().currentUpdatedAt).toBe(500);
    saves.saveCurrentRun({ ...run, hp: 3 });
    expect(stored().currentUpdatedAt).toBe(1000);
    vi.useRealTimers();
  });

  it("keeps the 2D run's fight in its own shape beside it", async () => {
    localStorage.clear();
    const saves = await load();
    const flat = await import('../../game/runSave');
    const flatRun = await import('../../game/run');
    const fight = flatRun.withBattle(
      flatRun.withBoard(flatRun.startRun('closing-time', 18), { cells: '01' }),
      { enemyHp: 30, struck: ['r1'], phase: 4 },
    );
    flat.saveCurrentRun(fight);
    const run = { ...startRun('first-job', 12, 'relaxed'), board, battle };
    saves.saveCurrentRun(run);
    const both = JSON.parse(localStorage.getItem('picross:run')!);
    expect(both.current.fight.boards.flat).toEqual({
      board: { cells: '01' },
      battle: fight.battle,
    });
    expect(both.current).not.toHaveProperty('battle');
    expect(both.block.current.fight.boards.block).toEqual({ board, battle });
    const again = await load();
    expect(again.getCurrentRun()).toEqual(run);
    expect((await import('../../game/runSave')).getCurrentRun()).toEqual(fight);
  });
});
