import type { RunState } from './run';
import { readStore, writeStore } from './storage';

const KEY = 'picross:run';

/** How you've done on a job (#47). */
export interface JobStats {
  plays: number;
  wins: number;
  /** Most HP left at the end of a win. */
  bestHp?: number;
}

interface RunSave {
  current: RunState | null;
  /** Scene ids already played, so intros only play automatically once. */
  seenScenes: string[];
  jobs: Record<string, JobStats>;
}

const data = readStore<RunSave>(KEY, { current: null, seenScenes: [], jobs: {} });

/** The run in progress or just finished, if any. */
export function getCurrentRun(): RunState | null {
  return data.current;
}

/** Saves the run (or clears it with null). Called after every change, so a reload resumes it. */
export function saveCurrentRun(state: RunState | null): void {
  data.current = state;
  writeStore(KEY, data);
}

export function hasSeenScene(id: string): boolean {
  return data.seenScenes.includes(id);
}

export function markSceneSeen(id: string): void {
  if (!data.seenScenes.includes(id)) data.seenScenes.push(id);
  writeStore(KEY, data);
}

export function getJobStats(id: string): JobStats | undefined {
  return data.jobs[id];
}

/**
 * Saves a finished run's result to its job's stats, once (the run is marked
 * `recorded`). Returns the run as saved.
 */
export function recordRunResult(run: RunState): RunState {
  if (run.status === 'active' || run.recorded) return run;
  const prev = data.jobs[run.runId] ?? { plays: 0, wins: 0 };
  const won = run.status === 'won';
  data.jobs[run.runId] = {
    plays: prev.plays + 1,
    wins: prev.wins + (won ? 1 : 0),
    ...(won || prev.bestHp !== undefined
      ? { bestHp: Math.max(prev.bestHp ?? 0, won ? run.hp : 0) }
      : {}),
  };
  const recorded = { ...run, recorded: true };
  data.current = recorded;
  writeStore(KEY, data);
  return recorded;
}
