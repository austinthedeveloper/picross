import { liftFog, type Fog } from '../engine/fog';
import type { GadgetEffect } from '../puzzles/gadgets';

/** An enemy in a fight encounter (#27). */
export interface Enemy {
  name: string;
  /** Placeholder art until #25: an emoji. */
  sprite: string;
  hp: number;
  /** Run HP lost each time the player fills a wrong cell. */
  attack: number;
  /** Clues hidden at the start of the fight (#30). */
  fog?: Fog;
  /** Clues shown with their runs in unknown order at the start (#49). */
  scramble?: Fog;
  /** Boss phases (#42), in the order they trigger. */
  phases?: Phase[];
}

/** A change partway through a fight, e.g. a boss turning Overcharged at half HP. */
export interface Phase {
  /** Starts once enemy HP is at or below this fraction of max (0 to 1). */
  at: number;
  name?: string;
  sprite?: string;
  /** Replaces the enemy's attack from now on. */
  attack?: number;
  /**
   * Lines this phase can fog, in priority order. Lines you've already completed
   * or that are already fogged are skipped.
   */
  fog?: Fog;
  /** Fog at most this many of those lines (default: all of them). */
  fogCount?: number;
  /** Lines this phase can scramble, in priority order (#49). */
  scramble?: Fog;
  /** Scramble at most this many of those lines (default: all of them). */
  scrambleCount?: number;
  /** One line shown in the phase banner. */
  taunt?: string;
  /** Swaps two of your unfinished rows when the phase starts (the Mimic, #48). */
  swap?: boolean;
}

/** A fight in progress. Saved with the run so a reload resumes it. */
export interface BattleState {
  enemyHp: number;
  /** Lines that have already dealt chip damage ("r3", "c0"), so each counts once. */
  struck: string[];
  /** Enemy hits still blocked by a patch kit (#28). */
  shield?: number;
  /** Clues still fogged (#30). */
  fog?: Fog;
  /** How many of the enemy's phases have started (#42). */
  phase?: number;
  /** Clues still scrambled (#49). */
  scramble?: Fog;
}

/** Damage per newly completed row or column. */
export const CHIP_DAMAGE = 1;

export const lineKey = (kind: 'row' | 'col', index: number) => `${kind[0]}${index}`;

export function startBattle(enemy: Enemy): BattleState {
  const state: BattleState = { enemyHp: enemy.hp, struck: [] };
  if (enemy.fog) state.fog = { rows: [...enemy.fog.rows], cols: [...enemy.fog.cols] };
  if (enemy.scramble) {
    state.scramble = { rows: [...enemy.scramble.rows], cols: [...enemy.scramble.cols] };
  }
  return state;
}

/** The enemy as it is now: its name, sprite, and attack after any phases. */
export function currentForm(enemy: Enemy, state: BattleState) {
  let { name, sprite, attack } = enemy;
  for (const phase of (enemy.phases ?? []).slice(0, state.phase ?? 0)) {
    name = phase.name ?? name;
    sprite = phase.sprite ?? sprite;
    attack = phase.attack ?? attack;
  }
  return { name, sprite, attack };
}

/**
 * Starts any phases the enemy's HP has fallen into. A phase's fog covers only
 * lines you haven't completed. Returns the phases that just started.
 */
export function advancePhase(
  enemy: Enemy,
  state: BattleState,
): { state: BattleState; entered: Phase[] } {
  const phases = enemy.phases ?? [];
  const entered: Phase[] = [];
  let next = state;
  while ((next.phase ?? 0) < phases.length) {
    const phase = phases[next.phase ?? 0];
    if (next.enemyHp > phase.at * enemy.hp) break;
    entered.push(phase);
    next = { ...next, phase: (next.phase ?? 0) + 1 };
    next = addFromPool(next, 'fog', phase.fog, phase.fogCount);
    next = addFromPool(next, 'scramble', phase.scramble, phase.scrambleCount);
  }
  return { state: next, entered };
}

/**
 * Adds up to `count` lines from a phase's pool to the battle's fog or
 * scramble, skipping lines you've completed and lines already affected.
 */
function addFromPool(
  state: BattleState,
  key: 'fog' | 'scramble',
  pool: Fog | undefined,
  count = Infinity,
): BattleState {
  if (!pool) return state;
  const have = state[key] ?? { rows: [], cols: [] };
  let budget = count;
  const pick = (kind: 'row' | 'col', list: number[], already: number[]) => {
    const open = list.filter(
      (i) => !already.includes(i) && !state.struck.includes(lineKey(kind, i)),
    );
    const picked = open.slice(0, budget);
    budget -= picked.length;
    return picked;
  };
  return {
    ...state,
    [key]: {
      rows: [...have.rows, ...pick('row', pool.rows, have.rows)],
      cols: [...have.cols, ...pick('col', pool.cols, have.cols)],
    },
  };
}

type LineRef = { kind: 'row' | 'col'; index: number };

/** Clears fog or scramble from newly completed lines. Returns the lines cleared. */
function liftLines(
  state: BattleState,
  key: 'fog' | 'scramble',
  lines: LineRef[],
): { state: BattleState; revealed: LineRef[] } {
  const before = state[key];
  if (!before) return { state, revealed: [] };
  let after = before;
  for (const { kind, index } of lines) after = liftFog(after, kind, index);
  const revealed = [
    ...before.rows
      .filter((i) => !after.rows.includes(i))
      .map((index) => ({ kind: 'row' as const, index })),
    ...before.cols
      .filter((i) => !after.cols.includes(i))
      .map((index) => ({ kind: 'col' as const, index })),
  ];
  return { state: { ...state, [key]: after }, revealed };
}

/** Lifts fog from newly completed lines (see `liftFog`). Returns the lines revealed. */
export const clearFog = (state: BattleState, lines: LineRef[]) => liftLines(state, 'fog', lines);

/** Unscrambles newly completed lines (#49). Returns the lines put back in order. */
export const clearScramble = (state: BattleState, lines: LineRef[]) =>
  liftLines(state, 'scramble', lines);

/**
 * Deals chip damage for completed lines that haven't struck yet. Chip damage
 * never drops the enemy below 1 HP: only the finished picture defeats it.
 */
export function chip(state: BattleState, keys: string[]): { state: BattleState; dealt: number } {
  const fresh = [...new Set(keys)].filter((k) => !state.struck.includes(k));
  if (!fresh.length) return { state, dealt: 0 };
  const enemyHp = Math.max(1, state.enemyHp - fresh.length * CHIP_DAMAGE);
  return {
    state: { ...state, enemyHp, struck: [...state.struck, ...fresh] },
    dealt: state.enemyHp - enemyHp,
  };
}

/** The finisher: the solved picture deals whatever HP the enemy has left. */
export function finish(state: BattleState): { state: BattleState; dealt: number } {
  return { state: { ...state, enemyHp: 0 }, dealt: state.enemyHp };
}

/** Applies a gadget's effect to the fight. Damage follows chip rules (never below 1 HP). */
export function useGadget(
  state: BattleState,
  effect: GadgetEffect,
): { state: BattleState; dealt: number } {
  if (effect.kind === 'shield') {
    return { state: { ...state, shield: (state.shield ?? 0) + effect.hits }, dealt: 0 };
  }
  const enemyHp = Math.max(1, state.enemyHp - effect.amount);
  return { state: { ...state, enemyHp }, dealt: state.enemyHp - enemyHp };
}

/** An enemy hit lands unless a shield absorbs it. */
export function absorbHit(state: BattleState): { state: BattleState; blocked: boolean } {
  if (!state.shield) return { state, blocked: false };
  return { state: { ...state, shield: state.shield - 1 }, blocked: true };
}
