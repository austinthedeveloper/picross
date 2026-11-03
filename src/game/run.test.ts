import { describe, expect, it } from 'vitest';
import { completeEncounter, damage, startRun, withBattle, withBoard } from './run';

describe('run', () => {
  it('advances through encounters and wins after the last', () => {
    let run = startRun('r', 10);
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 1, status: 'active' });
    run = completeEncounter(run, 2);
    expect(run).toMatchObject({ node: 2, status: 'won' });
    expect(completeEncounter(run, 2)).toBe(run);
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
