import { describe, expect, it } from 'vitest';
import { POWERS } from '../ui/powers';
import { enemyPowers, phasePowers, startingPowers } from './enemies';
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
