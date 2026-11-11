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
 * the scenes and tips seen and the job stats are both games'. Before #155 it had its own
 * key, `picross3d:run`.
 */

export type { JobStats };
export { clearedJobs, getJobStats, hasSeenScene, hasSeenTip, markSceneSeen, markTipSeen };

export const getCurrentRun = (): RunState | null => getBlockRun() as RunState | null;

export function saveCurrentRun(state: RunState | null): void {
  saveBlockRun(state);
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
