import { fightPasses } from '@picross/grid/engine/solver';
import { Battle } from '@picross/block/game/battle';
import { solve } from '@picross/block/engine/solver';
import { hashString } from '@picross/block/puzzles/hide';
import {
  getEncounter as getBlockEncounter,
  type Enemy as BlockEnemy,
} from '@picross/block/story/data';
import type { Puzzle as BlockPuzzle } from '@picross/block/puzzles/format';
import { advancePhase, startBattle } from '../game/battle';
import { allFog, allScramble } from './enemies';
import { bossFights, overtimeRuns, runs, type Encounter } from './runs';

/**
 * How hard each fight is for a line solver, on each board that can play it (#168): the
 * numbers in `fight-ratings.json`, which `npm run rate:fights` writes and
 * `fightRatings.test.ts` checks. Only the script and the test import this, so none of it
 * is in the app's download.
 *
 * Both boards count with every power that hides clues applied from the start
 * (docs/architecture.md, "Difficulty"), but each in its own solver's passes, so compare a
 * fight with others on the same board.
 */

/** One board's numbers for a fight. */
export interface BoardRating {
  /** The board: `15×15`, or a block's `x×y×z`. */
  size: string;
  /** 'unique' when it finishes without guessing. */
  status: string;
  passes: number;
  /** Share of the board the first pass settles, to 3 places. */
  firstPass: number;
  /** Lines hidden when it's measured. */
  fog: number;
  scramble: number;
  suspects: number;
  /**
   * Lines the fight itself hides once every phase has started, before any line is
   * finished. On the flat board that's often fewer than are measured, since a phase takes
   * only `fogCount` or `scrambleCount` lines from its pool.
   */
  asked: { fog: number; scramble: number; suspects: number };
}

export interface FightRating {
  flat: BoardRating;
  /** Only for fights with a 3D puzzle. */
  block?: BoardRating;
}

const round = (share: number) => Math.round(share * 1000) / 1000;
const size = (set: { rows: number[]; cols: number[] } | undefined) =>
  set ? set.rows.length + set.cols.length : 0;

/** Every story, Overtime and boss fight, in jobs-board order, each once. */
export function ratedFights(): Encounter[] {
  const seen = new Map<string, Encounter>();
  for (const run of [...runs, ...overtimeRuns, ...bossFights]) {
    for (const e of run.encounters) if (e.enemy && !seen.has(e.id)) seen.set(e.id, e);
  }
  return [...seen.values()];
}

/**
 * The flat board: `fightPasses` with all of the enemy's fog, scrambles and suspects (its
 * starting ones plus every phase's whole pool) hidden from the start, as the tests that
 * check fights are fair do (`runs.test.ts`).
 */
export function rateFlat(e: Encounter): BoardRating {
  const enemy = e.enemy!;
  const { width, height, clues } = e.puzzle;
  const fog = allFog(enemy);
  const scramble = allScramble(enemy);
  const result = fightPasses(width, height, clues, { fog, scramble, suspects: enemy.suspects });
  // Every phase started at once, as the battle starts them (taking from each pool).
  const all = advancePhase(enemy, { ...startBattle(enemy), enemyHp: 0 }, width).state;
  return {
    size: `${width}×${height}`,
    status: result.status,
    passes: result.passes,
    firstPass: round(result.firstPass),
    fog: size(fog),
    scramble: size(scramble),
    suspects: size(enemy.suspects),
    asked: { fog: size(all.fog), scramble: size(all.scramble), suspects: size(all.suspects) },
  };
}

/**
 * The block, through the real `Battle`, since a block picks its lines when each power
 * lands: built as a fight builds it (seeded with the encounter's id), then carried to 1 HP
 * on a blank block so every phase starts and picks its lines, then solved from the clues a
 * player could trust (`hintClues`). Its counts are what it picked, and `asked` is what the
 * enemy asks for (packages/block's `story/data.ts` turns the 2D enemy into counts). Returns
 * undefined for a fight with no 3D puzzle.
 */
export function rateBlock(id: string): BoardRating | undefined {
  const e = getBlockEncounter(id);
  if (!e?.enemy) return undefined;
  return rateBlockFight(id, e.enemy, e.puzzle);
}

/** `rateBlock` for any enemy on any block: an Endless fight's, say (#158). */
export function rateBlockFight(id: string, enemy: BlockEnemy, puzzle: BlockPuzzle): BoardRating {
  const battle = new Battle(enemy, puzzle, true, undefined, { seed: hashString(id) });
  battle.carry(1, new Uint8Array(puzzle.solution.length));
  const phases = enemy.phases ?? [];
  if (battle.state.phase !== phases.length - 1) {
    throw new Error(`${id}: only ${battle.state.phase + 1} of ${phases.length} phases started`);
  }
  const result = solve(puzzle.dims, battle.hintClues(), undefined, puzzle.lines);
  const { x, y, z } = puzzle.dims;
  const total = (key: 'fog' | 'scramble') =>
    (enemy[key] ?? 0) + phases.reduce((sum, p) => sum + (p[key] ?? 0), 0);
  return {
    size: `${x}×${y}×${z}`,
    status: result.solved ? 'unique' : result.contradiction ? 'contradiction' : 'ambiguous',
    passes: result.passes,
    firstPass: round(result.firstPass),
    fog: battle.state.fog.length,
    scramble: battle.state.scramble.length,
    suspects: battle.state.suspects.length,
    asked: {
      fog: total('fog'),
      scramble: total('scramble'),
      suspects: enemy.fakes?.suspects ?? 0,
    },
  };
}

/** Every fight's ratings, keyed by encounter id, in jobs-board order. */
export function rateFights(): Record<string, FightRating> {
  return Object.fromEntries(
    ratedFights().map((e) => {
      const block = rateBlock(e.id);
      return [e.id, { flat: rateFlat(e), ...(block ? { block } : {}) }];
    }),
  );
}
