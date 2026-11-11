import type { GameMode } from './game';
import { readStore, writeStore } from './storage';

const KEY = 'picross:v1';

/** An in-progress board. `cells` holds one digit per cell (see `Cell`). */
export interface SavedBoard {
  cells: string;
  /** Milliseconds played so far. */
  elapsed?: number;
  mode?: GameMode;
  hearts?: number;
  hintsUsed?: number;
}

export interface PuzzleStats {
  solves: number;
  bestTime: number;
}

export interface SaveData {
  solved: Record<string, PuzzleStats>;
  boards: Record<string, SavedBoard>;
  totalTime: number;
}

const data: SaveData = readStore<SaveData>(KEY, { solved: {}, boards: {}, totalTime: 0 });
const persist = () => writeStore(KEY, data);

export function getPuzzleStats(id: string): PuzzleStats | undefined {
  return data.solved[id];
}

/** Records a solve. Returns true when it beats the previous best time. */
export function recordSolve(id: string, time: number): boolean {
  const prev = data.solved[id];
  data.solved[id] = {
    solves: (prev?.solves ?? 0) + 1,
    bestTime: Math.min(prev?.bestTime ?? Infinity, time),
  };
  data.totalTime += time;
  delete data.boards[id];
  persist();
  return Boolean(prev) && time < prev.bestTime;
}

export function getOverallStats() {
  const all = Object.values(data.solved);
  return {
    solved: all.length,
    solves: all.reduce((n, s) => n + s.solves, 0),
    totalTime: data.totalTime,
  };
}

export function getSavedBoard(id: string): SavedBoard | undefined {
  return data.boards[id];
}

export function saveBoard(id: string, board: SavedBoard): void {
  data.boards[id] = board;
  persist();
}

export function clearSavedBoard(id: string): void {
  delete data.boards[id];
  persist();
}
