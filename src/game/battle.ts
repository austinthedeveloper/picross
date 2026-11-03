import {
  copyLines,
  hasLine,
  lineCount,
  lineKey,
  lineKeys,
  linesRemoved,
  removeLine,
  type Line,
  type LineSet,
} from '../engine/lines';
import { washInk } from '../engine/ink';
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
  fog?: LineSet;
  /** Clues shown with their runs in unknown order at the start (#49). */
  scramble?: LineSet;
  /** Boss phases (#42), in the order they trigger. */
  phases?: Phase[];
  /** Armor (#50): blocks line damage until its weak points are solved. */
  armor?: Armor;
  /** Lines whose clues are forged (#64) until you call them out. */
  fakes?: LineSet;
  /**
   * Seconds for the charge meter to fill (the Electric Eel, #67). Completing a
   * line drains it; if it fills, the enemy zaps you.
   */
  charge?: number;
}

/**
 * While any weak point is left, ordinary lines deal no damage and the enemy
 * hits for `attack`. Each weak-point line you complete deals triple damage and
 * cracks the armor; after the last one it breaks and normal rules return.
 */
export interface Armor {
  weakPoints: LineSet;
  /** The enemy's attack while armored. */
  attack: number;
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
  fog?: LineSet;
  /** LineSet at most this many of those lines (default: all of them). */
  fogCount?: number;
  /** Lines this phase can scramble, in priority order (#49). */
  scramble?: LineSet;
  /** Scramble at most this many of those lines (default: all of them). */
  scrambleCount?: number;
  /** One line shown in the phase banner. */
  taunt?: string;
  /** Swaps two of your unfinished lines and wipes them when the phase starts (the Mimic, #48). */
  swap?: boolean;
  /** Splashes a block of ink this many cells across over your marks (#67). */
  ink?: number;
  /** How many ink blocks the phase splashes (default 1). */
  inkCount?: number;
  /** Starts or changes the charge meter: seconds to fill (#67). */
  charge?: number;
}

/** A fight in progress. Saved with the run so a reload resumes it. */
export interface BattleState {
  enemyHp: number;
  /** Lines that have already dealt chip damage ("r3", "c0"), so each counts once. */
  struck: string[];
  /** Enemy hits still blocked by a patch kit (#28). */
  shield?: number;
  /** Clues still fogged (#30). */
  fog?: LineSet;
  /** How many of the enemy's phases have started (#42). */
  phase?: number;
  /** Clues still scrambled (#49). */
  scramble?: LineSet;
  /** Weak points not yet solved (#50); armor is up while any are left. */
  armor?: LineSet;
  /** Forged clues not yet called out (#64). */
  fakes?: LineSet;
  /** Board cells covered in ink (#67); completing a line through them washes it off. */
  ink?: number[];
  /** Lines the Mimic wiped (#78), highlighted until you complete them again. */
  wiped?: LineSet;
}

/** Damage per weak-point line while armor is up. */
export const WEAK_POINT_DAMAGE = 3;

const armorUp = (state: BattleState) => Boolean(state.armor && lineCount(state.armor));

/** Damage per newly completed row or column. */
export const CHIP_DAMAGE = 1;

export function startBattle(enemy: Enemy): BattleState {
  const state: BattleState = { enemyHp: enemy.hp, struck: [] };
  if (enemy.fog) state.fog = copyLines(enemy.fog);
  if (enemy.armor) state.armor = copyLines(enemy.armor.weakPoints);
  if (enemy.scramble) state.scramble = copyLines(enemy.scramble);
  if (enemy.fakes) state.fakes = copyLines(enemy.fakes);
  return state;
}

/** The enemy as it is now: its name, sprite, attack, and charge speed after any phases. */
export function currentForm(enemy: Enemy, state: BattleState) {
  let { name, sprite, attack, charge } = enemy;
  for (const phase of (enemy.phases ?? []).slice(0, state.phase ?? 0)) {
    name = phase.name ?? name;
    sprite = phase.sprite ?? sprite;
    attack = phase.attack ?? attack;
    charge = phase.charge ?? charge;
  }
  if (enemy.armor && armorUp(state)) attack = enemy.armor.attack;
  return { name, sprite, attack, charge, armored: armorUp(state) };
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
  pool: LineSet | undefined,
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

/** Clears fog, scramble, or a wipe mark from newly completed lines. Returns the lines cleared. */
function liftLines(
  state: BattleState,
  key: 'fog' | 'scramble' | 'wiped',
  lines: Line[],
): { state: BattleState; revealed: Line[] } {
  const before = state[key];
  if (!before) return { state, revealed: [] };
  let after = before;
  for (const { kind, index } of lines) after = removeLine(after, kind, index);
  const revealed = linesRemoved(before, after);
  return { state: { ...state, [key]: after }, revealed };
}

/** Lifts fog from newly completed lines. Returns the lines revealed. */
export const clearFog = (state: BattleState, lines: Line[]) => liftLines(state, 'fog', lines);

/** Washes ink out of newly completed lines (#67). Returns the cells washed. */
export function clearInk(
  state: BattleState,
  lines: Line[],
  width: number,
): { state: BattleState; washed: number[] } {
  if (!state.ink?.length) return { state, washed: [] };
  const { ink, washed } = washInk(state.ink, lines, width);
  return washed.length ? { state: { ...state, ink }, washed } : { state, washed };
}

/** Marks lines the Mimic just wiped (#78). */
export function markWiped(state: BattleState, kind: Line['kind'], lines: number[]): BattleState {
  const wiped = state.wiped ?? { rows: [], cols: [] };
  const add = (list: number[]) => [...new Set([...list, ...lines])];
  return {
    ...state,
    wiped:
      kind === 'row' ? { ...wiped, rows: add(wiped.rows) } : { ...wiped, cols: add(wiped.cols) },
  };
}

/** Clears the wipe mark from lines you've refilled (#78). Returns the lines cleared. */
export const clearWiped = (state: BattleState, lines: Line[]) => liftLines(state, 'wiped', lines);

/** Unscrambles newly completed lines (#49). Returns the lines put back in order. */
export const clearScramble = (state: BattleState, lines: Line[]) =>
  liftLines(state, 'scramble', lines);

/**
 * Deals chip damage for completed lines that haven't struck yet. Chip damage
 * never drops the enemy below 1 HP: only the finished picture defeats it.
 */
export function chip(
  state: BattleState,
  keys: string[],
): { state: BattleState; dealt: number; cracked: string[]; broke: boolean } {
  const fresh = [...new Set(keys)].filter((k) => !state.struck.includes(k));
  if (!fresh.length) return { state, dealt: 0, cracked: [], broke: false };
  let damage = fresh.length * CHIP_DAMAGE;
  let next: BattleState = { ...state, struck: [...state.struck, ...fresh] };
  let cracked: string[] = [];
  let broke = false;
  if (armorUp(state)) {
    // Armor: only weak points hurt (triple), and each one solved cracks it.
    const weak = lineKeys(state.armor!);
    cracked = fresh.filter((k) => weak.includes(k));
    damage = cracked.length * WEAK_POINT_DAMAGE;
    const left = (kind: 'r' | 'c', list: number[]) =>
      list.filter((i) => !cracked.includes(`${kind}${i}`));
    next = {
      ...next,
      armor: { rows: left('r', state.armor!.rows), cols: left('c', state.armor!.cols) },
    };
    broke = !armorUp(next);
  }
  const enemyHp = Math.max(1, state.enemyHp - damage);
  return { state: { ...next, enemyHp }, dealt: state.enemyHp - enemyHp, cracked, broke };
}

/** Damage for calling out a forged clue (#64). */
export const CALL_OUT_DAMAGE = 5;

/** HP the enemy touches up when you accuse an honest clue in a Relaxed run. */
export const FALSE_ACCUSATION_HEAL = 3;

/**
 * You accuse a clue of being forged (#64). A forged one is unmasked and deals
 * call-out damage (never below 1 HP, like chip damage). An honest one costs
 * you: the caller lets the enemy hit, or in a Relaxed run it heals.
 */
export function callOut(
  state: BattleState,
  line: Line,
): { state: BattleState; caught: boolean; dealt: number } {
  if (!state.fakes || !hasLine(state.fakes, line.kind, line.index)) {
    return { state, caught: false, dealt: 0 };
  }
  const enemyHp = Math.max(1, state.enemyHp - CALL_OUT_DAMAGE);
  const fakes = removeLine(state.fakes, line.kind, line.index);
  return { state: { ...state, fakes, enemyHp }, caught: true, dealt: state.enemyHp - enemyHp };
}

/** An honest clue accused in a Relaxed run: the enemy recovers a little. */
export function heal(state: BattleState, maxHp: number): { state: BattleState; healed: number } {
  const enemyHp = Math.min(maxHp, state.enemyHp + FALSE_ACCUSATION_HEAL);
  return { state: { ...state, enemyHp }, healed: enemyHp - state.enemyHp };
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
  if (effect.kind === 'wash') return { state: { ...state, ink: [] }, dealt: 0 };
  const enemyHp = Math.max(1, state.enemyHp - effect.amount);
  return { state: { ...state, enemyHp }, dealt: state.enemyHp - enemyHp };
}

/** An enemy hit lands unless a shield absorbs it. */
export function absorbHit(state: BattleState): { state: BattleState; blocked: boolean } {
  if (!state.shield) return { state, blocked: false };
  return { state: { ...state, shield: state.shield - 1 }, blocked: true };
}
