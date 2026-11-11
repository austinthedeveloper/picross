import { getScene } from './scenes';

/**
 * Reading chapters (`chapters/*.json`) for any board. Each game finds the jobs with its own
 * `findJob`, so a chapter holds that game's runs.
 */

/** A chapter (#23): a named group of jobs, in order, on the jobs board. */
export interface ChapterFile {
  id: string;
  title: string;
  /** One line under the chapter's heading. */
  blurb?: string;
  /** Position on the jobs board (lowest first). */
  order: number;
  /** Job ids, in the order they're played. */
  jobs: string[];
  /** A scene played the first time the chapter opens: the story beat between chapters. */
  opening?: string;
}

/** A chapter holding a game's jobs (`J`). */
export interface StoryChapter<J> extends Omit<ChapterFile, 'jobs'> {
  /** 1-based, from the board order. */
  number: number;
  jobs: J[];
}

/**
 * Reads and checks a chapter's file. `findJob` gives a job by id: `undefined` for a job the
 * story doesn't have (that's an error), or `null` for one this game can't play yet, which
 * is left out of the chapter.
 */
export function parseChapter<J>(
  data: unknown,
  findJob: (id: string) => J | undefined | null,
): Omit<StoryChapter<J>, 'number'> {
  const file = data as Partial<ChapterFile>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid chapter${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  if (typeof file.title !== 'string' || !file.title) fail('missing title');
  if (!Number.isFinite(file.order)) fail('order must be a number');
  if (!Array.isArray(file.jobs) || !file.jobs.length) fail('needs jobs');
  const jobs = file.jobs!.flatMap((id) => {
    const job = findJob(id);
    return job === null ? [] : [job ?? fail(`unknown job "${id}"`)];
  });
  if (file.opening !== undefined && !getScene(file.opening)) {
    fail(`unknown opening scene "${file.opening}"`);
  }
  return {
    id: file.id!,
    title: file.title!,
    order: file.order!,
    jobs,
    ...(file.blurb ? { blurb: file.blurb } : {}),
    ...(file.opening ? { opening: file.opening } : {}),
  };
}

/** Puts chapters in board order and numbers them; every job must be in exactly one. */
export function assembleChapters<J extends { id: string }>(
  parsed: Omit<StoryChapter<J>, 'number'>[],
  allJobs: J[],
): StoryChapter<J>[] {
  const chapters = [...parsed]
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, number: i + 1 }));
  for (const job of allJobs) {
    const homes = chapters.filter((c) => c.jobs.includes(job));
    if (homes.length !== 1) {
      throw new Error(`Job "${job.id}" must be in exactly one chapter (it's in ${homes.length})`);
    }
  }
  return chapters;
}
