import { qualify, type Dimension } from '@picross/shared/puzzles/ids';
import { combine, higher, mergeBestHp, present, union, unknownFields, type Loose } from './merging';
import type { BlockSavedBoard, PuzzleStats, SavedBoard, SaveData } from './progress';
import type { JobStats, RunSave } from './runSave';
import type { Settings } from './settings';

/**
 * The first-launch merge of the two old games' saves (#155): the 2D game's `picross:*` and
 * Picross Cubed's `picross3d:*`, into one save. Pure, like `saveMerge.ts` (which merges two
 * copies of one save across devices), and built from the same pieces. The difference is in
 * the counts: two copies of one save hold the same plays, so that merge takes the higher;
 * these are two games, so plays, wins and time played add up.
 *
 * `migrate.ts` reads the old keys, calls this, and writes the result. It imports types only,
 * so nothing here reads storage.
 */

/** A free-play save from before the merge (`picross:v1`, `picross3d:v1`): bare ids. */
export interface LegacyProgress<B> {
  solved?: Record<string, PuzzleStats>;
  boards?: Record<string, B>;
  totalTime?: number;
  /** Cubed's editor play-tests solved. */
  playtests?: number;
}

/** Cubed's story save (`picross3d:run`). Its run is Cubed's RunState, kept as it is. */
export interface LegacyCubedRun {
  current?: object | null;
  seenScenes?: string[];
  seenTips?: string[];
  jobs?: Record<string, JobStats>;
}

/** Cubed's settings (`picross3d:settings`). */
export interface LegacyCubedSettings {
  mode?: Settings['mode'];
  listFilter?: Settings['listFilter'];
  listDifficulty?: string;
  dimDone?: boolean;
  tutorialDone?: boolean;
  muted?: boolean;
  highContrast?: boolean;
  haptics?: boolean;
}

/** What the 2D game had saved, each key as read (missing if it wasn't there). */
export interface FlatSaves {
  progress?: LegacyProgress<SavedBoard>;
  run?: Partial<RunSave>;
  settings?: Partial<Settings>;
  /** `picross:game`: the Flat | Cubed switch's last pick. */
  game?: string | null;
}

/** What Cubed had saved. */
export interface CubedSaves {
  progress?: LegacyProgress<BlockSavedBoard>;
  run?: LegacyCubedRun;
  settings?: LegacyCubedSettings;
}

/** The merged save. A part is missing when neither game had anything for it. */
export interface MergedSaves {
  progress?: SaveData;
  run?: RunSave;
  settings?: Partial<Settings>;
}

/** Re-keys a record by qualified id. An id that can't be qualified (it has a `:`) is left out. */
function qualified<T>(dim: Dimension, record: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, value] of Object.entries(record ?? {})) {
    if (id && !id.includes(':')) out[qualify(dim, id)] = value;
  }
  return out;
}

/** Free play: each game's puzzles under its own dimension, so the two `mug`s stay apart. */
export function mergeProgress(
  flat: LegacyProgress<SavedBoard> | undefined,
  cubed: LegacyProgress<BlockSavedBoard> | undefined,
): SaveData | undefined {
  if (!flat && !cubed) return undefined;
  return present({
    solved: { ...qualified('grid', flat?.solved), ...qualified('block', cubed?.solved) },
    boards: {
      ...qualified<SavedBoard | BlockSavedBoard>('grid', flat?.boards),
      ...qualified<SavedBoard | BlockSavedBoard>('block', cubed?.boards),
    },
    time: present({ grid: flat?.totalTime, block: cubed?.totalTime }),
    playtests: cubed?.playtests,
  });
}

/** The boards a side won a job on. */
const won = (stats: JobStats | undefined, dim: Dimension): Dimension[] =>
  stats?.wins ? [dim] : [];

const add = (a: number | undefined, b: number | undefined) => combine(a, b, (x, y) => x + y);

/**
 * One job's stats from both games. A job is the same job on either board, so the counts add
 * up, the bests take the better, and `wonOn` says where it was won.
 */
export function mergeJob(flat: JobStats | undefined, cubed: JobStats | undefined): JobStats {
  const [a, b] = [flat ?? { plays: 0, wins: 0 }, cubed ?? { plays: 0, wins: 0 }];
  // Sorted, as the run save keeps it (runSave.ts's withWin).
  const wonOn = [...won(flat, 'grid'), ...won(cubed, 'block')].sort();
  return present({
    ...unknownFields(a, b),
    plays: (a.plays ?? 0) + (b.plays ?? 0),
    wins: (a.wins ?? 0) + (b.wins ?? 0),
    hitsOnWins: add(a.hitsOnWins, b.hitsOnWins),
    bestHp: mergeBestHp(a, b),
    bestDepth: higher(a.bestDepth, b.bestDepth),
    wonOn: wonOn.length ? wonOn : undefined,
  });
}

function mergeJobs(
  flat: Record<string, JobStats> | undefined,
  cubed: Record<string, JobStats> | undefined,
): Record<string, JobStats> {
  const out: Record<string, JobStats> = {};
  for (const id of new Set([...Object.keys(flat ?? {}), ...Object.keys(cubed ?? {})])) {
    out[id] = mergeJob(flat?.[id], cubed?.[id]);
  }
  return out;
}

const RUN_FIELDS = ['current', 'currentUpdatedAt', 'seenScenes', 'seenTips', 'jobs', 'block'];

/**
 * The story: both runs in progress survive (Cubed's under `block`, as Cubed saved it), the
 * scenes and tips seen are one set, and the jobs merge job by job.
 */
export function mergeRuns(
  flat: Partial<RunSave> | undefined,
  cubed: LegacyCubedRun | undefined,
): RunSave | undefined {
  if (!flat && !cubed) return undefined;
  // Fields the 2D game's save has that this doesn't know pass through.
  const rest = Object.fromEntries(
    Object.entries(flat ?? {}).filter(([key]) => !RUN_FIELDS.includes(key)),
  ) as Loose;
  return present({
    ...rest,
    current: flat?.current ?? null,
    currentUpdatedAt: flat?.currentUpdatedAt,
    seenScenes: union(flat?.seenScenes, cubed?.seenScenes) ?? [],
    seenTips: union(flat?.seenTips, cubed?.seenTips),
    jobs: mergeJobs(flat?.jobs, cubed?.jobs),
    block: cubed ? { current: cubed.current ?? null } : undefined,
  });
}

/** Settings both games have. The 2D game's value wins where it saved one. */
export const SHARED_SETTINGS = [
  'mode',
  'listFilter',
  'listDifficulty',
  'muted',
  'highContrast',
  'haptics',
] as const;

/**
 * One set of settings. A shared setting is the 2D game's where `picross:settings` has it, and
 * Cubed's otherwise; the 2D game's own fields stay as they were; Cubed's own come in as
 * `dimDone` and `cubedTutorialDone`; and the switch's last pick becomes `freePlayTab`. Only
 * what was saved comes back: a setting neither game saved keeps its default.
 */
export function mergeSettings(
  flat: Partial<Settings> | undefined,
  cubed: LegacyCubedSettings | undefined,
  game?: string | null,
): Partial<Settings> | undefined {
  const tab = game === 'flat' || game === 'cubed' ? game : undefined;
  if (!flat && !cubed && !tab) return undefined;
  const out: Loose = { ...flat };
  for (const key of SHARED_SETTINGS) {
    if (out[key] === undefined && cubed?.[key] !== undefined) out[key] = cubed[key];
  }
  if (out.dimDone === undefined) out.dimDone = cubed?.dimDone;
  if (out.cubedTutorialDone === undefined) out.cubedTutorialDone = cubed?.tutorialDone;
  if (out.freePlayTab === undefined) out.freePlayTab = tab;
  return present(out) as Partial<Settings>;
}

/** Both games' saves as one. Daily and badges aren't here: #156 and #157 merge them. */
export function mergeLegacy(flat: FlatSaves, cubed: CubedSaves): MergedSaves {
  return present({
    progress: mergeProgress(flat.progress, cubed.progress),
    run: mergeRuns(flat.run, cubed.run),
    settings: mergeSettings(flat.settings, cubed.settings, flat.game),
  });
}
