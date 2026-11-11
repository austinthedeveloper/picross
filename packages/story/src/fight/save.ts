import type { BoardKind } from './board';

/**
 * A fight as a run saves it (#169): one entry per board the fight has used, keyed by the
 * board (`flat`, `block`), each with that board's own progress. Both games' runs write it
 * (the 2D game's in `picross:run`, Cubed's under its `block`), so a reload mid-fight finds
 * every board as it was left and opens the one the fight is on. Which board that is isn't saved: it's the
 * enemy's phases' (`boardAt` in the 2D game; Cubed's are all on a block).
 *
 * Each board's marks and battle are in that board's own format (the 2D game's sparse
 * `BattleState`, Cubed's `BattleState`), exactly as they were saved before, so nothing
 * about a fight changes on the way through. Version 1 was the run's own fields (`board`,
 * `battle`, and the 2D game's `block`); each game's run save reads those forever.
 */
export const FIGHT_SAVE = 2;

/** One board's progress in a fight: its marks and its battle, as that board writes them. */
export interface BoardProgress {
  board?: unknown;
  battle?: unknown;
}

export interface FightSave {
  v: typeof FIGHT_SAVE;
  boards: Partial<Record<BoardKind, BoardProgress>>;
}

const KINDS: readonly BoardKind[] = ['flat', 'block'];

/** A board's progress without the parts it doesn't have, or undefined if it has none. */
function trimmed(progress: BoardProgress | undefined): BoardProgress | undefined {
  if (!progress) return undefined;
  const out: BoardProgress = {};
  if (progress.board !== undefined) out.board = progress.board;
  if (progress.battle !== undefined) out.battle = progress.battle;
  return out.board === undefined && out.battle === undefined ? undefined : out;
}

/** The fight save for these boards (flat first), or undefined if none has progress. */
export function packFight(
  boards: Partial<Record<BoardKind, BoardProgress>>,
): FightSave | undefined {
  const out: FightSave['boards'] = {};
  for (const kind of KINDS) {
    const progress = trimmed(boards[kind]);
    if (progress) out[kind] = progress;
  }
  return Object.keys(out).length ? { v: FIGHT_SAVE, boards: out } : undefined;
}

/**
 * The boards of a fight save, or undefined for anything that isn't one this version reads
 * (nothing, or a later version, which a run save leaves where it is).
 */
export function fightBoards(value: unknown): FightSave['boards'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const save = value as Partial<FightSave>;
  if (save.v !== FIGHT_SAVE || !save.boards || typeof save.boards !== 'object') return undefined;
  return save.boards;
}
