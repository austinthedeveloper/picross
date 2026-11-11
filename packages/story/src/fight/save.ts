import type { BoardKind } from './board';

/**
 * A fight as a run saves it (#169): one entry per board the fight has used, keyed by the
 * board (`flat`, `block`), each with that board's own progress. Both games' runs write it
 * (the 2D game's in `picross:run`, Cubed's under its `block`), so a reload mid-fight finds
 * every board as it was left and opens the one the fight is on. Which board that is isn't saved: it's the
 * enemy's phases' (`boardAt`, `switch.ts`; Cubed's are all on a block).
 *
 * Each board's marks and battle are in that board's own format (the 2D game's sparse
 * `BattleState`, Cubed's `BattleState`), exactly as they were saved before, so nothing
 * about a fight changes on the way through. Version 1 was the run's own fields (`board`,
 * `battle`, and the 2D game's `block`); each game's run save reads those forever.
 *
 * Version 3 (#170) is the same shape, but a fight's counts (mistakes, zaps, …) go with it
 * from board to board (`StoryBattle.enterBoard`), so the battle on the board the fight is on
 * has them all. Before, a block counted only what happened on it, and the fight added the
 * two up at the end: the 2D game's run save adds them up once as it reads a version 2 or
 * version 1 save (`apps/picross/src/game/fightSave.ts`).
 */
export const FIGHT_SAVE = 3;

/** The versions this one reads. */
const READS = [2, 3];

/** One board's progress in a fight: its marks and its battle, as that board writes them. */
export interface BoardProgress {
  board?: unknown;
  battle?: unknown;
}

export interface FightSave {
  v: number;
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
 * A fight save this version reads, or undefined for anything else (nothing, or a later
 * version, which a run save leaves where it is).
 */
export function readFight(value: unknown): FightSave | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const save = value as Partial<FightSave>;
  if (!READS.includes(save.v!) || !save.boards || typeof save.boards !== 'object') {
    return undefined;
  }
  return save as FightSave;
}

/** The boards of a fight save this version reads (`readFight`). */
export const fightBoards = (value: unknown) => readFight(value)?.boards;
