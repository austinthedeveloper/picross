import { describe, expect, it } from 'vitest';
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
