import { loadFight, saveFight, type SavedRun } from './fightSave';
import type { RunState } from './run';
import type { Dimension } from '@picross/shared/puzzles/ids';
import { readStore, writeStore } from '@picross/shared/game/storage';

/**
 * Both games' story (#155): the 2D game's run, Cubed's beside it (`block`), and what they
 * share, the scenes and tips seen and the job stats. The first-launch merge (`migrate.ts`)
 * moved Cubed's `picross3d:run` in.
 */
export const RUN_KEY = 'picross:run';
const KEY = RUN_KEY;

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
  /**
   * The boards it's been won on (#155), for "won on both" (#157). Wins from before the
   * merge count for the game they were in.
   */
  wonOn?: Dimension[];
}

/**
 * Cubed's run in progress, as Cubed saves it (`cubed/game/run.ts`'s RunState; this module
 * doesn't read it). Either game's run can be continued while the other waits.
 */
export interface BlockRunSave {
  current: object | null;
  /** When `current` last changed (see `RunSave.currentUpdatedAt`). */
  currentUpdatedAt?: number;
}

/** What `picross:run` holds. */
export interface RunSave {
  /** As saved: a fight's progress is in its `fight` (`fightSave.ts`). */
  current: SavedRun | null;
  /**
   * When `current` last changed, in milliseconds since 1970. It sits beside the run
   * so that clearing the run is dated too, and merging saves can tell which is newer
   * (#97). Older saves lack it and count as 0.
   */
  currentUpdatedAt?: number;
  /** Scene ids already played, so intros only play automatically once. */
  seenScenes: string[];
  /** Enemy powers whose tip card you've dismissed (#79). Missing in older saves. */
  seenTips?: string[];
  /** Job stats from both games: a job is the same job on either board. */
  jobs: Record<string, JobStats>;
  /** Cubed's run. Missing until Cubed's story is played, or from before the merge. */
  block?: BlockRunSave;
}

/** The save as the game holds it: the current run as it's played (`loadFight`). */
type Held = Omit<RunSave, 'current'> & { current: RunState | null };

const stored = readStore<RunSave>(KEY, { current: null, seenScenes: [], jobs: {} });
const data: Held = { ...stored, current: stored.current && loadFight(stored.current) };

/** Writes the save, with the current run as it's saved (`saveFight`). */
const persist = () =>
  writeStore(KEY, { ...data, current: data.current && saveFight(data.current) } satisfies RunSave);

/** The run in progress or just finished, if any. */
export function getCurrentRun(): RunState | null {
  return data.current;
}

/** Saves the run (or clears it with null). Called after every change, so a reload resumes it. */
export function saveCurrentRun(state: RunState | null): void {
  // Only a real change counts as newer. Opening a run saves it unchanged, which
  // mustn't let an out-of-date device win a merge.
  if (JSON.stringify(state) !== JSON.stringify(data.current)) data.currentUpdatedAt = Date.now();
  data.current = state;
  persist();
}

export function hasSeenScene(id: string): boolean {
  return data.seenScenes.includes(id);
}

export function markSceneSeen(id: string): void {
  if (!data.seenScenes.includes(id)) data.seenScenes.push(id);
  persist();
}

export function hasSeenTip(power: string): boolean {
  return (data.seenTips ?? []).includes(power);
}

export function markTipSeen(power: string): void {
  data.seenTips = [...new Set([...(data.seenTips ?? []), power])];
  persist();
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
  if (won) next.wonOn = withWin(prev, 'grid');
  if (won && run.mode === 'hearts') {
    // A first Hits-on win starts the best fresh: an older one may be from a Relaxed run.
    next.bestHp = Math.max(prev.hitsOnWins ? (prev.bestHp ?? 0) : 0, run.hp);
    next.hitsOnWins = (prev.hitsOnWins ?? 0) + 1;
  }
  data.jobs[run.runId] = next;
  return save({ ...run, recorded: true });
}

/** A job's boards with `dim` added. */
export const withWin = (stats: JobStats, dim: Dimension): Dimension[] =>
  [...new Set([...(stats.wonOn ?? []), dim])].sort();

/** Cubed's run in progress or just finished, if any (Cubed's view: cubed/game/runSave.ts). */
export const getBlockRun = (): object | null => data.block?.current ?? null;

/**
 * Saves Cubed's run, as it's saved (or clears it with null), dated like the 2D game's: only
 * a real change counts as newer. `changed` says whether it is one; by default, whether it
 * differs from the run saved. Cubed's view passes it, since a run can be saved anew in a
 * newer shape without changing (#169).
 */
export function saveBlockRun(
  state: object | null,
  changed = JSON.stringify(state) !== JSON.stringify(data.block?.current ?? null),
): void {
  const block = data.block ?? { current: null };
  if (changed) block.currentUpdatedAt = Date.now();
  data.block = { ...block, current: state };
  persist();
}

/** Replaces a job's stats (Cubed records its own runs: cubed/game/runSave.ts). */
export function setJobStats(id: string, stats: JobStats): void {
  data.jobs[id] = stats;
  persist();
}

/** Every job with stats: played at least once, on either board. */
export const jobIds = () => Object.keys(data.jobs);

/** Every job won at least once, on either board. */
export const clearedJobs = () =>
  Object.entries(data.jobs)
    .filter(([, s]) => s.wins > 0)
    .map(([id]) => id);

function save(recorded: RunState): RunState {
  saveCurrentRun(recorded);
  return recorded;
}
