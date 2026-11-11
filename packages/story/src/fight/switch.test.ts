import { describe, expect, it } from 'vitest';
import { boardAt, hpShare, switchesBoard } from './switch';

/** A boss that unfolds into a block at 60% and folds back flat at 30% (like the Curator). */
const phases = [
  { at: 0.9 },
  { at: 0.6, board: 'block' as const },
  { at: 0.45 },
  { at: 0.3, board: 'flat' as const },
];
const boss = { phases };

describe('a boss that switches board (#170)', () => {
  it('is on the board its latest board-changing phase says', () => {
    expect(switchesBoard(boss)).toBe(true);
    expect(switchesBoard({ phases: [{}] })).toBe(false);
    expect(switchesBoard({})).toBe(false);
    expect([0, 1, 2, 3, 4].map((n) => boardAt(boss, n))).toEqual([
      'flat',
      'flat',
      'block',
      'block',
      'flat',
    ]);
  });

  it('takes the same share of HP onto the other board, with exactly the phases started', () => {
    // 2 phases in on a 60 HP flat board at 33 HP (55%), onto a 145 HP block.
    const hp = hpShare(33 / 60, 145, phases, 2);
    expect(hp).toBeLessThanOrEqual(0.6 * 145);
    expect(hp).toBeGreaterThan(0.45 * 145);
    // Rounding up would land above the phase's threshold; it's held at it instead.
    expect(hpShare(0.6, 7, phases, 2)).toBe(4);
    // Never 0 (the fight isn't over), never over full.
    expect(hpShare(0.0001, 10, phases, 4)).toBe(1);
    expect(hpShare(1, 10, phases, 0)).toBe(10);
  });
});
