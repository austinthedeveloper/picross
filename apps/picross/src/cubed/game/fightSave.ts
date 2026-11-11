import { fightBoards, packFight, type FightSave } from '@picross/story/fight/save';
import type { SavedBoard } from './progress';
import type { RunState } from './run';

/**
 * Cubed's run as the run save holds it (#169), under `block` in `picross:run` (`runSave.ts`):
 * a fight's block and battle are in `fight`, as the block's entry (`@picross/story/fight/save`,
 * the same shape as the 2D game's). Other encounters keep their block in `board`.
 *
 * Saves from before #169 have the fight in the run's own `board` and `battle`, which is
 * also how Cubed holds a run while it plays: those load as they are, forever.
 */
export type SavedRun = RunState & { fight?: FightSave };

/**
 * The run as Cubed plays it, from the run as saved: the block's entry goes back into
 * `board` and `battle`, exactly as saved. A save with no fight, or from before #169, is
 * already that. Old fields beside a fight save were written by a version from before #169
 * after this one, so they win, whole; a later version's `fight` stays where it is.
 */
export function loadFight(saved: SavedRun): RunState {
  const boards = fightBoards(saved.fight);
  if (!boards) return saved;
  const out: SavedRun = { ...saved };
  delete out.fight;
  if (out.board || out.battle) return out;
  const { block } = boards;
  if (block?.board) out.board = block.board as SavedBoard;
  if (block?.battle) out.battle = block.battle;
  return out;
}

/** The run as it's saved: a fight with a battle moves into `fight`; anything else as it is. */
export function saveFight(run: RunState): SavedRun {
  if (!run.battle) return run;
  const { board, battle, ...rest } = run;
  const fight = packFight({ block: { board, battle } });
  return fight ? { ...rest, fight } : rest;
}
