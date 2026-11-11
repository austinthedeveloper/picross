import {
  StoryBattle,
  type BattleBoard,
  type FightEvent,
  type FightState,
} from '@picross/story/fight/battle';
import { BLOCK_RULES } from '@picross/story/fight/rules';
import type { Clue } from '../engine/clues';
import type { Puzzle } from '../puzzles/format';
import type { Enemy, Phase } from '../story/data';
import { blockFightBoard } from './fightBoard';

export { finishedLines, WARM_UP_SHARE } from './fightBoard';
export {
  ARMOR_HIT_DAMAGE,
  ARMOR_HIT_LINES,
  BOMB_DAMAGE,
  CALL_OUT_DAMAGE,
  CHIP_DAMAGE,
  FALSE_ACCUSATION_HEAL,
  TARGET_DAMAGE,
  ZAP_DAMAGE,
  type FightCounts,
} from '@picross/story/fight/battle';

/**
 * A story fight on a block: the story's one battle (`StoryBattle` in
 * `@picross/story/fight/battle`, #166) on the block's `FightBoard` (`fightBoard.ts`, #165),
 * with Cubed's rules (`BLOCK_RULES`). Lines run along three axes; finishing a line (every
 * cube that isn't the shape broken, none that is) chips the enemy, and the solved shape is
 * the finishing blow. Each power picks its lines when it lands, checking the block can
 * still be solved from what's on it.
 *
 * What's the block's own here: the clues a fight starts from (`base`), a scrambled clue
 * (its count without its pieces), and the clues a hint may use (`hintClues`).
 */

/** Everything about a fight that changes, as plain data (saved with the run). */
export type BattleState = FightState<Clue>;

/** Something that happened, for the screen to show and sound. */
export type BattleEvent = FightEvent<Phase>;

/**
 * The clues a fight starts from. Free play hides about half the clues; an enemy that hides
 * clues itself (fog, scrambles, forgeries) starts from all of them instead, so its powers
 * have room and the block stays solvable.
 */
function fightClues(enemy: Enemy, puzzle: Puzzle): (Clue | null)[] {
  const phases = enemy.phases ?? [];
  const hides =
    Boolean(enemy.fog || enemy.scramble || enemy.fakes) || phases.some((p) => p.fog || p.scramble);
  return hides ? [...puzzle.allClues] : [...puzzle.clues];
}

/** The block as a battle asks for it: its cubes are the marks. */
function blockBoard(puzzle: Puzzle, base: readonly (Clue | null)[]): BattleBoard<Clue, Uint8Array> {
  return {
    at: (blocks) => blockFightBoard(puzzle, blocks && { blocks }, base),
    scrambled: (clue) => ({ count: clue.count, pieces: null }),
  };
}

export class Battle extends StoryBattle<Clue, Uint8Array, Enemy> {
  /** The clues the fight starts from (`fightClues`). */
  readonly base: (Clue | null)[];
  readonly puzzle: Puzzle;

  constructor(
    enemy: Enemy,
    puzzle: Puzzle,
    hitsOn: boolean,
    saved?: BattleState,
    opts: { seed?: number; maxHp?: number; blocks?: Uint8Array } = {},
  ) {
    const base = fightClues(enemy, puzzle);
    super(enemy, BLOCK_RULES, blockBoard(puzzle, base), hitsOn, saved, {
      seed: opts.seed,
      maxHp: opts.maxHp,
      marks: opts.blocks,
    });
    this.base = base;
    this.puzzle = puzzle;
  }

  /** The clues a player can trust right now (for hints): no fog, no suspects. */
  hintClues(): (Clue | null)[] {
    const finished = new Set(this.state.struck);
    return blockFightBoard(this.puzzle, undefined, this.base)
      .readableClues(this.hidden())
      .map((c, i) => (finished.has(i) ? this.base[i] : c));
  }
}
