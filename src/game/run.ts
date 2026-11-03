import type { SavedBoard } from './progress';

/**
 * Where a player is in a run. Pure data, so it can be saved as-is. Change it
 * only through the functions below, which return a new state.
 */
export interface RunState {
  runId: string;
  /** Index of the next encounter to play (equals the run length once won). */
  node: number;
  hp: number;
  maxHp: number;
  /** Gadget ids held for the rest of the run (#28). */
  gadgets: string[];
  status: 'active' | 'won' | 'lost';
  /** The current encounter's board, so a reload mid-puzzle resumes it. */
  board?: SavedBoard;
}

export function startRun(runId: string, hp: number): RunState {
  return { runId, node: 0, hp, maxHp: hp, gadgets: [], status: 'active' };
}

/** Saves (or clears) the in-progress board for the current encounter. */
export function withBoard(state: RunState, board: SavedBoard | null): RunState {
  const next = { ...state };
  if (board) next.board = board;
  else delete next.board;
  return next;
}

/** Applies damage; the run is lost at 0 HP. */
export function damage(state: RunState, amount: number): RunState {
  if (state.status !== 'active' || amount <= 0) return state;
  const hp = Math.max(0, state.hp - amount);
  return { ...state, hp, status: hp === 0 ? 'lost' : 'active' };
}

/** Clears the current encounter and moves on; the run is won after the last one. */
export function completeEncounter(state: RunState, length: number): RunState {
  if (state.status !== 'active') return state;
  const node = state.node + 1;
  return { ...withBoard(state, null), node, status: node >= length ? 'won' : 'active' };
}
