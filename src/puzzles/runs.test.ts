import { describe, expect, it } from 'vitest';
import { parsePuzzle } from './format';
import { DEFAULT_RUN_ID, getRun, parseEncounter, parseRun } from './runs';

const puzzle = parsePuzzle({ id: 'p', name: 'P', width: 2, height: 1, solution: ['#.'] });
const find = (id: string) => (id === 'p' ? puzzle : undefined);
const encounter = { id: 'e', name: 'E', kind: 'fight', puzzle: 'p' };

describe('parseEncounter', () => {
  it('resolves its puzzle', () => {
    expect(parseEncounter(encounter, find).puzzle).toBe(puzzle);
  });

  it.each([
    [{ ...encounter, kind: 'shop' }, /kind/],
    [{ ...encounter, puzzle: 'nope' }, /unknown puzzle "nope"/],
    [{ ...encounter, name: '' }, /missing name/],
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
  });

  it.each([
    [{ id: 'r', name: 'R', hp: 0, encounters: ['e'] }, /hp/],
    [{ id: 'r', name: 'R', hp: 5, encounters: [] }, /needs encounters/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['x'] }, /unknown encounter "x"/],
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
