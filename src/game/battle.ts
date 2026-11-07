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
   * Lines marked 🎭 as maybe forged: every fake plus some honest ones, so you know
   * which clues not to trust, but not which ones lie.
   */
  suspects?: LineSet;
  /**
   * Lines you can finish before the enemy zaps you (the Electric Eel, #67), unless
   * one of them is the live ⚡ line, which grounds the charge.
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
  /** Starts or changes the charge meter: lines to fill it (#67). */
  charge?: number;
}

/** How this fight is going (#107). Rolls up into the run's tally when the fight is won. */
export interface FightCounts {
  /** Caught wrong fills, even ones a patch kit blocks. Only Hits-on fights check fills. */
  wrongFills: number;
  /** Hits-on only, since a zap fizzles in Relaxed. Blocked zaps still count. */
  zaps: number;
  wrongAccusations: number;
  gadgetsUsed: number;
  bombsUsed: number;
  spongesUsed: number;
}

/** A fight in progress. Saved with the run so a reload resumes it. */
export interface BattleState {
  counts?: Partial<FightCounts>;
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
  /** Lines still marked 🎭: cleared when an honest one is solved or a fake is called out. */
  suspects?: LineSet;
  /** Board cells covered in ink (#67); completing a line through them washes it off. */
  ink?: number[];
  /** Lines the Mimic wiped (#78), highlighted until you complete them again. */
  wiped?: LineSet;
  /** The ⚡ line (#67): finish it to ground the charge. */
  live?: Line;
  /** Lines finished toward the next zap (#67). */
  charged?: number;
  /**
   * Lines left to finish before the charge first goes live. Set once, when the
   * charge first shows; 0 after that. Undefined in saves from before warm-ups.
   */
  warmUp?: number;
  /** Other lines finished toward the armor's next hit (#116). */
  armorLines?: number;
}

/** Damage per weak-point line while armor is up. */
export const WEAK_POINT_DAMAGE = 3;

const armorUp = (state: BattleState) => Boolean(state.armor && lineCount(state.armor));

/** The armor hits back after this many lines that aren't weak points (#116). */
export const ARMOR_HIT_LINES = 5;

/** HP the armor's hit costs. Measured in lines, like a zap, so thinking stays free. */
export const ARMOR_HIT_DAMAGE = 2;

/**
 * Lines you've just finished move the armor's meter (#116), so leaving the weak
 * points until last costs something rather than skipping the enemy's phases for
 * free. `weak` is the weak points before these lines landed; `state` is after them,
 * so breaking the armor stops the count.
 */
export function armorHitsBack(
  state: BattleState,
  lines: readonly Line[],
  weak: LineSet | undefined,
): { state: BattleState; hits: number } {
  if (!armorUp(state)) {
    if (state.armorLines === undefined) return { state, hits: 0 };
    return { state: { ...state, armorLines: undefined }, hits: 0 };
  }
  const others = lines.filter((l) => !weak || !hasLine(weak, l.kind, l.index)).length;
  if (!others) return { state, hits: 0 };
  const total = (state.armorLines ?? 0) + others;
  return {
    state: { ...state, armorLines: total % ARMOR_HIT_LINES },
    hits: Math.floor(total / ARMOR_HIT_LINES),
  };
}

/** Damage per newly completed row or column. */
export const CHIP_DAMAGE = 1;

export function startBattle(enemy: Enemy): BattleState {
  const state: BattleState = { enemyHp: enemy.hp, struck: [] };
  if (enemy.fog) state.fog = copyLines(enemy.fog);
  if (enemy.armor) state.armor = copyLines(enemy.armor.weakPoints);
  if (enemy.scramble) state.scramble = copyLines(enemy.scramble);
  if (enemy.fakes) state.fakes = copyLines(enemy.fakes);
  if (enemy.suspects) state.suspects = copyLines(enemy.suspects);
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
  key: 'fog' | 'scramble' | 'wiped' | 'suspects',
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

/** Adds one to a fight's count. */
export function bump(state: BattleState, key: keyof FightCounts): BattleState {
  return { ...state, counts: { ...state.counts, [key]: (state.counts?.[key] ?? 0) + 1 } };
}

/** A bomb's blast washes the ink out of the cells it hits (#115). Returns the cells washed. */
export function blastInk(
  state: BattleState,
  cells: readonly number[],
): { state: BattleState; washed: number[] } {
  const washed = (state.ink ?? []).filter((i) => cells.includes(i));
  if (!washed.length) return { state, washed };
  return { state: { ...state, ink: state.ink!.filter((i) => !cells.includes(i)) }, washed };
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

/** Clears the 🎭 from suspects you've solved: they were honest. Returns those lines. */
export const clearSuspects = (state: BattleState, lines: Line[]) =>
  liftLines(state, 'suspects', lines);

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
 * You accuse a 🎭 suspect clue of being forged (#64). A forged one is unmasked
 * and deals call-out damage (never below 1 HP, like chip damage). An honest one
 * costs you: the caller lets the enemy hit, or in a Relaxed run it heals.
 */
export function callOut(
  state: BattleState,
  line: Line,
): { state: BattleState; caught: boolean; dealt: number } {
  if (!state.fakes || !hasLine(state.fakes, line.kind, line.index)) {
    // An honest suspect: you paid for the answer, so its 🎭 comes off.
    if (state.suspects && hasLine(state.suspects, line.kind, line.index)) {
      const suspects = removeLine(state.suspects, line.kind, line.index);
      return { state: { ...state, suspects }, caught: false, dealt: 0 };
    }
    return { state, caught: false, dealt: 0 };
  }
  const enemyHp = Math.max(1, state.enemyHp - CALL_OUT_DAMAGE);
  const fakes = removeLine(state.fakes, line.kind, line.index);
  const suspects = state.suspects && removeLine(state.suspects, line.kind, line.index);
  return {
    state: { ...state, fakes, ...(suspects && { suspects }), enemyHp },
    caught: true,
    dealt: state.enemyHp - enemyHp,
  };
}

/** An honest clue accused in a Relaxed run: the enemy recovers a little. */
export function heal(state: BattleState, maxHp: number): { state: BattleState; healed: number } {
  const enemyHp = Math.min(maxHp, state.enemyHp + FALSE_ACCUSATION_HEAL);
  return { state: { ...state, enemyHp }, healed: enemyHp - state.enemyHp };
}

/** HP a zap costs (#67). Fixed, so a charge stays pressure rather than a run-ender. */
export const ZAP_DAMAGE = 2;

/** Share of a board's lines you finish before a charge first goes live. */
export const WARM_UP_SHARE = 0.25;

/**
 * How many lines the charge waits for before it first goes live: a quarter of the
 * board, so the opening is yours and the first live line is one you've started on.
 */
export function warmUpLines(width: number, height: number): number {
  return Math.max(1, Math.round((width + height) * WARM_UP_SHARE));
}

/**
 * Lines you've just finished move the charge meter (#67). During the warm-up they
 * count down to the first live line instead and can't zap. The live line among them
 * grounds it; otherwise each one charges it, and at `limit` the enemy zaps. Either
 * way the meter empties and the live line is cleared, ready for a new one.
 */
export function chargeUp(
  state: BattleState,
  lines: Line[],
  limit: number,
): { state: BattleState; grounded: boolean; zapped: boolean } {
  const { live, warmUp } = state;
  if (!live && warmUp)
    return {
      state: { ...state, warmUp: Math.max(0, warmUp - lines.length) },
      grounded: false,
      zapped: false,
    };
  if (!live) return { state, grounded: false, zapped: false };
  const grounded = lines.some((l) => l.kind === live.kind && l.index === live.index);
  const charged = grounded ? 0 : (state.charged ?? 0) + lines.length;
  const zapped = charged >= limit;
  if (grounded || zapped)
    return { state: { ...state, charged: 0, live: undefined }, grounded, zapped };
  return { state: { ...state, charged }, grounded, zapped };
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
  const enemyHp = Math.max(1, state.enemyHp - effect.damage);
  return { state: { ...state, enemyHp }, dealt: state.enemyHp - enemyHp };
}

/** An enemy hit lands unless a shield absorbs it. */
export function absorbHit(state: BattleState): { state: BattleState; blocked: boolean } {
  if (!state.shield) return { state, blocked: false };
  return { state: { ...state, shield: state.shield - 1 }, blocked: true };
}
