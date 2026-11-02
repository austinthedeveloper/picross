import { readStore, writeStore } from './storage';

/** An in-progress board. `cells` holds one digit per cell (see `Cell`). */
export interface SavedBoard {
  cells: string;
}

interface SaveData {
  solved: Record<string, true>;
  boards: Record<string, SavedBoard>;
}

const data: SaveData = readStore<SaveData>({ solved: {}, boards: {} });
const persist = () => writeStore(data);

export function isPuzzleSolved(id: string): boolean {
  return Boolean(data.solved[id]);
}

export function markPuzzleSolved(id: string): void {
  data.solved[id] = true;
  delete data.boards[id];
  persist();
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
