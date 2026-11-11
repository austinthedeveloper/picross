import { describe, expect, it } from 'vitest';
import { encounters, type Encounter } from '../puzzles/runs';
import { trace } from './fightTrace';

/**
 * Golden traces of every 2D fight (#163), like the block's (packages/block's
 * `battleTraces.test.ts`). The solver numbers (`fight-ratings.json`) can't see armor,
 * charge, ink, swaps, turns, call-outs, gadgets or when phases land, so this plays each
 * fight headless through `gridStep` (`fightTrace.ts` has the script) and snapshots what
 * happens at every step. Any change to how a fight plays shows up as a diff in
 * `__snapshots__/fightTraces.test.ts.snap`; update it with `vitest -u` only when the
 * change is meant.
 */

const fights: Encounter[] = encounters.filter((e) => e.enemy);

describe('2D fight traces (#163)', () => {
  it('trace every fight', () => {
    expect(fights.length).toBeGreaterThan(70);
  });

  it.each(fights.map((e) => [e.id, e] as const))('%s', (_, e) => {
    expect(trace(e)).toMatchSnapshot();
  });
});
