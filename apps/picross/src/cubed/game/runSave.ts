import { loadFight, saveFight, type SavedRun } from './fightSave';
import type { RunState } from './run';
import {
  clearedJobs,
  getBlockRun,
  getJobStats,
  hasSeenScene,
  hasSeenTip,
  markSceneSeen,
  markTipSeen,
  saveBlockRun,
  setJobStats,
  withWin,
  type JobStats,
} from '../../game/runSave';

/**
 * Cubed's story save: a view of the one run save (`game/runSave.ts`, `picross:run`). Cubed's
 * run is its own (`block` there), so a 2D run and a Cubed run can both wait to be continued;
 * the scenes and tips seen and the job stats are both games'. A fight's block and battle are
 * saved in its `fight`, an entry per board as the 2D game's are (`fightSave.ts`, #169).
 * Before #155 it had its own key, `picross3d:run`, which only the first-launch merge reads.
 */

export type { JobStats };
export { clearedJobs, getJobStats, hasSeenScene, hasSeenTip, markSceneSeen, markTipSeen };

/**
 * The run as it's played and as it was last saved: a fight's block and battle are saved in
 * its `fight` (`fightSave.ts`, #169), so the save is read back through `loadFight` once,
 * and the same run is handed out until it changes.
 */
let held: { saved: object | null; run: RunState | null } | undefined;

export function getCurrentRun(): RunState | null {
  const saved = getBlockRun();
  if (held?.saved !== saved) held = { saved, run: saved && loadFight(saved as SavedRun) };
  return held.run;
}

export function saveCurrentRun(state: RunState | null): void {
  // Dated by the run as it's played, as the 2D game's is: a run from before #169 that's
  // only saved again in the fight's shape hasn't changed.
  const changed = JSON.stringify(state) !== JSON.stringify(getCurrentRun());
  saveBlockRun(state && saveFight(state), changed);
  held = { saved: getBlockRun(), run: state };
}

/** Records a finished run in its job's stats, once. Returns the run marked recorded. */
export function recordRunResult(run: RunState): RunState {
  if (run.status === 'active' || run.recorded) return run;
  const prev = getJobStats(run.runId) ?? { plays: 0, wins: 0 };
  const won = run.status === 'won';
  const hitsOn = won && run.mode === 'hearts';
  setJobStats(run.runId, {
    // The 2D game's fields (its best depth, the boards won on) stay.
    ...prev,
    plays: prev.plays + 1,
    wins: prev.wins + (won ? 1 : 0),
    ...(prev.hitsOnWins || hitsOn ? { hitsOnWins: (prev.hitsOnWins ?? 0) + (hitsOn ? 1 : 0) } : {}),
    ...(prev.bestHp !== undefined || hitsOn
      ? { bestHp: Math.max(prev.bestHp ?? 0, hitsOn ? run.hp : 0) }
      : {}),
    ...(won ? { wonOn: withWin(prev, 'block') } : {}),
  });
  const recorded = { ...run, recorded: true };
  saveCurrentRun(recorded);
  return recorded;
}
