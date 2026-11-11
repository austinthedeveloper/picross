import { describe, expect, it } from 'vitest';
import { checkRunLinks, parseEncounter, parseRun, restHeal, type EncounterFit } from './runs';

// The 2D game's tests (apps/picross/src/puzzles/runs.test.ts) cover these with its puzzles
// and enemies; here they're read with a stand-in board.
const fit: EncounterFit<string, { name: string }> = {
  puzzle: (id) => (id === 'p' ? 'the puzzle' : undefined),
  enemy: (data, puzzle, fail) => {
    const enemy = data as { name?: string };
    if (!enemy.name) fail(`enemy needs a name (on ${puzzle})`);
    return { name: enemy.name! };
  },
};
const encounter = { id: 'e', name: 'E', kind: 'fight', puzzle: 'p', enemy: { name: 'Goblin' } };

describe('parseEncounter', () => {
  it("reads the game's puzzle and enemy", () => {
    expect(parseEncounter(encounter, fit)).toEqual({
      id: 'e',
      name: 'E',
      kind: 'fight',
      puzzle: 'the puzzle',
      enemy: { name: 'Goblin' },
    });
  });

  it('keeps rests, bosses, scenes and blurbs, and only gives fights an enemy', () => {
    const rest = { ...encounter, kind: 'rest', rest: { seconds: 60, heal: 3 }, boss: true };
    expect(parseEncounter({ ...rest, blurb: 'Sit.' }, fit)).toMatchObject({
      rest: { seconds: 60, heal: 3 },
      boss: true,
      blurb: 'Sit.',
    });
    expect(parseEncounter({ ...encounter, kind: 'dig' }, fit).enemy).toBeUndefined();
  });

  it.each([
    [{ ...encounter, id: '' }, /missing id/],
    [{ ...encounter, kind: 'shop' }, /kind must be one of fight, dig, rest/],
    [{ ...encounter, puzzle: 'nope' }, /unknown puzzle "nope"/],
    [{ ...encounter, enemy: undefined }, /fights need an enemy/],
    [{ ...encounter, enemy: {} }, /enemy needs a name \(on the puzzle\)/],
    [{ ...encounter, kind: 'rest', rest: { seconds: 5, heal: 3 } }, /rest stops need/],
    [{ ...encounter, scene: 'nope' }, /unknown scene "nope"/],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseEncounter(input, fit)).toThrow(error);
  });
});

describe('parseRun', () => {
  const find = (id: string) => (id === 'e' ? 'E' : undefined);

  it('finds its encounters in order', () => {
    const run = parseRun({ id: 'r', name: 'R', hp: 5, encounters: ['e', 'e'], order: 2 }, find);
    expect(run).toEqual({
      id: 'r',
      name: 'R',
      hp: 5,
      encounters: ['E', 'E'],
      gadgets: [],
      order: 2,
    });
  });

  it.each([
    [{ id: 'r', name: 'R', hp: 1.5, encounters: ['e'] }, /hp/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['x'] }, /unknown encounter "x"/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['e'], gadgets: ['laser'] }, /unknown gadget/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['e'], outro: 'nope' }, /unknown outro scene/],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseRun(input, find)).toThrow(error);
  });
});

describe('checkRunLinks', () => {
  const runs = (
    ...list: { id: string; requires?: string; overtimeOf?: string; bossOf?: string }[]
  ) => new Map(list.map((run) => [run.id, run]));

  it('needs the jobs a run names to be runs', () => {
    expect(() => checkRunLinks(runs({ id: 'a' }, { id: 'b', requires: 'a' }))).not.toThrow();
    expect(() => checkRunLinks(runs({ id: 'b', requires: 'a' }))).toThrow(/requires unknown/);
    expect(() => checkRunLinks(runs({ id: 'b', overtimeOf: 'a' }))).toThrow(/overtime of/);
    expect(() => checkRunLinks(runs({ id: 'b', bossOf: 'a' }))).toThrow(/boss fight of/);
  });
});

describe('restHeal', () => {
  it('heals in full in time, and a little after', () => {
    expect(restHeal({ seconds: 90, heal: 4 }, 90_000)).toBe(4);
    expect(restHeal({ seconds: 90, heal: 4 }, 90_001)).toBe(1);
  });
});
