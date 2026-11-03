import { describe, expect, it } from 'vitest';
import { startRun } from '../game/run';
import {
  endlessEncounter,
  endlessRun,
  endlessSetup,
  ENDLESS_ID,
  fightsBefore,
  isDig,
  scaleEnemy,
} from './endless';
import { getRun, runs } from './runs';

const setup = endlessSetup(runs, 1234);

describe('endless setup', () => {
  it('draws every fight and dig from the jobs played, once each', () => {
    const firstJob = endlessSetup([getRun('first-job')!], 1);
    expect(firstJob.fights).toEqual(['goblin', 'fog-bat', 'gremlin']);
    expect(firstJob.digs).toEqual(['dig-site']);
  });
});

describe('endlessEncounter', () => {
  it('makes every fourth node a dig', () => {
    expect([0, 1, 2, 3, 7].map(isDig)).toEqual([false, false, false, true, true]);
    expect(endlessEncounter(setup, 3).kind).toBe('dig');
    expect(fightsBefore(8)).toBe(6);
  });

  it('plays every fight once before any repeats', () => {
    const fights = Array.from({ length: 40 }, (_, n) => n)
      .filter((n) => !isDig(n))
      .slice(0, setup.fights.length)
      .map((n) => endlessEncounter(setup, n).id.split('@')[0]);
    expect(new Set(fights).size).toBe(setup.fights.length);
  });

  it('is the same for the same seed, and drops story scenes', () => {
    const order = (seed: number) =>
      Array.from({ length: 12 }, (_, n) => endlessEncounter({ ...setup, seed }, n).id);
    expect(order(1234)).toEqual(order(1234));
    expect(order(1234)).not.toEqual(order(99));
    const all = Array.from({ length: 30 }, (_, n) => endlessEncounter(setup, n));
    expect(all.some((e) => e.scene)).toBe(false);
  });
});

describe('scaleEnemy', () => {
  const enemy = {
    name: 'E',
    sprite: 'e',
    hp: 40,
    attack: 2,
    phases: [{ at: 0.5, attack: 3 }],
    armor: { weakPoints: { rows: [0], cols: [] }, attack: 4 },
  };

  it('leaves the first fights alone', () => {
    expect(scaleEnemy(enemy, 2)).toEqual(enemy);
  });

  it('adds HP every 3 fights and attack every 4, phases and armor included', () => {
    const deep = scaleEnemy(enemy, 8);
    expect(deep.hp).toBe(52); // +30%
    expect(deep.attack).toBe(4);
    expect(deep.phases![0].attack).toBe(5);
    expect(deep.armor!.attack).toBe(6);
  });
});

describe('endlessRun', () => {
  it('shows a few encounters past the current one, and never ends', () => {
    const state = { ...startRun(ENDLESS_ID, 14), node: 5, endless: setup };
    const def = endlessRun(state)!;
    expect(def.encounters).toHaveLength(9);
    expect(def.endless).toBe(true);
  });

  it('is only for endless runs', () => {
    expect(endlessRun(startRun('first-job', 12))).toBeUndefined();
  });
});
