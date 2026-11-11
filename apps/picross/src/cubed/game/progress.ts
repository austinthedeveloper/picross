import type { SavedBoard } from '@picross/block/game/game';
import { progressFor, type PuzzleStats as Stats } from '../../game/progress';

/**
 * Cubed's free play: a view of the one save (`game/progress.ts`, `picross:v2`) on the
 * `block` dimension, with bare ids. Before #155 it had its own key, `picross3d:v1`.
 */

// An unfinished block's save is the block package's (`Game.save()`).
export type { SavedBoard };

export type PuzzleStats = Stats;

const block = progressFor('block');

export const { getPuzzleStats, getOverallStats, getSavedBoard, saveBoard, clearSavedBoard } = block;

/** Records a solve, counting it clean without a hint. Returns true when it beats the best. */
export const recordSolve = (id: string, time: number, hintsUsed = 0): boolean =>
  block.recordSolve(id, time, hintsUsed);

/** Every puzzle id solved at least once. */
export const solvedIds = () => block.solvedIds();

export const cleanSolves = () => block.cleanSolves();

export { playtests, recordPlaytest } from '../../game/progress';
