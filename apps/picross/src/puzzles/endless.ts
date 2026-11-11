import { shuffled } from '@picross/shared/engine/random';
import type { Enemy } from '../game/battle';
import type { RunState } from '../game/run';
import { getEncounter, type Encounter, type RunDef } from './runs';

/** Endless mode (#68): fight after fight, each harder, until you're knocked out. */
export const ENDLESS_ID = 'endless';
export const ENDLESS_HP = 14;
export const ENDLESS_GADGETS = ['patch-kit'];
/** HP you get back after each fight. */
export const ENDLESS_HEAL = 2;
/** Every this-many-th node is a break from fighting: a dig or a rest stop, in turn. */
const BREAK_EVERY = 4;
/** How far ahead the map shows. */
const LOOKAHEAD = 3;

/** What an endless run draws from: chosen when it starts, so a reload plays the same order. */
export interface EndlessSetup {
  seed: number;
  fights: string[];
  digs: string[];
  /** Rest stops (#77). Missing in runs started before they existed. */
  rests?: string[];
}

/** Every fourth node is a break: digs keep gadgets coming, rest stops heal (#77). */
export const isBreak = (node: number) => node % BREAK_EVERY === BREAK_EVERY - 1;

/** How many fights come before `node`. */
export const fightsBefore = (node: number) => node - Math.floor((node + 1) / BREAK_EVERY);

/** An enemy at depth: +15% HP every 3 fights, +1 attack every 4 (phases scale with HP). */
export function scaleEnemy(enemy: Enemy, fights: number): Enemy {
  const hp = Math.round(enemy.hp * (1 + 0.15 * Math.floor(fights / 3)));
  const boost = Math.floor(fights / 4);
  return {
    ...enemy,
    hp,
    attack: enemy.attack + boost,
    ...(enemy.phases && {
      phases: enemy.phases.map((p) =>
        p.attack !== undefined ? { ...p, attack: p.attack + boost } : p,
      ),
    }),
    ...(enemy.armor && { armor: { ...enemy.armor, attack: enemy.armor.attack + boost } }),
  };
}

/**
 * Picks from a pool in shuffled cycles: every encounter once before any
 * repeats, then a fresh shuffle.
 */
function fromCycles(pool: readonly string[], index: number, seed: number): string {
  const cycle = Math.floor(index / pool.length);
  return shuffled(pool, seed + cycle * 7919)[index % pool.length];
}

/** The encounter at `node` in an endless run. Story scenes are left out. */
export function endlessEncounter(setup: EndlessSetup, node: number): Encounter {
  const fight = fightsBefore(node);
  // Breaks alternate dig, rest, dig, rest… (or whichever kind the run has).
  const n = Math.floor(node / BREAK_EVERY);
  const rests = setup.rests ?? [];
  const pool = !isBreak(node)
    ? null
    : (n % 2 === 1 && rests.length) || !setup.digs.length
      ? rests
      : setup.digs;
  const id = pool?.length
    ? fromCycles(pool, Math.floor(n / 2), setup.seed + (pool === rests ? 2 : 1))
    : fromCycles(setup.fights, fight, setup.seed);
  const base = getEncounter(id);
  if (!base) throw new Error(`Endless run uses unknown encounter "${id}"`);
  const encounter: Encounter = {
    ...base,
    id: `${base.id}@${node}`,
    ...(base.enemy && { enemy: scaleEnemy(base.enemy, fight) }),
  };
  delete encounter.scene;
  return encounter;
}

/** The pools for a new endless run: every fight, dig and rest stop from the jobs you've played. */
export function endlessSetup(jobs: readonly RunDef[], seed: number): EndlessSetup {
  const all = jobs.flatMap((j) => j.encounters);
  const ids = (kind: Encounter['kind']) => [
    ...new Set(all.filter((e) => e.kind === kind).map((e) => e.id)),
  ];
  return { seed, fights: ids('fight'), digs: ids('dig'), rests: ids('rest') };
}

/** The endless run as a run definition: the encounters up to a few past the current one. */
export function endlessRun(state: RunState): RunDef | undefined {
  if (!state.endless) return undefined;
  return {
    id: ENDLESS_ID,
    name: 'Endless',
    hp: ENDLESS_HP,
    gadgets: ENDLESS_GADGETS,
    endless: true,
    encounters: Array.from({ length: state.node + 1 + LOOKAHEAD }, (_, n) =>
      endlessEncounter(state.endless!, n),
    ),
  };
}
