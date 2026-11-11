import type { Board } from '@picross/grid/engine/board';
import { keyToLine, lineKey, type LineSet } from '@picross/grid/engine/lines';
import { turnLines } from '@picross/grid/engine/transform';
import { gridFightBoard, lineAt, lineId } from '@picross/grid/game/fightBoard';
import type { Puzzle } from '@picross/grid/puzzles/format';
import type { FightBoard } from '@picross/story/fight/board';
import {
  StoryBattle,
  type BattleBoard,
  type FightCounts as StoryCounts,
  type FightEnemy,
  type FightPhase,
  type FightState,
} from '@picross/story/fight/battle';
import { GRID_RULES } from '@picross/story/fight/rules';
import type { BattleState, Enemy, FightCounts } from './battle';

/**
 * The 2D game's fight on the one battle (#166): the story's `StoryBattle` with
 * `GRID_RULES`, over the grid's `FightBoard`, and a codec between the 2D save and the
 * battle's `FightState`.
 *
 * The 2D save (`RunState.battle`, `BattleState` in `battle.ts`) keeps its shape exactly:
 * sparse (a field a fight never used isn't there), rows and columns as `LineSet`s and line
 * keys ("r3"), phases counted from 0, wrong fills as `wrongFills`. The battle wants every
 * field, lines as ids (rows, then columns: `lineId`), phases as the last one's index and
 * wrong fills as `mistakes`. So each step decodes the save, plays the battle, and encodes
 * the result back onto the save it came from: only what changed is written, in the order
 * the 2D game always wrote it, and a step that changes nothing gives the same object back.
 * Keys keep their places (the fight screen's harness checks the saved battle as written).
 *
 * A 2D enemy names its lines (`LineSet`s); the battle takes them as pools (`fightEnemy`),
 * a phase's turned with the board, since they're written for the board as drawn.
 */

/** A grid battle: lines are ids, a clue is its runs, the marks are the board in play. */
export type GridBattle = StoryBattle<number[], Board, FightEnemy>;

/**
 * Lines as ids on a board this many rows tall. A helper that only changes the state (it
 * never asks the board) may use any height taller than the board: this one.
 */
export const ANY_HEIGHT = 1 << 16;

/** A set's lines as ids: its rows, then its columns, each in order (repeats kept). */
export const lineIds = (set: LineSet | undefined, height: number): number[] =>
  set ? [...set.rows, ...set.cols.map((c) => height + c)] : [];

/** Line ids as a set, each kind in order (repeats kept). */
export function lineSet(ids: readonly number[], height: number): LineSet {
  const set: LineSet = { rows: [], cols: [] };
  for (const id of ids) (id < height ? set.rows : set.cols).push(id < height ? id : id - height);
  return set;
}

/** A line key ("r3") as an id, and back. */
export const idOf = (height: number, key: string) => lineId(height, keyToLine(key));
export const keyOf = (height: number, id: number) => {
  const { kind, index } = lineAt(height, id);
  return lineKey(kind, index);
};

/**
 * The 2D enemy as the battle reads it, on a board `height` rows tall. Its lines become
 * pools; a phase's pools are written for the board as drawn, so on a board turned `turns`
 * quarters (an n×n board, `size` across) they turn with it.
 */
export function fightEnemy(enemy: Enemy, height: number, size = 0, turns = 0): FightEnemy {
  const pool = (set: LineSet | undefined, count?: number) =>
    set && { pool: lineIds(set, height), count };
  const phases = enemy.phases?.map((p): FightPhase => ({
    ...p,
    fog: pool(p.fog && turnLines(p.fog, size, turns), p.fogCount),
    scramble: pool(p.scramble && turnLines(p.scramble, size, turns), p.scrambleCount),
  }));
  return {
    name: enemy.name,
    sprite: enemy.sprite,
    hp: enemy.hp,
    attack: enemy.attack,
    fog: pool(enemy.fog),
    scramble: pool(enemy.scramble),
    armor: enemy.armor && { targets: pool(enemy.armor.weakPoints)!, attack: enemy.armor.attack },
    fakes:
      enemy.fakes || enemy.suspects
        ? {
            fakes: pool(enemy.fakes) ?? { pool: [] },
            suspects: pool(enemy.suspects) ?? { pool: [] },
          }
        : undefined,
    charge: enemy.charge,
    rotate: enemy.rotate,
    phases,
  };
}

/** The enemy's charge and turn after the phases started (what `currentForm` says). */
function formOf(enemy: Pick<Enemy, 'charge' | 'rotate' | 'phases'>, started: number) {
  let { charge, rotate } = enemy;
  for (const phase of (enemy.phases ?? []).slice(0, started)) {
    charge = phase.charge ?? charge;
    rotate = phase.rotate ?? rotate;
  }
  return { charge, rotate };
}

/** The 2D save as the battle's state. `enemy` gives the HP to heal to, the charge and the turn. */
export function decode(
  state: BattleState,
  enemy: Pick<Enemy, 'hp' | 'charge' | 'rotate' | 'phases'>,
  height: number,
): FightState<number[]> {
  const ids = (set?: LineSet) => lineIds(set, height);
  const form = formOf(enemy, state.phase ?? 0);
  const { live, charged, warmUp, turns, turning } = state;
  const charging = form.charge || live || charged !== undefined || warmUp !== undefined;
  const c = state.counts ?? {};
  return {
    enemyHp: state.enemyHp,
    maxHp: enemy.hp,
    phase: (state.phase ?? 0) - 1,
    struck: state.struck.map((key) => idOf(height, key)),
    fog: ids(state.fog),
    scramble: ids(state.scramble),
    targets: ids(state.armor),
    armorLines: state.armorLines ?? 0,
    suspects: ids(state.suspects),
    fakes: ids(state.fakes),
    // The 2D board view forges its own clues (from the clues as drawn).
    forged: {},
    charge: charging
      ? {
          every: form.charge ?? 0,
          meter: charged ?? 0,
          live: live ? lineId(height, live) : null,
          // Absent until the charge first shows.
          ...(warmUp !== undefined && { warmUp }),
        }
      : undefined,
    turn:
      form.rotate || turns !== undefined || turning !== undefined
        ? { every: form.rotate ?? 0, meter: turning ?? 0, turns: turns ?? 0 }
        : undefined,
    ink: [...(state.ink ?? [])],
    swapped: ids(state.wiped),
    shield: state.shield ?? 0,
    seed: 1,
    counts: {
      mistakes: c.wrongFills ?? 0,
      zaps: c.zaps ?? 0,
      wrongAccusations: c.wrongAccusations ?? 0,
      gadgetsUsed: c.gadgetsUsed ?? 0,
      bombsUsed: c.bombsUsed ?? 0,
      spongesUsed: c.spongesUsed ?? 0,
    },
  };
}

type Key = Exclude<keyof BattleState, 'counts'> | 'counts';

/** Every field of the 2D save, in the order a new one is written unless a step says. */
const KEYS: Key[] = [
  'enemyHp',
  'struck',
  'fog',
  'armor',
  'scramble',
  'fakes',
  'suspects',
  'counts',
  'shield',
  'phase',
  'ink',
  'wiped',
  'live',
  'charged',
  'warmUp',
  'armorLines',
  'turns',
  'turning',
];

const COUNT_KEYS: (keyof FightCounts)[] = [
  'wrongFills',
  'zaps',
  'wrongAccusations',
  'gadgetsUsed',
  'bombsUsed',
  'spongesUsed',
];

/**
 * How a step writes the save: `order` is the order it writes fields that weren't there
 * (the rest follow in `KEYS` order); `touch` are fields it writes even unchanged, as the
 * 2D game always did (so `turning: 0` after a turn, or an empty `fog` from a phase whose
 * pool was all taken).
 */
export interface Plan {
  order?: readonly Key[];
  touch?: readonly Key[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A field that isn't written while it's this: nothing, zero, an empty list or set. */
function empty(value: unknown): boolean {
  if (value === undefined || value === null || value === 0) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object' && 'rows' in value && 'cols' in value) {
    const set = value as LineSet;
    return !set.rows.length && !set.cols.length;
  }
  return false;
}

function encodeCounts(prev: Partial<FightCounts> | undefined, counts: StoryCounts) {
  const now: FightCounts = {
    wrongFills: counts.mistakes,
    zaps: counts.zaps,
    wrongAccusations: counts.wrongAccusations,
    gadgetsUsed: counts.gadgetsUsed,
    bombsUsed: counts.bombsUsed ?? 0,
    spongesUsed: counts.spongesUsed ?? 0,
  };
  const out: Partial<FightCounts> = { ...prev };
  let changed = false;
  for (const key of COUNT_KEYS) {
    const was = prev?.[key];
    if (was === undefined ? now[key] === 0 : was === now[key]) continue;
    out[key] = now[key];
    changed = true;
  }
  return changed ? out : prev;
}

/**
 * The battle's state written back onto the 2D save it was decoded from (`prev`), by
 * `plan`. Returns `prev` itself when nothing changed.
 */
export function encode(
  prev: BattleState,
  next: FightState<number[]>,
  height: number,
  plan: Plan = {},
): BattleState {
  const set = (ids: readonly number[]) => lineSet(ids, height);
  const { charge, turn } = next;
  const value: Record<Key, unknown> = {
    enemyHp: next.enemyHp,
    struck: next.struck.map((id) => keyOf(height, id)),
    fog: set(next.fog),
    armor: set(next.targets),
    scramble: set(next.scramble),
    fakes: set(next.fakes),
    suspects: set(next.suspects),
    counts: encodeCounts(prev.counts, next.counts),
    shield: next.shield,
    phase: next.phase + 1,
    ink: [...next.ink],
    wiped: set(next.swapped),
    live: charge?.live == null ? undefined : lineAt(height, charge.live),
    charged: charge?.meter,
    warmUp: charge?.warmUp,
    // Gone once the armor's broken.
    armorLines: next.targets.length ? next.armorLines : undefined,
    turns: turn?.turns,
    turning: turn?.meter,
  };
  const out: Record<string, unknown> = { ...prev };
  const was = prev as unknown as Record<string, unknown>;
  const touch = new Set(plan.touch);
  let changed = false;
  for (const key of new Set([...(plan.order ?? []), ...KEYS])) {
    const now = value[key];
    if (!touch.has(key)) {
      const before = was[key];
      if (before === undefined ? empty(now) : same(before, now)) continue;
    }
    out[key] = now;
    changed = true;
  }
  return changed ? (out as unknown as BattleState) : prev;
}

/** A 2D puzzle's board as the battle asks for it: the board in play is the marks. */
export function gridBoard(puzzle: Puzzle): BattleBoard<number[], Board> {
  return {
    at: (board) => gridFightBoard(puzzle, board && { board }),
    // The 2D board view shows a scrambled clue's runs out of order itself.
    scrambled: (clue) => clue,
  };
}

/**
 * A board of only its lines, `width` by `height`: for a helper that only needs to know
 * which cells a line covers (ink washing off it).
 */
export function shapeBoard(width: number, height: number): BattleBoard<number[], Board> {
  const solution = { width, height, cells: new Array<boolean>(width * height).fill(false) };
  return gridBoard({ id: '', name: '', width, height, solution, clues: { rows: [], cols: [] } });
}

/** No board at all: for the helpers that only change the state, which never ask it. */
export const NO_BOARD: BattleBoard<number[], Board> = {
  at: () =>
    new Proxy({} as FightBoard<number[]>, {
      get: (_, key) => {
        throw new Error(`The 2D battle asked a board for ${String(key)} without a puzzle`);
      },
    }),
  scrambled: (clue) => clue,
};

/** Where a battle plays: the puzzle as the board stands, or just its height (and turn size). */
export interface Where {
  puzzle?: Puzzle;
  height?: number;
  size?: number;
  board?: BattleBoard<number[], Board>;
  hitsOn?: boolean;
}

/** An enemy with only HP: for a helper that's given the state and nothing else. */
export const someone = (state: BattleState, more: Partial<Enemy> = {}): Enemy => ({
  name: '',
  sprite: '',
  hp: state.enemyHp,
  attack: 0,
  ...more,
});

/**
 * A battle on the 2D save: `run` plays it, and the result is encoded back by `plan`
 * (which may depend on what `run` returned).
 */
export function onBattle<R>(
  enemy: Enemy,
  state: BattleState,
  where: Where,
  run: (battle: GridBattle) => R,
  plan: Plan | ((result: R, battle: GridBattle) => Plan) = {},
): { state: BattleState; result: R } {
  const { puzzle } = where;
  const height = puzzle?.height ?? where.height ?? ANY_HEIGHT;
  const size = puzzle?.width ?? where.size ?? 0;
  const battle: GridBattle = new StoryBattle(
    fightEnemy(enemy, height, size, state.turns ?? 0),
    GRID_RULES,
    where.board ?? (puzzle ? gridBoard(puzzle) : NO_BOARD),
    where.hitsOn ?? true,
    decode(state, enemy, height),
  );
  const result = run(battle);
  const how = typeof plan === 'function' ? plan(result, battle) : plan;
  return { state: encode(state, battle.state, height, how), result };
}

/** A step on the battle for a helper that's given only the state (and some numbers). */
export const onState = <R>(
  state: BattleState,
  run: (battle: GridBattle) => R,
  plan: Plan | ((result: R, battle: GridBattle) => Plan) = {},
  more: Partial<Enemy> = {},
) => onBattle(someone(state, more), state, {}, run, plan);
