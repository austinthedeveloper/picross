import { deriveClues } from '@picross/grid/engine/clues';
import type { Line, LineSet } from '@picross/grid/engine/lines';
import { transformGrid } from '@picross/grid/engine/transform';
import type { Puzzle } from '@picross/grid/puzzles/format';
import {
  StoryBattle,
  ARMOR_HIT_DAMAGE,
  ARMOR_HIT_LINES,
  CALL_OUT_DAMAGE,
  CHIP_DAMAGE,
  FALSE_ACCUSATION_HEAL,
  ZAP_DAMAGE,
  type HandOver,
} from '@picross/story/fight/battle';
import type { BoardKind } from '@picross/story/fight/board';
import { GRID_RULES } from '@picross/story/fight/rules';
import {
  ANY_HEIGHT,
  NO_BOARD,
  decode,
  encode,
  fightEnemy,
  onBattle,
  onState,
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

/**
 * The two boards a fight can be on. Which one a fight is on is `boardAt`, and the switch
 * is the story's (`@picross/story/fight/switch`).
 */
export type Board = BoardKind;

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

export { ARMOR_HIT_DAMAGE, ARMOR_HIT_LINES, CALL_OUT_DAMAGE, CHIP_DAMAGE };
export { FALSE_ACCUSATION_HEAL, ZAP_DAMAGE };

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
  return phasesOn(enemy, state, size, (b) => b.startPhases());
}

/** Starts phases (`start`) on the 2D save, writing what they took as the 2D game did. */
function phasesOn(
  enemy: Enemy,
  state: BattleState,
  size: number,
  start: (battle: GridBattle) => ReturnType<GridBattle['startPhases']>,
): { state: BattleState; entered: Phase[] } {
  const { state: next, result } = onBattle(enemy, state, { size }, start, (events) => {
    const order: Plan['order'] & string[] = ['phase'];
    for (const e of events) {
      if (e.kind !== 'phase') continue;
      if (e.phase.fog) order.push('fog');
      if (e.phase.scramble) order.push('scramble');
    }
    return { order, touch: order.slice(1) };
  });
  const entered = result.flatMap((e) => (e.kind === 'phase' ? [enemy.phases![e.index]] : []));
  return { state: next, entered };
}

/**
 * The fight's own part of a 2D battle (HP, phases, patch kit, counts), for the block to
 * take over when a boss switches board (`StoryBattle.enterBoard`, #170).
 */
export function handOver(enemy: Pick<Enemy, 'hp'>, state: BattleState): HandOver {
  const { enemyHp, maxHp, phase, shield, counts } = decode(state, enemy, ANY_HEIGHT);
  return { enemyHp, maxHp, phase, shield, counts };
}

/**
 * Back on the flat board, taking the fight over from the block (`from`, #170): its share of
 * HP, patch kit and counts, then the phases it reached start here (their fog and scrambles
 * land on this board). `size` turns phase pools with a turned board, as `advancePhase`.
 */
export function enterFlat(
  enemy: Enemy,
  state: BattleState,
  from: HandOver,
  size = 0,
): { state: BattleState; entered: Phase[] } {
  return phasesOn(enemy, state, size, (b) => b.enterBoard(from));
}

/**
 * The 2D battle with the fight's counts (`from`'s): a fight that ends on its block has them
 * there, and the run's tally and badges read them here (#170).
 */
export function takeCounts(state: BattleState, from: Pick<HandOver, 'counts'>): BattleState {
  return onState(state, (b) => void (b.state.counts = { ...from.counts })).state;
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
