import type { FightCounts } from '@picross/story/fight/battle';
import { packFight, readFight, type FightSave } from '@picross/story/fight/save';
import { handOver, takeCounts, type BattleState } from './battle';
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
 *
 * A fight's counts go with it from board to board since #170, so the battle on the board
 * it's on has them all. Older saves (version 2, or the run's own fields) have a block that
 * counted only its own: they load with one count, the two added up (`oneCount`).
 */
export function loadFight(saved: SavedRun): RunState {
  const read = readFight(saved.fight);
  if (!read) return saved.fight ? saved : oneCount(saved);
  const out: SavedRun = { ...saved };
  delete out.fight;
  if (out.board || out.battle || out.block) return oneCount(out);
  const { flat, block } = read.boards;
  if (flat?.board) out.board = flat.board as SavedBoard;
  if (flat?.battle) out.battle = flat.battle as BattleState;
  if (block) out.block = block as BlockProgress;
  return read.v < 3 ? oneCount(out) : out;
}

/**
 * A switching fight from before #170 with one count: what the flat battle and the block's
 * each counted, added up, on both (the board the fight is on reads its own, and the next
 * switch carries it on).
 */
function oneCount(run: RunState): RunState {
  const block = run.block?.battle as { counts?: Partial<FightCounts> } | undefined;
  if (!run.battle || !block?.counts) return run;
  const flat = handOver({ hp: run.battle.enemyHp }, run.battle).counts;
  const counts = { ...block.counts } as FightCounts;
  for (const [key, n] of Object.entries(flat) as [keyof FightCounts, number][]) {
    if (n) counts[key] = (counts[key] ?? 0) + n;
  }
  return {
    ...run,
    battle: takeCounts(run.battle, { counts }),
    block: { ...run.block, battle: { ...block, counts } },
  };
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
