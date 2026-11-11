import { deriveClues } from '@picross/grid/engine/clues';
import type { Line, LineSet } from '@picross/grid/engine/lines';
import { transformGrid } from '@picross/grid/engine/transform';
import { gridTurn, lineAt, lineId } from '@picross/grid/game/fightBoard';
import type { Puzzle } from '@picross/grid/puzzles/format';
import {
  StoryBattle,
  ARMOR_HIT_DAMAGE,
  ARMOR_HIT_LINES,
  CALL_OUT_DAMAGE,
  CHIP_DAMAGE,
  FALSE_ACCUSATION_HEAL,
  TARGET_DAMAGE,
  ZAP_DAMAGE,
} from '@picross/story/fight/battle';
import type { BoardTurn } from '@picross/story/fight/board';
import { GRID_RULES } from '@picross/story/fight/rules';
import type { GadgetEffect } from '@picross/story/puzzles/gadgets';
import {
  ANY_HEIGHT,
  NO_BOARD,
  encode,
  fightEnemy,
  idOf,
  keyOf,
  lineIds,
  onBattle,
  shapeBoard,
  someone,
  type GridBattle,
  type Plan,
} from './battleCodec';

/**
 * The 2D game's fights: its enemies, the battle as its run saves it (`BattleState`), and
 * the rules as helpers over that save. The rules themselves are the story's one battle
 * (`StoryBattle` with `GRID_RULES`, #166): each helper here decodes the save, plays one
 * step of the battle and encodes it back (`battleCodec.ts`), so the save keeps its shape
 * and these keep their tests. `gridStep` (`fight.ts`) plays whole steps on the battle the
 * same way.
 */

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
  /** Lines you finish before the board turns a quarter clockwise (#83). Square puzzles only. */
  rotate?: number;
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
  /** Starts or changes how many lines turn the board (#83). */
  rotate?: number;
  /**
   * Moves the fight to the other board: a block (the encounter's 3D puzzle) or back to the
   * flat grid. Each board keeps its own progress; HP and phases carry over.
   */
  board?: Board;
}

/** The two boards a fight can be on. */
export type Board = 'flat' | 'block';

/** The board a fight is on once `phases` of the enemy's phases have started. */
export function boardAt(enemy: Pick<Enemy, 'phases'>, phases = 0): Board {
  let board: Board = 'flat';
  for (const phase of (enemy.phases ?? []).slice(0, phases)) board = phase.board ?? board;
  return board;
}

/** Whether any phase moves the fight onto a block. */
export const switchesBoard = (enemy: Pick<Enemy, 'phases'>) =>
  (enemy.phases ?? []).some((p) => p.board === 'block');

/**
 * Enemy HP on a board with `maxHp`, carried from a share of it on the other board, so that
 * exactly `phases` phases have started (the two boards scale HP differently, and rounding
 * mustn't skip or repeat a phase).
 */
export function carryHp(
  share: number,
  maxHp: number,
  phases: readonly Pick<Phase, 'at'>[],
  started: number,
): number {
  let hp = Math.ceil(share * maxHp);
  if (started > 0) hp = Math.min(hp, Math.floor(phases[started - 1].at * maxHp));
  return Math.max(1, Math.min(maxHp, hp));
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
  /**
   * Quarter turns clockwise the board has made (#83), 0 to 3. The saved board and
   * every line and cell above are already turned; the puzzle is turned from this.
   */
  turns?: number;
  /** Lines finished toward the board's next turn (#83). */
  turning?: number;
}

/** Damage per weak-point line while armor is up. */
export const WEAK_POINT_DAMAGE = TARGET_DAMAGE;

export { ARMOR_HIT_DAMAGE, ARMOR_HIT_LINES, CALL_OUT_DAMAGE, CHIP_DAMAGE };
export { FALSE_ACCUSATION_HEAL, ZAP_DAMAGE };

/** Line ids on a board `height` rows tall (any, for a helper that never asks the board). */
const ids = (lines: readonly Line[], height = ANY_HEIGHT) => lines.map((l) => lineId(height, l));
const linesOf = (list: readonly number[], height = ANY_HEIGHT) =>
  list.map((id) => lineAt(height, id));

/** A step on the battle for a helper that's given only the state (and some numbers). */
const onState = <R>(
  state: BattleState,
  run: (battle: GridBattle) => R,
  plan: Plan | ((result: R, battle: GridBattle) => Plan) = {},
  more: Partial<Enemy> = {},
) => onBattle(someone(state, more), state, {}, run, plan);

export function startBattle(enemy: Enemy): BattleState {
  const battle = new StoryBattle(fightEnemy(enemy, ANY_HEIGHT), GRID_RULES, NO_BOARD, true);
  // Each power the enemy has is written, even if it starts with no lines.
  const has = (['fog', 'armor', 'scramble', 'fakes', 'suspects'] as const).filter((k) => enemy[k]);
  const order = ['enemyHp', 'struck', 'fog', 'armor', 'scramble', 'fakes', 'suspects'] as const;
  return encode({} as BattleState, battle.state, ANY_HEIGHT, {
    order,
    touch: ['enemyHp', 'struck', ...has],
  });
}

/**
 * The enemy as it is now: its name, sprite, attack, charge speed, and lines to a
 * turn after any phases.
 */
export function currentForm(enemy: Enemy, state: BattleState) {
  const { name, sprite, attack, charge, rotate, armored } = onBattle(
    enemy,
    state,
    {},
    (b) => b.current,
  ).result;
  return { name, sprite, attack, charge, rotate, armored };
}

/**
 * Starts any phases the enemy's HP has fallen into. A phase's fog covers only
 * lines you haven't completed. Returns the phases that just started. Phase pools
 * are written for the board as drawn, so on a turned board (#83) they turn with
 * it, which needs the board's `size`.
 */
export function advancePhase(
  enemy: Enemy,
  state: BattleState,
  size = 0,
): { state: BattleState; entered: Phase[] } {
  const { state: next, result } = onBattle(
    enemy,
    state,
    { size },
    (b) => b.startPhases(),
    (events) => {
      const order: Plan['order'] & string[] = ['phase'];
      for (const e of events) {
        if (e.kind !== 'phase') continue;
        if (e.phase.fog) order.push('fog');
        if (e.phase.scramble) order.push('scramble');
      }
      return { order, touch: order.slice(1) };
    },
  );
  const entered = result.flatMap((e) => (e.kind === 'phase' ? [enemy.phases![e.index]] : []));
  return { state: next, entered };
}

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

/**
 * Adds what happened on the fight's block (a boss that switches board) to its counts, so
 * badges and the run's tally see the whole fight. The 3D game counts every mistake where
 * this one counts wrong fills; they mean the same.
 */
export function withBlockCounts(state: BattleState, block: unknown): BattleState {
  const more = (block as { counts?: Record<string, number> } | undefined)?.counts;
  if (!more) return state;
  const counts = { ...state.counts };
  const add = (key: keyof FightCounts, n = 0) => (counts[key] = (counts[key] ?? 0) + n);
  add('wrongFills', more.mistakes);
  add('zaps', more.zaps);
  add('wrongAccusations', more.wrongAccusations);
  add('gadgetsUsed', more.gadgetsUsed);
  return { ...state, counts };
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

/** The fight's puzzle as the board stands after `turns` quarter turns clockwise (#83). */
export function turnedPuzzle(puzzle: Puzzle, turns = 0): Puzzle {
  if (!turns) return puzzle;
  const solution = transformGrid(puzzle.solution, turns);
  return { ...puzzle, solution, clues: deriveClues(solution) };
}

/** The finisher: the solved picture deals whatever HP the enemy has left. */
export function finish(state: BattleState): { state: BattleState; dealt: number } {
  const { state: next, result } = onState(state, (b) => b.finish());
  return { state: next, dealt: result };
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
