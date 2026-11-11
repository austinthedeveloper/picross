import type { SavedBoard } from './progress';
import type { Mode } from './settings';

/** How a run went, across the encounters it has cleared. */
export interface Tally {
  mistakes: number;
  hintsUsed: number;
  gadgetsUsed: number;
}

const emptyTally = (): Tally => ({ mistakes: 0, hintsUsed: 0, gadgetsUsed: 0 });

/**
 * Where a player is in a run (a job). Pure data, so it can be saved: a fight's board and
 * battle are saved together as its `fight` (`fightSave.ts`, #169), and everything else as
 * it is. Change it only through the functions below, which return a new state. Mirrors the
 * 2D game's RunState.
 */
export interface RunState {
  runId: string;
  /** Index of the next encounter (equals the job's length once won). */
  node: number;
  hp: number;
  maxHp: number;
  /** Gadget ids held for the rest of the run. */
  gadgets: string[];
  status: 'active' | 'won' | 'lost';
  /** Relaxed runs: enemies never hit. Hearts ("Hits on"): mistakes and powers hurt. */
  mode: Mode;
  /** The current encounter's board, so a reload resumes it. */
  board?: SavedBoard;
  /** The current fight's state (packages/block's game/battle.ts), so a reload resumes it. */
  battle?: unknown;
  /** Set once the finished run's result is in the job stats. */
  recorded?: boolean;
  tally: Tally;
}

export function startRun(runId: string, hp: number, mode: Mode, gadgets: string[] = []): RunState {
  return {
    runId,
    node: 0,
    hp,
    maxHp: hp,
    gadgets: [...gadgets],
    status: 'active',
    mode,
    tally: emptyTally(),
  };
}

export function addToTally(state: RunState, counts: Partial<Tally>): RunState {
  const tally = { ...state.tally };
  for (const key of Object.keys(counts) as (keyof Tally)[]) tally[key] += counts[key] ?? 0;
  return { ...state, tally };
}

export const addGadget = (state: RunState, id: string): RunState => ({
  ...state,
  gadgets: [...state.gadgets, id],
});

/** Removes one of a held gadget (after it's used). */
export function removeGadget(state: RunState, id: string): RunState {
  const i = state.gadgets.indexOf(id);
  if (i < 0) return state;
  return { ...state, gadgets: [...state.gadgets.slice(0, i), ...state.gadgets.slice(i + 1)] };
}

/** Saves (or clears) the current encounter's board. */
export function withBoard(state: RunState, board: SavedBoard | null): RunState {
  const next = { ...state };
  if (board) next.board = board;
  else delete next.board;
  return next;
}

/** Saves (or clears) the current fight's state. */
export function withBattle(state: RunState, battle: unknown): RunState {
  const next = { ...state };
  if (battle) next.battle = battle;
  else delete next.battle;
  return next;
}

/** Applies damage; the run is lost at 0 HP. */
export function damage(state: RunState, amount: number): RunState {
  if (state.status !== 'active' || amount <= 0) return state;
  const hp = Math.max(0, state.hp - amount);
  return { ...state, hp, status: hp === 0 ? 'lost' : 'active' };
}

/** Restores HP, up to the max. */
export function heal(state: RunState, amount: number): RunState {
  if (state.status !== 'active') return state;
  return { ...state, hp: Math.min(state.maxHp, state.hp + amount) };
}

/** Clears the current encounter and moves on; the run is won after the last one. */
export function completeEncounter(state: RunState, length: number): RunState {
  if (state.status !== 'active') return state;
  const node = state.node + 1;
  const cleared = withBattle(withBoard(state, null), null);
  return { ...cleared, node, status: node >= length ? 'won' : 'active' };
}
