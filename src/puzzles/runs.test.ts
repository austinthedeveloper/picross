import { describe, expect, it } from 'vitest';
import { parsePuzzle } from './format';
import { CHIP_DAMAGE } from '../game/battle';
import { DEFAULT_RUN_ID, getRun, parseEncounter, parseRun, runs } from './runs';

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
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseRun(input, findEncounter)).toThrow(error);
  });
});

describe('bundled runs', () => {
  it('has a playable default run', () => {
    const run = getRun(DEFAULT_RUN_ID);
    expect(run?.encounters.length).toBeGreaterThan(0);
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
});
