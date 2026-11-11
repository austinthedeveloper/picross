import type { SavedBoard } from '@picross/grid/game/game';
import type { SavedBoard as BlockSavedBoard } from '@picross/block/game/game';
import { qualify, type Dimension } from '@picross/shared/puzzles/ids';
import { readStore, writeStore } from '@picross/shared/game/storage';

// The board's save format belongs to the game (packages/grid, packages/block); this module
// stores it.
export type { SavedBoard, BlockSavedBoard };

/**
 * Both games' free play (#155): the 2D game's puzzles and murals, Cubed's pack and dioramas.
 * The first-launch merge (`migrate.ts`) filled it from `picross:v1` and `picross3d:v1`, which
 * nothing reads any more but stay for a rollback.
 */
export const PROGRESS_KEY = 'picross:v2';

export interface PuzzleStats {
  solves: number;
  bestTime: number;
  /** Solves without a hint. Cubed counts them (its "No Peeking" badge); the 2D game doesn't. */
  clean?: number;
}

/**
 * Ids are qualified (`grid:mug`, `block:mug`, #147). A `block:` id is always Cubed's pack or a
 * diorama tile: the 3D story puzzles share four ids with the pack (`block:bat`), but story
 * boards live in the run save, so they never reach this one.
 */
export interface SaveData {
  solved: Record<string, PuzzleStats>;
  boards: Record<string, SavedBoard | BlockSavedBoard>;
  /**
   * Milliseconds spent solving, per dimension, so each list shows its own. The two games'
   * old totals (`totalTime`) went in here; all of it together is their sum.
   */
  time: Partial<Record<Dimension, number>>;
  /** Cubed's editor play-tests solved. */
  playtests?: number;
}

interface Boards {
  grid: SavedBoard;
  block: BlockSavedBoard;
}

/** One dimension's free play, with bare ids. */
export interface Progress<B> {
  getPuzzleStats(id: string): PuzzleStats | undefined;
  /**
   * Records a solve. Returns true when it beats the previous best time. Pass `hintsUsed`
   * to count clean solves.
   */
  recordSolve(id: string, time: number, hintsUsed?: number): boolean;
  getOverallStats(): { solved: number; solves: number; totalTime: number };
  /** Every puzzle id solved at least once. */
  solvedIds(): string[];
  /** Puzzles solved at least once without a hint. */
  cleanSolves(): number;
  getSavedBoard(id: string): B | undefined;
  saveBoard(id: string, board: B): void;
  clearSavedBoard(id: string): void;
}

const data: SaveData = readStore<SaveData>(PROGRESS_KEY, { solved: {}, boards: {}, time: {} });
const persist = () => writeStore(PROGRESS_KEY, data);

function bind<D extends Dimension>(dim: D): Progress<Boards[D]> {
  const key = (id: string) => qualify(dim, id);
  const prefix = `${dim}:`;
  const mine = () =>
    Object.entries(data.solved).filter(([id]) => id.startsWith(prefix)) as [string, PuzzleStats][];
  return {
    getPuzzleStats: (id) => data.solved[key(id)],
    recordSolve(id, time, hintsUsed) {
      const prev = data.solved[key(id)];
      // Cubed's v0.1.0 recorded 0:00 for solves in one sitting; that's no best at all.
      const prevBest = prev && prev.bestTime > 0 ? prev.bestTime : Infinity;
      data.solved[key(id)] = {
        ...prev,
        solves: (prev?.solves ?? 0) + 1,
        bestTime: Math.min(prevBest, time),
        ...(hintsUsed === undefined ? {} : { clean: (prev?.clean ?? 0) + (hintsUsed ? 0 : 1) }),
      };
      data.time[dim] = (data.time[dim] ?? 0) + time;
      delete data.boards[key(id)];
      persist();
      return prevBest !== Infinity && time < prevBest;
    },
    getOverallStats() {
      const all = mine().map(([, stats]) => stats);
      return {
        solved: all.length,
        solves: all.reduce((n, s) => n + s.solves, 0),
        totalTime: data.time[dim] ?? 0,
      };
    },
    solvedIds: () => mine().map(([id]) => id.slice(prefix.length)),
    cleanSolves: () => mine().filter(([, s]) => (s.clean ?? 0) > 0).length,
    getSavedBoard: (id) => data.boards[key(id)] as Boards[D] | undefined,
    saveBoard(id, board) {
      data.boards[key(id)] = board;
      persist();
    },
    clearSavedBoard(id) {
      delete data.boards[key(id)];
      persist();
    },
  };
}

const views = { grid: bind('grid'), block: bind('block') };

/** One dimension's free play: `progressFor('block').getPuzzleStats('mug')` is Cubed's mug. */
export function progressFor<D extends Dimension>(dim: D): Progress<Boards[D]> {
  return views[dim] as Progress<Boards[D]>;
}

/** Cubed's editor: a play-test solved. */
export function recordPlaytest(): void {
  data.playtests = (data.playtests ?? 0) + 1;
  persist();
}

export const playtests = () => data.playtests ?? 0;

// The 2D game's own calls, on the grid.
export const {
  getPuzzleStats,
  recordSolve,
  getOverallStats,
  getSavedBoard,
  saveBoard,
  clearSavedBoard,
} = views.grid;
