import type { Blast } from '@picross/grid/engine/blast';
import type { Board } from '@picross/grid/engine/board';
import {
  hasLine,
  keyToLine,
  lineCount,
  lineKey,
  lineKeys,
  noLines,
  unionLines,
  type Line,
  type LineSet,
} from '@picross/grid/engine/lines';
import type { Swap } from '@picross/grid/engine/swap';
import { blastOf, gridFightBoard, lineAt, lineId, swapOf } from '@picross/grid/game/fightBoard';
import type { Puzzle } from '@picross/grid/puzzles/format';
import type { GadgetEffect } from '@picross/story/puzzles/gadgets';
import {
  absorbHit,
  advancePhase,
  ARMOR_HIT_DAMAGE,
  armorHitsBack,
  blastInk,
  bump,
  callOut,
  chargeUp,
  chip,
  clearFog,
  clearInk,
  clearScramble,
  clearSuspects,
  clearWiped,
  currentForm,
  heal,
  markWiped,
  turnBattle,
  turnDue,
  turnUp,
  useGadget,
  ZAP_DAMAGE,
  type BattleState,
  type Enemy,
  type Phase,
} from './battle';

/**
 * A 2D fight's rules in one step, with no DOM, sound or timers (#163). The fight screen's
 * hooks (`ui/screens/run/fight/`) tell `gridStep` what just happened on the board, save
 * the state it returns, and show its events in order: they keep only the rendering,
 * sound, haptics and timing. The pieces are the helpers in `battle.ts`; this puts them
 * in the order a fight runs them, which on a grid is: lift what the lines clear, chip,
 * start phases, the armor's meter, the turn's, then the charge's.
 *
 * Some effects wait (`Later`): a swap or a turn until the stroke ends, ink, zaps and the
 * armor's hits until the redraw is over. The step says when one is due, and the hooks
 * run it at that moment by calling `gridStep` again with the matching input.
 *
 * The picks that depend on the board (the live line, a swap, ink, a bomb's spot, the
 * warm-up and a turn) go through the grid's `FightBoard` (`gridFightBoard`, #164), the
 * interface the story's fights are written against.
 */

/** What started a hit on you: a hit lands on your run HP unless a patch kit blocks it. */
export type HitCause = 'mistake' | 'zap' | 'armor' | 'accusation';

/** What just happened, from the board or the player. */
export type FightInput =
  /**
   * Lines that just became complete, as the board reports them: their shown clue is
   * satisfied, and they weren't a moment ago. A forged line here doesn't count until
   * it's called out. `board` is the board now, which the charge aims from.
   */
  | { kind: 'lines'; lines: readonly Line[]; board?: Board }
  /** A wrong fill was caught (Hits on). */
  | { kind: 'mistake' }
  /** The player accuses `line` of being forged. */
  | { kind: 'call-out'; line: Line; hitsOn: boolean }
  /** A gadget is used (the hooks check it can be first). */
  | { kind: 'gadget'; effect: GadgetEffect }
  /** The debug panel deals damage. */
  | { kind: 'damage'; amount: number }
  /** Make sure a line you can read is live, if the enemy charges. */
  | { kind: 'aim'; board?: Board }
  /** The board turns if it's due. */
  | { kind: 'turn' }
  /** One of the Mimic's swaps lands. */
  | { kind: 'swap'; board: Board }
  /** One phase's ink lands: `count` blocks `size` cells across (default 1). */
  | { kind: 'ink'; size: number; count?: number; board: Board }
  /** The charge's zap lands. */
  | { kind: 'zap'; hitsOn: boolean }
  /** The armor's hit lands. */
  | { kind: 'hit-back'; hitsOn: boolean }
  /** A bomb goes off; `rand` picks where (Math.random by default). */
  | { kind: 'blast'; board: Board; rand?: () => number };

/** A phase started (one event for every phase a step starts at once). */
export interface PhaseEvent {
  kind: 'phase';
  /** Phases started now, counting these. */
  phase: number;
  entered: Phase[];
  /** The enemy's name before and its form after. */
  before: string;
  name: string;
  sprite: string;
  taunt: string;
  fog?: LineSet;
  scramble?: LineSet;
  /** Lines the phases just fogged and scrambled. */
  fogged: number;
  scrambled: number;
}

/** The charge meter as it stands, after the charge aims. */
export interface ChargeEvent {
  kind: 'charge';
  /** Lines to a zap, or null when the enemy doesn't charge (the meter hides). */
  limit: number | null;
  /** Lines left in the warm-up; while any are, no line is live. */
  warmUp: number;
  charged: number;
  live: Line | null;
  /** The line that just went live, if it changed. */
  fresh: Line | null;
  /** Whether the warm-up was still running before these lines (a step's only). */
  warming: boolean;
}

export type HitEvent =
  { kind: 'hit'; amount: number; cause: HitCause } | { kind: 'blocked'; cause: HitCause };

/**
 * An effect that waits. Each runs as `gridStep` with the input of the same kind, at its
 * moment: `swap` and `turn` once no stroke is in progress, the rest once the current
 * redraw is over. In order, as they come:
 * - `aim` and `sync-turn` follow every phase, which may start the charge, fog the live
 *   line, or start or change the turn's count. `sync-turn` shows the count, then waits
 *   for a `turn`.
 * - `blast` follows a bomb, after anything its phase queued, so a phase can't undo it.
 */
export type Later =
  | { kind: 'later'; do: 'aim' | 'sync-turn' | 'turn' | 'zap' | 'hit-back' | 'blast' }
  | { kind: 'later'; do: 'swap'; count: number }
  | { kind: 'later'; do: 'ink'; splashes: { size: number; count?: number }[] };

export type FightEvent =
  | PhaseEvent
  | ChargeEvent
  | HitEvent
  | Later
  // Lines: what they clear, in this order, then exactly one `chip`, then the meters.
  /** Weak points cracked (#50); `armor` is what's left. */
  | { kind: 'cracked'; armor: LineSet; lines: Line[]; broke: boolean }
  | { kind: 'fog-lifted'; fog: LineSet; lines: Line[] }
  /** Lines the Mimic wiped, filled in again. */
  | { kind: 'refilled'; wiped: LineSet; lines: Line[] }
  /** Suspects solved, so they were honest. */
  | { kind: 'honest'; suspects: LineSet; lines: Line[] }
  | { kind: 'washed'; ink: number[]; cells: number[] }
  | { kind: 'unscrambled'; scramble: LineSet; lines: Line[] }
  /**
   * The lines' damage. Every `lines` step has one, after what the lines cleared and
   * before the meters: the hooks save the battle here, as the screen always has.
   */
  | {
      kind: 'chip';
      dealt: number;
      hp: number;
      /** Lines that counted (not forged). */
      lines: number;
      cracked: number;
      broke: boolean;
      armored: boolean;
    }
  | { kind: 'armor-meter'; lines: number; hits: number; armored: boolean }
  | { kind: 'turn-meter'; turning: number; limit: number }
  | { kind: 'grounded' }
  // Call-outs (#64).
  | { kind: 'not-suspect'; line: Line }
  | { kind: 'caught'; line: Line; dealt: number; hp: number }
  /** An honest suspect accused with Hits on: a hit follows. */
  | { kind: 'accused'; line: Line }
  /** An honest suspect accused in a Relaxed run: the enemy heals. */
  | { kind: 'healed'; line: Line; amount: number; hp: number }
  // Gadgets and the debug panel. `washed` is the ink a sponge took.
  | { kind: 'gadget'; effect: GadgetEffect['kind']; dealt: number; hp: number; washed: number[] }
  | { kind: 'damaged'; dealt: number; hp: number }
  // What waited, when it lands. After `swapped` and `blasted` (and a call-out, zap or
  // hit) the hooks refresh the board, which may report more lines. After `turned` they
  // turn the board (`turnedPuzzle`), then aim the charge again.
  | { kind: 'zapped' }
  | { kind: 'fizzled'; cause: 'zap' | 'armor' }
  | { kind: 'turned'; turns: number }
  | { kind: 'swapped'; swap: Swap; wiped: LineSet }
  | { kind: 'inked'; ink: number[]; added: number }
  | { kind: 'blasted'; blast: Blast; washed: number[] };

export interface FightStep {
  state: BattleState;
  events: FightEvent[];
}

const count = (set?: LineSet) => (set ? lineCount(set) : 0);

/** Line ids on `puzzle`'s board, from line keys ("r3", "c0"). */
const idsOf = (puzzle: Puzzle, keys: readonly string[]) =>
  new Set(keys.map((key) => lineId(puzzle.height, keyToLine(key))));

/** The grid's picks never draw (only a bomb's, which has its own `rand`). */
function noDraw(): number {
  throw new Error("A grid's fight picks are deterministic");
}

/**
 * Starts any phases the enemy's HP has fallen into (#42), with what each one queues.
 * Returns `state` itself when none start.
 */
function startPhases(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  events: FightEvent[],
): BattleState {
  const { state: next, entered } = advancePhase(enemy, state, puzzle.width);
  if (!entered.length) return state;
  const { name, sprite } = currentForm(enemy, next);
  events.push({
    kind: 'phase',
    phase: next.phase ?? 0,
    entered,
    before: currentForm(enemy, state).name,
    name,
    sprite,
    taunt: entered
      .map((p) => p.taunt)
      .filter(Boolean)
      .join(' '),
    fog: next.fog,
    scramble: next.scramble,
    fogged: count(next.fog) - count(state.fog),
    scrambled: count(next.scramble) - count(state.scramble),
  });
  events.push({ kind: 'later', do: 'aim' }, { kind: 'later', do: 'sync-turn' });
  const swaps = entered.filter((p) => p.swap).length;
  if (swaps) events.push({ kind: 'later', do: 'swap', count: swaps });
  // Ink lands after the new state is saved, so it isn't lost to the save.
  const splashes = entered.flatMap((p) => (p.ink ? [{ size: p.ink, count: p.inkCount }] : []));
  if (splashes.length) events.push({ kind: 'later', do: 'ink', splashes });
  return next;
}

/**
 * The charge (#67) makes sure a line you can read is live: the first time it shows, it
 * warms up; after that it keeps the live line unless it's finished or a phase hid it,
 * and otherwise picks another (`pickLiveLine`).
 */
function aim(
  enemy: Enemy,
  puzzle: Puzzle,
  start: BattleState,
  board: Board | undefined,
  events: FightEvent[],
  warming = false,
): BattleState {
  const limit = currentForm(enemy, start).charge;
  const none = { kind: 'charge', warmUp: 0, charged: 0, live: null, fresh: null, warming } as const;
  if (!limit || !board) {
    events.push({ ...none, limit: null });
    return start;
  }
  let state = start;
  const fight = gridFightBoard(puzzle, { board });
  // The first time the charge shows (fight start, or a phase that brings it), it warms up.
  if (state.warmUp === undefined && !state.live) {
    state = { ...state, warmUp: fight.warmUpLines() };
  }
  if (state.warmUp) {
    events.push({ ...none, limit, warmUp: state.warmUp });
    return state;
  }
  const avoid = unionLines([state.fog, state.scramble, state.suspects]);
  const { live } = state;
  const stays =
    live &&
    !hasLine(avoid, live.kind, live.index) &&
    !state.struck.includes(lineKey(live.kind, live.index));
  let next = live ?? null;
  if (!stays) {
    // Not a struck line, nor one you can't read.
    const skip = new Set([...idsOf(puzzle, state.struck), ...idsOf(puzzle, lineKeys(avoid))]);
    const id = fight.pickLive(skip, noDraw);
    next = id === null ? null : lineAt(puzzle.height, id);
  }
  const charged = state.charged ?? 0;
  if (!stays) state = { ...state, live: next ?? undefined };
  events.push({ ...none, limit, charged, live: next, fresh: stays ? null : next });
  return state;
}

/** A hit on you, unless a patch kit blocks it (#28). */
function hit(state: BattleState, cause: HitCause, amount: number): FightStep {
  const shielded = absorbHit(state);
  if (shielded.blocked) return { state: shielded.state, events: [{ kind: 'blocked', cause }] };
  return { state, events: [{ kind: 'hit', amount, cause }] };
}

/** Lines finished on the board: everything they do, in order. */
function finishLines(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  reported: readonly Line[],
  board: Board | undefined,
): FightStep {
  const events: FightEvent[] = [];
  // A line showing a forgery doesn't count until the forgery is called out (#64).
  const lines = reported.filter((l) => !hasLine(state.fakes ?? noLines(), l.kind, l.index));
  // A refilled line (after a swap, say) has already counted, so it can't move a meter again.
  const fresh = lines.filter((l) => !state.struck.includes(lineKey(l.kind, l.index)));
  const weak = state.armor;

  // Fog lifts (#30), ink washes off (#67), wipe marks go (#78), solved suspects were
  // honest (#64), scrambles restore (#49), then chip damage lands or armor takes it (#50).
  const fogged = clearFog(state, lines);
  const washedOut = clearInk(fogged.state, lines, puzzle.width);
  const refilled = clearWiped(washedOut.state, lines);
  const cleared = clearSuspects(refilled.state, lines);
  const unscrambled = clearScramble(cleared.state, lines);
  const chipped = chip(
    unscrambled.state,
    lines.map((l) => lineKey(l.kind, l.index)),
  );
  if (chipped.cracked.length || chipped.broke) {
    events.push({
      kind: 'cracked',
      armor: chipped.state.armor ?? noLines(),
      lines: chipped.cracked.map(keyToLine),
      broke: chipped.broke,
    });
  }
  let next = startPhases(enemy, puzzle, chipped.state, events);
  if (fogged.revealed.length && next.fog) {
    events.push({ kind: 'fog-lifted', fog: next.fog, lines: fogged.revealed });
  }
  if (refilled.revealed.length) {
    events.push({ kind: 'refilled', wiped: next.wiped ?? noLines(), lines: refilled.revealed });
  }
  if (cleared.revealed.length) {
    events.push({ kind: 'honest', suspects: next.suspects ?? noLines(), lines: cleared.revealed });
  }
  if (washedOut.washed.length) {
    events.push({ kind: 'washed', ink: next.ink ?? [], cells: washedOut.washed });
  }
  if (unscrambled.revealed.length && next.scramble) {
    events.push({ kind: 'unscrambled', scramble: next.scramble, lines: unscrambled.revealed });
  }
  events.push({
    kind: 'chip',
    dealt: chipped.dealt,
    hp: next.enemyHp,
    lines: lines.length,
    cracked: chipped.cracked.length,
    broke: chipped.broke,
    armored: currentForm(enemy, next).armored,
  });

  // The armor's meter (#116): other lines it shrugs off move it toward a hit back.
  if (weak && fresh.length) {
    const back = armorHitsBack(next, fresh, weak);
    next = back.state;
    const armored = currentForm(enemy, next).armored;
    events.push({ kind: 'armor-meter', lines: next.armorLines ?? 0, hits: back.hits, armored });
    for (let n = 0; n < back.hits; n++) events.push({ kind: 'later', do: 'hit-back' });
  }
  const form = currentForm(enemy, next);
  // The turn's meter (#83).
  if (form.rotate && fresh.length) {
    next = turnUp(next, fresh);
    events.push({ kind: 'turn-meter', turning: next.turning ?? 0, limit: form.rotate });
    events.push({ kind: 'later', do: 'turn' });
  }
  // The charge (#67): the live line grounds it, others charge it toward a zap.
  if (form.charge && fresh.length) {
    const warming = Boolean(next.warmUp);
    const charged = chargeUp(next, fresh, form.charge);
    next = charged.state;
    if (charged.grounded) events.push({ kind: 'grounded' });
    if (charged.zapped) events.push({ kind: 'later', do: 'zap' });
    next = aim(enemy, puzzle, next, board, events, warming);
  }
  return { state: next, events };
}

/** Accusing a 🎭 suspect (#64): a forgery is unmasked, an honest one costs you. */
function accuse(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  line: Line,
  hitsOn: boolean,
): FightStep {
  // Only 🎭 clues can be forged: tapping any other just says so.
  if (!hasLine(state.suspects ?? noLines(), line.kind, line.index)) {
    return { state, events: [{ kind: 'not-suspect', line }] };
  }
  const result = callOut(state, line);
  const events: FightEvent[] = [];
  if (result.caught) {
    const next = startPhases(enemy, puzzle, result.state, events);
    events.push({ kind: 'caught', line, dealt: result.dealt, hp: next.enemyHp });
    return { state: next, events };
  }
  if (hitsOn) {
    const accused = bump(result.state, 'wrongAccusations');
    const landed = hit(accused, 'accusation', currentForm(enemy, accused).attack);
    return { state: landed.state, events: [{ kind: 'accused', line }, ...landed.events] };
  }
  const healed = heal(bump(result.state, 'wrongAccusations'), enemy.hp);
  events.push({ kind: 'healed', line, amount: healed.healed, hp: healed.state.enemyHp });
  return { state: healed.state, events };
}

/** A gadget (#28), counted for the run's tally (#107): bombs rule out gold, sponges a badge. */
function gadget(enemy: Enemy, puzzle: Puzzle, state: BattleState, effect: GadgetEffect) {
  let counted = bump(state, 'gadgetsUsed');
  if (effect.kind === 'blast') counted = bump(counted, 'bombsUsed');
  else if (effect.kind === 'wash') counted = bump(counted, 'spongesUsed');
  const used = useGadget(counted, effect);
  const events: FightEvent[] = [];
  const next = startPhases(enemy, puzzle, used.state, events);
  const washed = effect.kind === 'wash' ? (state.ink ?? []) : [];
  events.push({ kind: 'gadget', effect: effect.kind, dealt: used.dealt, hp: next.enemyHp, washed });
  if (effect.kind === 'blast') events.push({ kind: 'later', do: 'blast' });
  return { state: next, events };
}

/**
 * One step of a 2D fight: the battle after `input`, and what happened, in the order the
 * screen shows it. `puzzle` is the board as it stands, turned if it has turned (#83).
 * Pure: the same input gives the same step (a bomb's `rand` aside).
 */
export function gridStep(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  input: FightInput,
): FightStep {
  switch (input.kind) {
    case 'lines':
      return finishLines(enemy, puzzle, state, input.lines, input.board);
    case 'mistake': {
      const counted = bump(state, 'wrongFills');
      return hit(counted, 'mistake', currentForm(enemy, counted).attack);
    }
    case 'call-out':
      return accuse(enemy, puzzle, state, input.line, input.hitsOn);
    case 'gadget':
      return gadget(enemy, puzzle, state, input.effect);
    case 'damage': {
      const used = useGadget(state, { kind: 'blast', damage: input.amount });
      const events: FightEvent[] = [];
      const next = startPhases(enemy, puzzle, used.state, events);
      events.push({ kind: 'damaged', dealt: used.dealt, hp: next.enemyHp });
      return { state: next, events };
    }
    case 'aim': {
      const events: FightEvent[] = [];
      return { state: aim(enemy, puzzle, state, input.board, events), events };
    }
    case 'turn': {
      if (!turnDue(state, currentForm(enemy, state).rotate)) return { state, events: [] };
      const next = turnBattle(state, puzzle.width, gridFightBoard(puzzle).turn() ?? undefined);
      return { state: next, events: [{ kind: 'turned', turns: next.turns ?? 0 }] };
    }
    case 'swap': {
      const fight = gridFightBoard(puzzle, { board: input.board });
      const pick = fight.pickSwap(idsOf(puzzle, state.struck));
      if (!pick) return { state, events: [] };
      const swap = swapOf(puzzle.height, pick);
      // Saved before the board is wiped, so lines it re-opens don't count as new.
      const next = markWiped(state, swap.kind, swap.lines);
      return { state: next, events: [{ kind: 'swapped', swap, wiped: next.wiped! }] };
    }
    case 'ink': {
      const fight = gridFightBoard(puzzle, { board: input.board });
      const done = idsOf(puzzle, state.struck);
      let ink = state.ink ?? [];
      for (let n = 0; n < (input.count ?? 1); n++) {
        ink = [...ink, ...fight.pickInk(input.size, new Set(ink), done, noDraw)];
      }
      const added = ink.length - (state.ink?.length ?? 0);
      if (!added) return { state, events: [] };
      return { state: { ...state, ink }, events: [{ kind: 'inked', ink, added }] };
    }
    case 'zap': {
      if (!input.hitsOn)
        return { state, events: [{ kind: 'zapped' }, { kind: 'fizzled', cause: 'zap' }] };
      const landed = hit(bump(state, 'zaps'), 'zap', ZAP_DAMAGE);
      return { state: landed.state, events: [{ kind: 'zapped' }, ...landed.events] };
    }
    case 'hit-back':
      if (!input.hitsOn) return { state, events: [{ kind: 'fizzled', cause: 'armor' }] };
      return hit(state, 'armor', ARMOR_HIT_DAMAGE);
    case 'blast': {
      const fight = gridFightBoard(puzzle, { board: input.board });
      const cells = fight.blast(idsOf(puzzle, state.struck), input.rand ?? Math.random);
      if (!cells.length) return { state, events: [] };
      const blast: Blast = blastOf(puzzle.width, cells);
      // The blast washes the ink out of the cells it hits (#115).
      const { state: next, washed } = blastInk(state, blast.cells);
      return { state: next, events: [{ kind: 'blasted', blast, washed }] };
    }
  }
}
