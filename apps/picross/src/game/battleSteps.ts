import type { Line, LineSet } from '@picross/grid/engine/lines';
import { gridTurn, lineAt, lineId } from '@picross/grid/game/fightBoard';
import { TARGET_DAMAGE } from '@picross/story/fight/battle';
import type { BoardTurn } from '@picross/story/fight/board';
import type { GadgetEffect } from '@picross/story/puzzles/gadgets';
import {
  ANY_HEIGHT,
  idOf,
  keyOf,
  lineIds,
  onBattle,
  onState,
  shapeBoard,
  someone,
  type Plan,
} from './battleCodec';
import type { BattleState, FightCounts } from './battle';

/**
 * The 2D game's fight rules one step at a time, on the 2D save (`BattleState`): test support
 * for `battle.test.ts`, which checks each grid rule on its own. The game itself plays whole
 * steps (`gridStep`, `fight.ts`), so nothing outside the tests imports this.
 *
 * Each helper decodes the save, runs one of `StoryBattle`'s grid-order steps and encodes it
 * back (`battleCodec.ts`), writing the fields the 2D game always wrote for that step.
 */

/** Line ids on a board `height` rows tall (any, for a helper that never asks the board). */
const ids = (lines: readonly Line[], height = ANY_HEIGHT) => lines.map((l) => lineId(height, l));
const linesOf = (list: readonly number[], height = ANY_HEIGHT) =>
  list.map((id) => lineAt(height, id));

/** Damage per weak-point line while armor is up. */
export const WEAK_POINT_DAMAGE = TARGET_DAMAGE;

/** Lifts a power from newly completed lines. Returns the lines lifted. */
function lift(
  state: BattleState,
  key: 'fog' | 'scramble' | 'wiped' | 'suspects',
  lines: Line[],
): { state: BattleState; revealed: Line[] } {
  const power = key === 'wiped' ? 'swapped' : key;
  const { state: next, result } = onState(state, (b) => b.clear(power, ids(lines)));
  return { state: next, revealed: linesOf(result) };
}

/** Lifts fog from newly completed lines. Returns the lines revealed. */
export const clearFog = (state: BattleState, lines: Line[]) => lift(state, 'fog', lines);

/** Washes ink out of newly completed lines (#67). Returns the cells washed. */
export function clearInk(
  state: BattleState,
  lines: Line[],
  width: number,
): { state: BattleState; washed: number[] } {
  if (!state.ink?.length) return { state, washed: [] };
  // A board just tall enough for the ink and the lines, to say which cells a line covers.
  const rows = lines.filter((l) => l.kind === 'row').map((l) => l.index + 1);
  const height = Math.max(1, Math.ceil((Math.max(...state.ink) + 1) / width), ...rows);
  const { state: next, result } = onBattle(
    someone(state),
    state,
    { height, board: shapeBoard(width, height) },
    (b) => b.washLines(ids(lines, height)),
  );
  return { state: next, washed: result };
}

/** Adds one to a fight's count. */
export function bump(state: BattleState, key: keyof FightCounts): BattleState {
  const story = key === 'wrongFills' ? 'mistakes' : key;
  return onState(state, (b) => {
    const { counts } = b.state;
    counts[story] = (counts[story] ?? 0) + 1;
  }).state;
}

/** A bomb's blast washes the ink out of the cells it hits (#115). Returns the cells washed. */
export function blastInk(
  state: BattleState,
  cells: readonly number[],
): { state: BattleState; washed: number[] } {
  const { state: next, result } = onState(state, (b) => b.washCells(cells));
  return { state: next, washed: result };
}

/** Marks lines the Mimic just wiped (#78). */
export function markWiped(state: BattleState, kind: Line['kind'], lines: number[]): BattleState {
  return onState(state, (b) => b.markSwapped(ids(lines.map((index) => ({ kind, index }))))).state;
}

/** Clears the wipe mark from lines you've refilled (#78). Returns the lines cleared. */
export const clearWiped = (state: BattleState, lines: Line[]) => lift(state, 'wiped', lines);

/** Clears the 🎭 from suspects you've solved: they were honest. Returns those lines. */
export const clearSuspects = (state: BattleState, lines: Line[]) => lift(state, 'suspects', lines);

/** Unscrambles newly completed lines (#49). Returns the lines put back in order. */
export const clearScramble = (state: BattleState, lines: Line[]) => lift(state, 'scramble', lines);

/**
 * Deals chip damage for completed lines that haven't struck yet. Chip damage
 * never drops the enemy below 1 HP: only the finished picture defeats it.
 */
export function chip(
  state: BattleState,
  keys: string[],
): { state: BattleState; dealt: number; cracked: string[]; broke: boolean } {
  const { state: next, result } = onState(state, (b) =>
    b.chip(keys.map((key) => idOf(ANY_HEIGHT, key))),
  );
  const cracked = result.cracked.map((id) => keyOf(ANY_HEIGHT, id));
  return { state: next, dealt: result.dealt, cracked, broke: result.broke };
}

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
  const { state: next, result } = onState(
    state,
    (b) => b.armorMeter(ids(lines), lineIds(weak, ANY_HEIGHT)),
    // It counts once the armor's still up and other lines landed, even to 0.
    (meter, b) => ({ touch: meter.others && b.state.targets.length ? ['armorLines'] : [] }),
  );
  return { state: next, hits: result.hits };
}

/**
 * You accuse a 🎭 suspect clue of being forged (#64). A forged one is unmasked
 * and deals call-out damage (never below 1 HP, like chip damage). An honest one
 * costs you: the caller lets the enemy hit, or in a Relaxed run it heals.
 */
export function callOut(
  state: BattleState,
  line: Line,
): { state: BattleState; caught: boolean; dealt: number } {
  const { state: next, result } = onState(state, (b) => b.unmask(lineId(ANY_HEIGHT, line)));
  return { state: next, ...result };
}

/** An honest clue accused in a Relaxed run: the enemy recovers a little. */
export function heal(state: BattleState, maxHp: number): { state: BattleState; healed: number } {
  const { state: next, result } = onState(state, (b) => b.heal(), {}, { hp: maxHp });
  return { state: next, healed: result };
}

/**
 * How many lines the charge waits for before it first goes live: a quarter of the board
 * (`WARM_UP_SHARE`). The grid's `FightBoard` owns it now (#164).
 */
export { WARM_UP_SHARE, warmUpLines } from '@picross/grid/game/fightBoard';

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
  // What the meter writes: the warm-up, or the count (and the live line once it goes).
  const plan = (r: { grounded: boolean; zapped: boolean }): Plan => {
    if (!live) return { touch: warmUp ? ['warmUp'] : [] };
    return {
      order: ['charged', 'live'],
      touch: r.grounded || r.zapped ? ['charged', 'live'] : ['charged'],
    };
  };
  const { state: next, result } = onState(state, (b) => b.chargeMeter(ids(lines), limit), plan, {
    charge: limit,
  });
  return { state: next, ...result };
}

/**
 * Lines you've just finished move the board toward its next quarter turn (#83).
 * Like the charge, it only moves when you finish a line, never with time.
 */
export function turnUp(state: BattleState, lines: readonly Line[]): BattleState {
  return onState(state, (b) => b.turnMeter(ids(lines))).state;
}

/**
 * Whether the board is due to turn: `limit` lines finished since the last turn. It
 * stays due until it turns, so a turn waiting on a stroke survives a reload.
 */
export const turnDue = (state: BattleState, limit: number | undefined) =>
  onState(state, (b) => b.turnDue, {}, { rotate: limit }).result;

/**
 * The battle after the n×n board turns a quarter clockwise (#83): every line it
 * marks and every cell it covers moves with the board, so fog, scrambles, weak
 * points, forgeries, wipes, ink, the live line and struck lines stay on the same
 * stretch of picture. The charge and armor counts don't change; the count to the
 * next turn starts over. `turn` is how the board moves its lines and cells: the grid's
 * `FightBoard` turn (#164), for an n×n board.
 */
export function turnBattle(
  state: BattleState,
  n: number,
  turn: BoardTurn = gridTurn(n),
): BattleState {
  return onBattle(someone(state), state, { height: n }, (b) => b.applyTurn(turn), {
    order: ['struck', 'turns', 'turning'],
    touch: ['turns', 'turning'],
  }).state;
}

/** Applies a gadget's effect to the fight. Damage follows chip rules (never below 1 HP). */
export function useGadget(
  state: BattleState,
  effect: GadgetEffect,
): { state: BattleState; dealt: number } {
  const { state: next, result } = onState(state, (b) => b.applyGadget(effect), {
    order: ['shield', 'ink', 'enemyHp'],
    touch: effect.kind === 'wash' ? ['ink'] : [],
  });
  return { state: next, dealt: result };
}

/** An enemy hit lands unless a shield absorbs it. */
export function absorbHit(state: BattleState): { state: BattleState; blocked: boolean } {
  const { state: next, result } = onState(state, (b) => b.absorb());
  return { state: next, blocked: result };
}
