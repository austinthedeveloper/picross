import type { RunState } from './run';
import { readStore, writeStore } from './storage';

const KEY = 'picross:run';

/** How you've done on a job (#47). */
export interface JobStats {
  plays: number;
  wins: number;
  /** Wins with Hits on (#107). */
  hitsOnWins?: number;
  /**
   * Most HP left at the end of a Hits-on win. Saves from before #107 may hold a
   * Relaxed run's HP here, where nothing can hurt you, so trust it only with `hitsOnWins`.
   */
  bestHp?: number;
  /** Endless mode (#68): the most encounters cleared in one run. */
  bestDepth?: number;
}

interface RunSave {
  current: RunState | null;
  /** Scene ids already played, so intros only play automatically once. */
  seenScenes: string[];
  /** Enemy powers whose tip card you've dismissed (#79). Missing in older saves. */
  seenTips?: string[];
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

export function hasSeenTip(power: string): boolean {
  return (data.seenTips ?? []).includes(power);
}

export function markTipSeen(power: string): void {
  data.seenTips = [...new Set([...(data.seenTips ?? []), power])];
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
  if (run.endless) {
    data.jobs[run.runId] = {
      ...prev,
      plays: prev.plays + 1,
      bestDepth: Math.max(prev.bestDepth ?? 0, run.node),
    };
    return save({ ...run, recorded: true });
  }
  const won = run.status === 'won';
  const next: JobStats = { ...prev, plays: prev.plays + 1, wins: prev.wins + (won ? 1 : 0) };
  if (won && run.mode === 'hearts') {
    // A first Hits-on win starts the best fresh: an older one may be from a Relaxed run.
    next.bestHp = Math.max(prev.hitsOnWins ? (prev.bestHp ?? 0) : 0, run.hp);
    next.hitsOnWins = (prev.hitsOnWins ?? 0) + 1;
  }
  data.jobs[run.runId] = next;
  return save({ ...run, recorded: true });
}

function save(recorded: RunState): RunState {
  data.current = recorded;
  writeStore(KEY, data);
  return recorded;
}
