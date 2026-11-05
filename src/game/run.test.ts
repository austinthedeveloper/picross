import { describe, expect, it } from 'vitest';
import {
  addGadget,
  addToTally,
  completeEncounter,
  damage,
  heal,
  removeGadget,
  startRun,
  withBattle,
  withBoard,
} from './run';

describe('tally', () => {
  it('starts at zero and adds up each field across encounters', () => {
    let run = startRun('r', 10);
    expect(run.tally).toEqual({
      wrongFills: 0,
      zaps: 0,
      wrongAccusations: 0,
      gadgetsUsed: 0,
      bombsUsed: 0,
      spongesUsed: 0,
      hintsUsed: 0,
    });
    run = addToTally(
      run,
      {
        wrongFills: 1,
        zaps: 2,
        wrongAccusations: 3,
        gadgetsUsed: 2,
        bombsUsed: 1,
        spongesUsed: 1,
      },
      2,
    );
    run = addToTally(run, { wrongFills: 4 }, 1);
    run = addToTally(run);
    expect(run.tally).toEqual({
      wrongFills: 5,
      zaps: 2,
      wrongAccusations: 3,
      gadgetsUsed: 2,
      bombsUsed: 1,
      spongesUsed: 1,
      hintsUsed: 3,
    });
  });

  it('stays out of runs from before the tally, so they never look clean', () => {
    const old = { ...startRun('r', 10), tally: undefined };
    expect(addToTally(old, { wrongFills: 1 }, 1).tally).toBeUndefined();
  });
});

describe('run', () => {
  it('advances through encounters and wins after the last', () => {
    let run = startRun('r', 10);
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 1, status: 'active' });
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 2, status: 'won' });
    expect(completeEncounter(run, 2)).toBe(run);
  });

  it('holds gadgets, including duplicates, and uses them one at a time', () => {
    let run = startRun('r', 3, 'relaxed', ['patch-kit']);
    run = addGadget(addGadget(run, 'bomb'), 'bomb');
    expect(run.gadgets).toEqual(['patch-kit', 'bomb', 'bomb']);
    run = removeGadget(run, 'bomb');
    expect(run.gadgets).toEqual(['patch-kit', 'bomb']);
    expect(removeGadget(run, 'nope')).toBe(run);
  });

  it('remembers the mode it started in', () => {
    expect(startRun('r', 3, 'hearts').mode).toBe('hearts');
  });

  it('is lost when HP hits zero', () => {
    let run = damage(startRun('r', 3), 2);
    expect(run).toMatchObject({ hp: 1, status: 'active' });
    run = damage(run, 5);
    expect(run).toMatchObject({ hp: 0, status: 'lost' });
    expect(completeEncounter(run, 3)).toBe(run);
  });

  it('keeps the current board until the encounter is cleared', () => {
    let run = withBoard(startRun('r', 3), { cells: '01' });
    expect(run.board).toEqual({ cells: '01' });
    run = withBattle(run, { enemyHp: 3, struck: ['r1'] });
    run = completeEncounter(run, 3);
    expect(run.board).toBeUndefined();
    expect(run.battle).toBeUndefined();
    expect(withBoard(run, null)).not.toHaveProperty('board');
  });
});

describe('heal', () => {
  it('restores HP up to the max, and only while the run is going', () => {
    const run = { ...startRun('r', 10), hp: 7 };
    expect(heal(run, 2).hp).toBe(9);
    expect(heal(run, 5).hp).toBe(10);
    expect(heal({ ...run, status: 'lost' }, 2).hp).toBe(7);
  });

  it('a run that never ends is never won', () => {
    expect(completeEncounter({ ...startRun('r', 10), node: 99 }, Infinity).status).toBe('active');
  });
});
