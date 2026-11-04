import { describe, expect, it } from 'vitest';
import { parsePuzzle } from './format';
import { solve } from '../engine/solver';
import { CHIP_DAMAGE } from '../game/battle';
import { allScramble, allUnreadable } from './enemies';
import { getRun, parseEncounter, parseRun, restHeal, runs } from './runs';

const puzzle = parsePuzzle({ id: 'p', name: 'P', width: 2, height: 1, solution: ['#.'] });
const find = (id: string) => (id === 'p' ? puzzle : undefined);
const enemy = { name: 'Goblin', sprite: '👺', hp: 10, attack: 2 };
const encounter = { id: 'e', name: 'E', kind: 'fight', puzzle: 'p', enemy };

describe('parseEncounter', () => {
  it('resolves its puzzle and enemy', () => {
    const parsed = parseEncounter(encounter, find);
    expect(parsed.puzzle).toBe(puzzle);
    expect(parsed.enemy).toEqual(enemy);
  });

  it('only gives fights an enemy', () => {
    expect(parseEncounter({ ...encounter, kind: 'dig' }, find).enemy).toBeUndefined();
  });

  it.each([
    [{ ...encounter, kind: 'shop' }, /kind/],
    [{ ...encounter, puzzle: 'nope' }, /unknown puzzle "nope"/],
    [{ ...encounter, name: '' }, /missing name/],
    [{ ...encounter, enemy: undefined }, /need an enemy/],
    [{ ...encounter, enemy: { ...enemy, hp: 0 } }, /hp/],
    [{ ...encounter, enemy: { ...enemy, fog: { rows: [5] } } }, /fog rows and cols/],
    [{ ...encounter, enemy: { ...enemy, fog: { rows: [0], cols: [0] } } }, /not both/],
    [
      {
        ...encounter,
        enemy: { ...enemy, fog: { rows: [0] }, phases: [{ at: 0.5, fog: { cols: [0] } }] },
      },
      /not both/,
    ],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 1.5 }] } }, /between 0 and 1/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.3 }, { at: 0.6 }] } }, /decreasing/],
    [{ ...encounter, scene: 'nope' }, /unknown scene "nope"/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.5, swap: 'yes' }] } }, /swap must be/],
    [{ ...encounter, enemy: { ...enemy, armor: { weakPoints: {}, attack: 3 } } }, /weak points/],
    // the test puzzle is 2x1 '#.': row 1's runs are just "1", so its order is already known
    [{ ...encounter, enemy: { ...enemy, scramble: { rows: [0] } } }, /only one order/],
    [{ ...encounter, enemy: { ...enemy, fakes: {} } }, /at least one line/],
    [{ ...encounter, enemy: { ...enemy, suspects: { rows: [0] } } }, /only make sense with fakes/],
    [{ ...encounter, enemy: { ...enemy, charge: 1 } }, /charge must be at least 2 lines/],
    [{ ...encounter, kind: 'rest', enemy: undefined }, /rest stops need/],
    [{ ...encounter, kind: 'rest', rest: { seconds: 60, heal: 1 } }, /heal must be more than 1/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.5, ink: 0 }] } }, /ink must be/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.5, inkCount: 2 }] } }, /no ink/],
    [
      { ...encounter, enemy: { ...enemy, fog: { rows: [0] }, fakes: { rows: [0] } } },
      /both forged and fogged/,
    ],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseEncounter(input, find)).toThrow(error);
  });
});

describe('parseRun', () => {
  const e = parseEncounter(encounter, find);
  const findEncounter = (id: string) => (id === 'e' ? e : undefined);

  it('resolves its encounters in order', () => {
    const run = parseRun({ id: 'r', name: 'R', hp: 5, encounters: ['e', 'e'] }, findEncounter);
    expect(run.encounters).toEqual([e, e]);
    expect(run.gadgets).toEqual([]);
  });

  it.each([
    [{ id: 'r', name: 'R', hp: 0, encounters: ['e'] }, /hp/],
    [{ id: 'r', name: 'R', hp: 5, encounters: [] }, /needs encounters/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['x'] }, /unknown encounter "x"/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['e'], gadgets: ['laser'] }, /unknown gadget/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['e'], intro: 'nope' }, /unknown intro scene/],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseRun(input, findEncounter)).toThrow(error);
  });
});

describe('bundled runs', () => {
  it('starts with an open job, and every locked job unlocks from a real one', () => {
    expect(runs[0].requires).toBeUndefined();
    for (const run of runs) {
      expect(run.encounters.length).toBeGreaterThan(0);
      if (run.requires) expect(getRun(run.requires)).toBeDefined();
    }
  });
});

describe('bundled fights', () => {
  const fights = runs.flatMap((r) => r.encounters).filter((e) => e.enemy);

  // Chip damage from every row and column should leave at least a third of the
  // enemy's HP for the finisher, so finishing the picture is the big hit.
  it.each(fights.map((e) => [e.id, e] as const))('%s leaves room for the finisher', (_, e) => {
    const maxChip = (e.puzzle.width + e.puzzle.height) * CHIP_DAMAGE;
    expect(maxChip).toBeLessThanOrEqual((e.enemy!.hp * 2) / 3);
  });

  // Fogged, forged, and scrambled clues can't be trusted until you solve their
  // lines, so the puzzle must be solvable without guessing even with everything the
  // enemy can bring (starting and from every phase) applied from the very start.
  const size = (f: { rows: number[]; cols: number[] }) => f.rows.length + f.cols.length;
  const tricky = fights.filter(
    (e) => size(allUnreadable(e.enemy!)) + size(allScramble(e.enemy!)) > 0,
  );
  it.each(tricky.map((e) => [e.id, e] as const))(
    '%s is solvable through everything it does',
    (_, e) => {
      const { width, height, clues } = e.puzzle;
      const result = solve(width, height, clues, {
        fog: allUnreadable(e.enemy!),
        scramble: allScramble(e.enemy!),
      });
      expect(result.status).toBe('unique');
    },
  );
});

describe('rest stops', () => {
  it('give the full heal in time and a little after', () => {
    const rest = { seconds: 90, heal: 4 };
    expect(restHeal(rest, 89_000)).toBe(4);
    expect(restHeal(rest, 90_000)).toBe(4);
    expect(restHeal(rest, 90_001)).toBe(1);
  });

  it('come right before every boss', () => {
    for (const job of runs) {
      const boss = job.encounters.findIndex((e) => e.boss);
      if (boss > 0) expect(job.encounters[boss - 1].kind).toBe('rest');
    }
  });
});
