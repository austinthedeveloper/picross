import { describe, expect, it } from 'vitest';
import { deriveClues } from '../engine/clues';
import { solve } from '../engine/solver';
import { transformGrid } from '../engine/transform';
import { CHIP_DAMAGE } from '../game/battle';
import { POWERS } from '../ui/powers';
import { enemyPowers, parseEnemy, phasePowers, startingPowers } from './enemies';
import { parsePuzzle } from './format';
import { getEncounter, runs } from './runs';

const powersOf = (id: string) => enemyPowers(getEncounter(id)!.enemy!);

describe('enemy powers (#79)', () => {
  it.each([
    ['goblin', []],
    ['fog-bat', ['fog']],
    ['mimic', ['swap']],
    ['clockwork-owl', ['scramble']],
    ['forger', ['fakes']],
    ['armored-beetle', ['armor']],
    ['electric-eel', ['charge']],
    ['cuttlefish', ['ink']],
    ['old-tess', ['ink', 'charge']],
    ['curator', ['fog', 'scramble', 'swap']],
    ['museum-rex', ['scramble', 'swap']],
    ['snapjaw', ['charge', 'swap']],
    ['spore-puff', ['fog', 'ink']],
    ['ironbark', ['scramble', 'armor']],
    ['mother-bramble', ['fog', 'ink', 'swap']],
    ['funhouse-mirror', ['scramble', 'swap']],
    ['madame-vesper', ['fakes', 'ink']],
    ['great-bruno', ['armor', 'charge']],
    ['ringmaster', ['scramble', 'fakes', 'charge', 'swap']],
    ['whiteout', ['fog', 'ink']],
    ['falling-star', ['scramble', 'fakes']],
    ['ice-mammoth', ['fog', 'armor', 'charge']],
    ['yeti', ['fog', 'scramble', 'ink', 'charge']],
    ['tin-soldier', ['fog', 'scramble', 'armor']],
    ['signal-box', ['fog', 'scramble']],
    ['ticket-inspector', ['fakes', 'charge']],
    ['coal-heap', ['armor', 'ink']],
    ['the-1159', ['fog', 'scramble', 'swap', 'charge']],
    ['rusted-sentry', ['armor', 'swap']],
    ['cellar-ooze', ['scramble', 'ink']],
    ['rat-king', ['fakes', 'swap']],
    ['old-wyrm', ['scramble', 'armor', 'fakes', 'charge', 'ink']],
    ['spark-hound', ['scramble', 'charge']],
    ['failed-clone', ['fog', 'swap']],
    ['reviewer-two', ['armor', 'fakes']],
    ['ostrander', ['scramble', 'fakes', 'swap', 'ink']],
    ['weathervane', ['rotate']],
  ])('%s: %j', (id, powers) => {
    expect(powersOf(id)).toEqual(powers);
  });

  it('splits what an enemy starts with from what its phases bring', () => {
    const tess = getEncounter('old-tess')!.enemy!;
    expect(startingPowers(tess)).toEqual([]);
    expect(phasePowers(tess.phases![2])).toEqual(['charge']);
  });

  it('every power any enemy has comes with a tip', () => {
    const all = runs
      .flatMap((r) => r.encounters)
      .flatMap((e) => (e.enemy ? enemyPowers(e.enemy) : []));
    for (const power of all) expect(POWERS[power]?.tip).toBeTruthy();
  });
});

describe('suspects (#64)', () => {
  const puzzle = parsePuzzle({
    id: 'p',
    name: 'P',
    width: 3,
    height: 3,
    solution: ['##.', '.#.', '###'],
  });
  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  const forger = (suspects: unknown) =>
    parseEnemy({ name: 'F', hp: 10, attack: 1, fakes: { rows: [0] }, suspects }, puzzle, fail);

  it('hold every fake plus at least one honest line', () => {
    expect(forger({ rows: [0, 2] }).suspects).toEqual({ rows: [0, 2], cols: [] });
  });

  it.each([
    [{ rows: [2, 1] }, /include every fake/],
    [{ rows: [0] }, /at least one honest line/],
    [undefined, /include every fake/],
  ])('rejects %j', (suspects, error) => {
    expect(() => forger(suspects)).toThrow(error);
  });
});

describe('turns (#83)', () => {
  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  const square = parsePuzzle({ id: 's', name: 'S', width: 2, height: 2, solution: ['#.', '##'] });
  const wide = parsePuzzle({ id: 'w', name: 'W', width: 3, height: 2, solution: ['#..', '###'] });
  const vane = (data: object, puzzle = square) =>
    parseEnemy({ name: 'V', hp: 10, attack: 1, ...data }, puzzle, fail);

  it('turns every few lines, from the start or a phase', () => {
    expect(vane({ rotate: 6 }).rotate).toBe(6);
    expect(vane({ phases: [{ at: 0.5, rotate: 4 }] }).phases![0].rotate).toBe(4);
    expect(phasePowers(vane({ phases: [{ at: 0.5, rotate: 4 }] }).phases![0])).toEqual(['rotate']);
  });

  it.each([
    [{ rotate: 1 }, square, /at least 2 lines/],
    [{ rotate: 6 }, wide, /square puzzle/],
    [{ phases: [{ at: 0.5, rotate: 4 }] }, wide, /phase 1 rotate needs a square puzzle/],
  ])('rejects %j', (data, puzzle, error) => {
    expect(() => vane(data, puzzle)).toThrow(error);
  });

  describe('the Weathervane', () => {
    const { puzzle, enemy } = getEncounter('weathervane')!;

    it('leaves room for the finisher', () => {
      expect((puzzle.width + puzzle.height) * CHIP_DAMAGE).toBeLessThanOrEqual((enemy!.hp * 2) / 3);
    });

    it('is lopsided, so every turn changes the board, and solvable in every turn', () => {
      for (const turns of [1, 2, 3]) {
        const turned = transformGrid(puzzle.solution, turns);
        expect(turned.cells).not.toEqual(puzzle.solution.cells);
        const { rows, cols } = deriveClues(turned);
        expect(solve(turned.width, turned.height, { rows, cols }).status).toBe('unique');
      }
    });
  });
});
