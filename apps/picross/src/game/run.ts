import { debug } from '@picross/grid/debug/hooks';
import type { BattleState, FightCounts } from './battle';
import type { SavedBoard } from './progress';
import type { Mode } from './settings';

/** How a run went (#107), across the fights it has won so far. */
export interface Tally extends FightCounts {
  hintsUsed: number;
}

const emptyTally = (): Tally => ({
  wrongFills: 0,
  zaps: 0,
  wrongAccusations: 0,
  gadgetsUsed: 0,
  bombsUsed: 0,
  spongesUsed: 0,
  hintsUsed: 0,
});

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
  /** Chosen at the start: in relaxed runs enemies never hit (older saves lack it). */
  mode?: Mode;
  /** The current encounter's board, so a reload mid-puzzle resumes it. */
  board?: SavedBoard;
  /** The current fight's progress, if the current encounter is a fight. */
  battle?: BattleState;
  /**
   * The current fight's block, when its boss switches to 3D: the block's saved board and
   * its battle, kept apart from the flat ones so each board keeps its own progress. Only
   * the 3D game reads what's inside.
   */
  block?: BlockProgress;
  /** Set once the finished run's result is saved to the job stats (#47). */
  recorded?: boolean;
  /** An endless run's seed and pools (#68); its encounters are generated from them. */
  endless?: { seed: number; fights: string[]; digs: string[]; rests?: string[] };
  /** Missing on runs started before #107, which can't prove they were clean. */
  tally?: Tally;
}

export function startRun(
  runId: string,
  hp: number,
  mode: Mode = 'relaxed',
  gadgets: string[] = [],
): RunState {
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

/** Adds a finished encounter's fight counts and hints to the run's tally. */
export function addToTally(
  state: RunState,
  counts: Partial<FightCounts> = {},
  hintsUsed = 0,
): RunState {
  if (!state.tally) return state;
  const tally = { ...state.tally, hintsUsed: state.tally.hintsUsed + hintsUsed };
  for (const key of Object.keys(counts) as (keyof FightCounts)[]) {
    tally[key] += counts[key] ?? 0;
  }
  return { ...state, tally };
}

export function addGadget(state: RunState, id: string): RunState {
  return { ...state, gadgets: [...state.gadgets, id] };
}

/** Removes one of a held gadget (after it's used). */
export function removeGadget(state: RunState, id: string): RunState {
  const i = state.gadgets.indexOf(id);
  if (i < 0) return state;
  return { ...state, gadgets: [...state.gadgets.slice(0, i), ...state.gadgets.slice(i + 1)] };
}

/** Saves (or clears) the current fight's progress. */
export function withBattle(state: RunState, battle: BattleState | null): RunState {
  const next = { ...state };
  if (battle) next.battle = battle;
  else delete next.battle;
  return next;
}

/** Saves (or clears) the in-progress board for the current encounter. */
export function withBoard(state: RunState, board: SavedBoard | null): RunState {
  const next = { ...state };
  if (board) next.board = board;
  else delete next.board;
  return next;
}

/** A fight's block: its board and battle, as the 3D game saves them. */
export interface BlockProgress {
  board?: unknown;
  battle?: unknown;
}

/** Saves (or clears) the current fight's block. */
export function withBlock(state: RunState, block: BlockProgress | null): RunState {
  const next = { ...state };
  if (block) next.block = block;
  else delete next.block;
  return next;
}

/** Applies damage; the run is lost at 0 HP. */
export function damage(state: RunState, amount: number): RunState {
  if (state.status !== 'active' || amount <= 0) return state;
  if (import.meta.env.VITE_DEBUG === '1' && debug.infiniteHealth()) return state;
  const hp = Math.max(0, state.hp - amount);
  return { ...state, hp, status: hp === 0 ? 'lost' : 'active' };
}

/** Restores HP, up to the max. */
export function heal(state: RunState, amount: number): RunState {
  if (state.status !== 'active') return state;
  return { ...state, hp: Math.min(state.maxHp, state.hp + amount) };
}

/**
 * Clears the current encounter and moves on; the run is won after the last one
 * (pass Infinity for a run that never ends).
 */
export function completeEncounter(state: RunState, length: number): RunState {
  if (state.status !== 'active') return state;
  const node = state.node + 1;
  const cleared = withBlock(withBattle(withBoard(state, null), null), null);
  return { ...cleared, node, status: node >= length ? 'won' : 'active' };
}
