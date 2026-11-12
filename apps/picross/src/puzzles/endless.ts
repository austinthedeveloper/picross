import { shuffled } from '@picross/shared/engine/random';
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

/**
 * The board an Endless run fights on (#158), picked when it starts: Flat, Cubed (every fight
 * on a block), or Mixed (flat and block by turns, flat first). Digs and rest stops are flat.
 */
export type EndlessBoard = 'flat' | 'cubed' | 'mixed';
export const ENDLESS_BOARDS: readonly EndlessBoard[] = ['flat', 'cubed', 'mixed'];

/**
 * Each board choice's run id, so each keeps its own best depth: Flat's is Endless's old id,
 * so bests from before carry on there.
 */
export const endlessId = (board: EndlessBoard): string =>
  board === 'flat' ? ENDLESS_ID : `${ENDLESS_ID}-${board}`;

/** The board an Endless job id plays on (flat for anything that isn't one). */
export const endlessBoardOf = (id: string): EndlessBoard =>
  ENDLESS_BOARDS.find((board) => endlessId(board) === id) ?? 'flat';

/** The deepest any Endless run has gone, on any board (Endless badges count them all). */
export const deepestEndless = (best: (id: string) => number | undefined): number =>
  Math.max(0, ...ENDLESS_BOARDS.map((board) => best(endlessId(board)) ?? 0));

/** Whether a job id is one of Endless's. */
export const isEndlessId = (id: string): boolean =>
  ENDLESS_BOARDS.some((board) => endlessId(board) === id);

const BOARD_NAMES: Record<EndlessBoard, string> = {
  flat: 'Endless',
  cubed: 'Endless · Cubed',
  mixed: 'Endless · Mixed',
};

/** What an endless run draws from: chosen when it starts, so a reload plays the same order. */
export interface EndlessSetup {
  seed: number;
  fights: string[];
  digs: string[];
  /** Rest stops (#77). Missing in runs started before they existed. */
  rests?: string[];
  /** Its board (#158). Missing in runs started before there was a choice: flat. */
  board?: EndlessBoard;
}

/** Whether the `fight`th fight (from 0) is on a block: all of them on Cubed, every other on Mixed. */
export const fightOnBlock = (setup: Pick<EndlessSetup, 'board'>, fight: number): boolean =>
  setup.board === 'cubed' || (setup.board === 'mixed' && fight % 2 === 1);

/** How many block fights come before the `fight`th fight. */
export const blockFightsBefore = (setup: Pick<EndlessSetup, 'board'>, fight: number): number =>
  setup.board === 'cubed' ? fight : setup.board === 'mixed' ? Math.floor(fight / 2) : 0;

/** Every fourth node is a break: digs keep gadgets coming, rest stops heal (#77). */
export const isBreak = (node: number) => node % BREAK_EVERY === BREAK_EVERY - 1;

/** How many fights come before `node`. */
export const fightsBefore = (node: number) => node - Math.floor((node + 1) / BREAK_EVERY);

/** What depth scales on an enemy: either board's (a block's counts its lines differently). */
interface Scalable {
  hp: number;
  attack: number;
  phases?: readonly { attack?: number }[];
  armor?: { attack: number };
}

/** An enemy at depth: +15% HP every 3 fights, +1 attack every 4 (phases scale with HP). */
export function scaleEnemy<E extends Scalable>(enemy: E, fights: number): E {
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
    // A fight on a block keeps its enemy; the block is picked when it opens (#158).
    ...(base.enemy &&
      !isBreak(node) &&
      fightOnBlock(setup, fight) && {
        onBlock: { of: base.id, fight, nth: blockFightsBefore(setup, fight), seed: setup.seed },
      }),
  };
  delete encounter.scene;
  return encounter;
}

/** The pools for a new endless run: every fight, dig and rest stop from the jobs you've played. */
export function endlessSetup(
  jobs: readonly RunDef[],
  seed: number,
  board: EndlessBoard = 'flat',
): EndlessSetup {
  const all = jobs.flatMap((j) => j.encounters);
  const ids = (kind: Encounter['kind']) => [
    ...new Set(all.filter((e) => e.kind === kind).map((e) => e.id)),
  ];
  const setup: EndlessSetup = { seed, fights: ids('fight'), digs: ids('dig'), rests: ids('rest') };
  return board === 'flat' ? setup : { ...setup, board };
}

/** The endless run as a run definition: the encounters up to a few past the current one. */
export function endlessRun(state: RunState): RunDef | undefined {
  if (!state.endless) return undefined;
  return {
    id: state.runId,
    name: BOARD_NAMES[state.endless.board ?? 'flat'],
    hp: ENDLESS_HP,
    gadgets: ENDLESS_GADGETS,
    endless: true,
    encounters: Array.from({ length: state.node + 1 + LOOKAHEAD }, (_, n) =>
      endlessEncounter(state.endless!, n),
    ),
  };
}
