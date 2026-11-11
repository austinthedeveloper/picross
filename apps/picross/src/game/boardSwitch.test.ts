import { describe, expect, it } from 'vitest';
import { getEncounter as getBlockEncounter } from '../../cubed/src/story/data';
import { runs } from '../puzzles/runs';
import {
  advancePhase,
  boardAt,
  carryHp,
  startBattle,
  switchesBoard,
  withBlockCounts,
  type Phase,
} from './battle';

/** A boss that unfolds into a block at 60% and folds back flat at 30% (like the Curator). */
const phases: Phase[] = [
  { at: 0.9, taunt: 'Warming up.' },
  { at: 0.6, board: 'block' },
  { at: 0.45, taunt: 'Still a block.' },
  { at: 0.3, board: 'flat' },
];
const boss = { name: 'Folding Boss', sprite: 'curator', hp: 60, attack: 2, phases };

describe('a boss that switches board', () => {
  it('is on the board its latest board-changing phase says', () => {
    expect(switchesBoard(boss)).toBe(true);
    expect(switchesBoard({ phases: [{ at: 0.5 }] })).toBe(false);
    expect([0, 1, 2, 3, 4].map((n) => boardAt(boss, n))).toEqual([
      'flat',
      'flat',
      'block',
      'block',
      'flat',
    ]);
  });

  it('carries HP so exactly the phases already started have started on the new board', () => {
    // 2 phases in on a 60 HP flat board at 33 HP (55%), onto a 145 HP block.
    const hp = carryHp(33 / 60, 145, phases, 2);
    expect(hp).toBeLessThanOrEqual(0.6 * 145);
    expect(hp).toBeGreaterThan(0.45 * 145);
    // Rounding up would land above the phase's threshold; it's held at it instead.
    expect(carryHp(0.6, 7, phases, 2)).toBe(4);
    expect(carryHp(0.0001, 10, phases, 4)).toBe(1);
    expect(carryHp(1, 10, phases, 0)).toBe(10);
  });

  it('back on the flat board, the phases from the block start there', () => {
    const left = { ...startBattle(boss), phase: 2, enemyHp: 35 };
    const enemyHp = carryHp(0.29, boss.hp, phases, 4);
    const { state, entered } = advancePhase(boss, { ...left, enemyHp });
    expect(entered.map((p) => p.at)).toEqual([0.45, 0.3]);
    expect(boardAt(boss, state.phase)).toBe('flat');
  });

  it("adds the block's counts to the fight's, for badges and the tally", () => {
    const flat = { ...startBattle(boss), counts: { wrongFills: 1, zaps: 2 } };
    const block = { counts: { mistakes: 2, zaps: 0, wrongAccusations: 1, gadgetsUsed: 1 } };
    expect(withBlockCounts(flat, block).counts).toEqual({
      wrongFills: 3,
      zaps: 2,
      wrongAccusations: 1,
      gadgetsUsed: 1,
    });
    expect(withBlockCounts(flat, undefined)).toBe(flat);
  });

  it('every story boss that switches has a block in the 3D game, phase for phase', () => {
    const switching = runs
      .flatMap((r) => r.encounters)
      .filter((e) => e.enemy && switchesBoard(e.enemy));
    expect(switching.map((e) => e.id)).toContain('curator');
    for (const e of switching) {
      const block = getBlockEncounter(e.id);
      expect(block?.enemy, e.id).toBeTruthy();
      expect(block!.enemy!.phases?.map((p) => p.at)).toEqual(e.enemy!.phases!.map((p) => p.at));
    }
  });
});
