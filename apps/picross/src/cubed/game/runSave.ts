import type { RunState } from './run';
import { readStore, writeStore } from '@picross/shared/game/storage';

// Its own key, apart from the 2D game's story saves.
const KEY = 'picross3d:run';

export interface JobStats {
  plays: number;
  wins: number;
  /** Wins with Hits on. */
  hitsOnWins?: number;
  /** Most HP left at the end of a Hits-on win. */
  bestHp?: number;
}

export interface RunSave {
  current: RunState | null;
  /** Scene ids already played, so intros play automatically only once. */
  seenScenes: string[];
  /** Enemy powers whose tip card has been seen. */
  seenTips: string[];
  jobs: Record<string, JobStats>;
}

const data = readStore<RunSave>(KEY, { current: null, seenScenes: [], seenTips: [], jobs: {} });
const persist = () => writeStore(KEY, data);

export const getCurrentRun = (): RunState | null => data.current;

export function saveCurrentRun(state: RunState | null): void {
  data.current = state;
  persist();
}

export const hasSeenScene = (id: string) => data.seenScenes.includes(id);

export function markSceneSeen(id: string): void {
  if (!data.seenScenes.includes(id)) data.seenScenes.push(id);
  persist();
}

export const hasSeenTip = (power: string) => data.seenTips.includes(power);

export function markTipSeen(power: string): void {
  if (!data.seenTips.includes(power)) data.seenTips.push(power);
  persist();
}

export const getJobStats = (id: string): JobStats | undefined => data.jobs[id];

/** Records a finished run in its job's stats, once. Returns the run marked recorded. */
export function recordRunResult(run: RunState): RunState {
  if (run.status === 'active' || run.recorded) return run;
  const prev = data.jobs[run.runId] ?? { plays: 0, wins: 0 };
  const won = run.status === 'won';
  const hitsOn = won && run.mode === 'hearts';
  data.jobs[run.runId] = {
    plays: prev.plays + 1,
    wins: prev.wins + (won ? 1 : 0),
    ...(prev.hitsOnWins || hitsOn ? { hitsOnWins: (prev.hitsOnWins ?? 0) + (hitsOn ? 1 : 0) } : {}),
    ...(prev.bestHp !== undefined || hitsOn
      ? { bestHp: Math.max(prev.bestHp ?? 0, hitsOn ? run.hp : 0) }
      : {}),
  };
  const recorded = { ...run, recorded: true };
  data.current = recorded;
  persist();
  return recorded;
}

/** Every job won at least once. */
export const clearedJobs = () =>
  Object.entries(data.jobs)
    .filter(([, s]) => s.wins > 0)
    .map(([id]) => id);
