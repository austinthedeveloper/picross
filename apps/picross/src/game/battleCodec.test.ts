import { describe, expect, it } from 'vitest';
import type { BattleState, Enemy } from './battle';
import { decode, encode, fightEnemy, lineIds, lineSet } from './battleCodec';

/** The 2D save ↔ the story battle's state (#166): sparse, in place, and the same object back. */

const boss: Enemy = {
  name: 'Boss',
  sprite: 'B',
  hp: 20,
  attack: 2,
  charge: 4,
  phases: [{ at: 0.5, fog: { rows: [0, 1], cols: [2] }, fogCount: 2, rotate: 3 }],
};

const saved: BattleState = {
  enemyHp: 9,
  struck: ['r0', 'c2'],
  fog: { rows: [3], cols: [1] },
  counts: { wrongFills: 2, gadgetsUsed: 1 },
  phase: 1,
  live: { kind: 'col', index: 4 },
  warmUp: 0,
  charged: 1,
  turns: 1,
  turning: 2,
};

describe('the battle codec', () => {
  it('lines are ids, rows then columns, each kind in order', () => {
    expect(lineIds({ rows: [3, 1, 3], cols: [0] }, 5)).toEqual([3, 1, 3, 5]);
    expect(lineSet([6, 2, 5, 2], 5)).toEqual({ rows: [2, 2], cols: [1, 0] });
  });

  it("reads the save the battle's way: phases by index, wrong fills as mistakes", () => {
    const state = decode(saved, boss, 5);
    expect(state).toMatchObject({
      enemyHp: 9,
      maxHp: 20,
      phase: 0,
      struck: [0, 7],
      fog: [3, 6],
      charge: { every: 4, meter: 1, live: 9, warmUp: 0 },
      turn: { every: 3, meter: 2, turns: 1 },
      counts: { mistakes: 2, gadgetsUsed: 1, zaps: 0 },
    });
    // A charge that hasn't shown yet has no warm-up.
    expect(decode({ enemyHp: 20, struck: [] }, boss, 5).charge).toEqual({
      every: 4,
      meter: 0,
      live: null,
    });
  });

  it('gives the same save back when nothing changed', () => {
    expect(encode(saved, decode(saved, boss, 5), 5)).toBe(saved);
    const fresh = { enemyHp: 20, struck: [] };
    expect(encode(fresh, decode(fresh, boss, 5), 5)).toBe(fresh);
  });

  it('writes only what changed, onto the save, keys where they were', () => {
    const state = decode(saved, boss, 5);
    state.fog = [6];
    state.shield = 1;
    state.counts.zaps = 1;
    const next = encode(saved, state, 5);
    expect(Object.keys(next)).toEqual([...Object.keys(saved), 'shield']);
    expect(next.fog).toEqual({ rows: [], cols: [1] });
    expect(next.counts).toEqual({ wrongFills: 2, gadgetsUsed: 1, zaps: 1 });
    expect(saved.counts).toEqual({ wrongFills: 2, gadgetsUsed: 1 });
  });

  it("writes new fields in a step's order, and what it touches even when empty", () => {
    const start = { enemyHp: 20, struck: [] };
    const state = decode(start, boss, 5);
    state.phase = 0;
    const next = encode(start, state, 5, { order: ['phase', 'scramble', 'fog'], touch: ['fog'] });
    expect(JSON.stringify(next)).toBe(
      '{"enemyHp":20,"struck":[],"phase":1,"fog":{"rows":[],"cols":[]}}',
    );
  });

  it("turns a phase's pools with the board", () => {
    const [phase] = fightEnemy(boss, 5, 5, 1).phases!;
    // Rows 0 and 1 are columns 4 and 3 a quarter turn on; column 2 is row 2.
    expect(phase.fog).toEqual({ pool: [2, 9, 8], count: 2 });
    expect(fightEnemy(boss, 5).phases![0].fog).toEqual({ pool: [0, 1, 7], count: 2 });
  });
});
