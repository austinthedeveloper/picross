import type { Mode } from './settings';
import { readStore, writeStore } from './storage';

const KEY = 'picross3d:v1';

/** An unfinished block. `blocks` holds one digit per cube (see `Block` in game.ts). */
export interface SavedBoard {
  blocks: string;
  /** Milliseconds played so far. */
  elapsed?: number;
  mode?: Mode;
  hearts?: number;
  hintsUsed?: number;
}

export interface PuzzleStats {
  solves: number;
  bestTime: number;
  /** Solves without a hint. */
  clean?: number;
}

export interface SaveData {
  solved: Record<string, PuzzleStats>;
  boards: Record<string, SavedBoard>;
  totalTime: number;
  /** Editor play-tests solved. */
  playtests?: number;
}

const data: SaveData = readStore<SaveData>(KEY, { solved: {}, boards: {}, totalTime: 0 });
const persist = () => writeStore(KEY, data);

export function getPuzzleStats(id: string): PuzzleStats | undefined {
  return data.solved[id];
}

/** Records a solve. Returns true when it beats the previous best time. */
export function recordSolve(id: string, time: number, hintsUsed = 0): boolean {
  const prev = data.solved[id];
  // v0.1.0 recorded 0:00 for solves in one sitting; that's no best at all.
  const prevBest = prev && prev.bestTime > 0 ? prev.bestTime : Infinity;
  data.solved[id] = {
    solves: (prev?.solves ?? 0) + 1,
    bestTime: Math.min(prevBest, time),
    clean: (prev?.clean ?? 0) + (hintsUsed ? 0 : 1),
  };
  data.totalTime += time;
  delete data.boards[id];
  persist();
  return prevBest !== Infinity && time < prevBest;
}

/** Every puzzle id solved at least once. */
export const solvedIds = () => Object.keys(data.solved);

export const cleanSolves = () =>
  Object.values(data.solved).filter((s) => (s.clean ?? 0) > 0).length;

export function recordPlaytest(): void {
  data.playtests = (data.playtests ?? 0) + 1;
  persist();
}

export const playtests = () => data.playtests ?? 0;

export function getOverallStats() {
  const all = Object.values(data.solved);
  return {
    solved: all.length,
    solves: all.reduce((n, s) => n + s.solves, 0),
    totalTime: data.totalTime,
  };
}

export const getSavedBoard = (id: string): SavedBoard | undefined => data.boards[id];

export function saveBoard(id: string, board: SavedBoard): void {
  data.boards[id] = board;
  persist();
}

export function clearSavedBoard(id: string): void {
  delete data.boards[id];
  persist();
}
