import type { SavedBoard } from '@picross/grid/game/game';
import { readStore, writeStore } from '@picross/shared/game/storage';

// The board's save format belongs to the game (packages/grid); this module stores it.
export type { SavedBoard };

const KEY = 'picross:v1';

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
