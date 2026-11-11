import { fightBoards, packFight, type FightSave } from '@picross/story/fight/save';
import type { BattleState } from './battle';
import type { SavedBoard } from './progress';
import type { BlockProgress, RunState } from './run';

/**
 * The run as `picross:run` holds it (#169). A fight's progress is in `fight`, one entry
 * per board (`@picross/story/fight/save`): the flat board's marks and battle, and the
 * block's, when a boss switches board. Other encounters keep their board in `board`.
 *
 * Saves from before #169 have the fight in the run's own fields instead (`board`,
 * `battle`, `block`), which is also how the game holds a run while it plays: those load
 * as they are, forever.
 */
export type SavedRun = RunState & { fight?: FightSave };

/**
 * The run as the game plays it, from the run as saved: a fight's boards go back into
 * `board`, `battle` and `block`, each exactly as it was saved, so the fight resumes on
 * whichever board its phase says (`boardAt`). A save with no fight, or from before #169,
 * is already that.
 *
 * Fields of the old shape beside a fight save were written by a version from before #169
 * after this one (a version that writes `fight` never writes them on a fight): they're the
 * fight as that version last showed it, so they win, whole (half of each would be neither).
 * A later version's `fight` stays where it is.
 */
export function loadFight(saved: SavedRun): RunState {
  const boards = fightBoards(saved.fight);
  if (!boards) return saved;
  const out: SavedRun = { ...saved };
  delete out.fight;
  if (out.board || out.battle || out.block) return out;
  const { flat, block } = boards;
  if (flat?.board) out.board = flat.board as SavedBoard;
  if (flat?.battle) out.battle = flat.battle as BattleState;
  if (block) out.block = block as BlockProgress;
  return out;
}

/**
 * The run as it's saved: once a fight has a battle on either board, its boards move into
 * `fight` (`loadFight` reads them back). Anything else saves as it is.
 */
export function saveFight(run: RunState): SavedRun {
  if (!run.battle && !run.block) return run;
  const { board, battle, block, ...rest } = run;
  const fight = packFight({ flat: { board, battle }, block });
  return fight ? { ...rest, fight } : rest;
}
