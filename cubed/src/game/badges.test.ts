import { describe, expect, it } from 'vitest';
import { BADGES, nextStep, tierOf } from './badges';

describe('badges', () => {
  const solver = BADGES.find((b) => b.id === 'solver')!;

  it('tier by their steps', () => {
    expect(tierOf(solver, 0)).toBe(-1);
    expect(tierOf(solver, 5)).toBe(0);
    expect(tierOf(solver, 29)).toBe(1);
    expect(tierOf(solver, 30)).toBe(2);
  });

  it('say what the next tier needs', () => {
    expect(nextStep(solver, 3)).toBe('Bronze at 5 (3 so far)');
    expect(nextStep(solver, 40)).toBe('All tiers earned');
  });

  it('all start at zero on a fresh save', () => {
    for (const b of BADGES) expect(b.value()).toBe(0);
  });
});
