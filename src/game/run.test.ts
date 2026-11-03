import { describe, expect, it } from 'vitest';
import { completeEncounter, damage, startRun, withBoard } from './run';

describe('run', () => {
  it('advances through encounters and wins after the last', () => {
    let run = startRun('r', 10);
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 1, status: 'active' });
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 2, status: 'won' });
    expect(completeEncounter(run, 2)).toBe(run);
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
    run = completeEncounter(run, 3);
    expect(run.board).toBeUndefined();
    expect(withBoard(run, null)).not.toHaveProperty('board');
  });
});
