import { describe, expect, it } from 'vitest';
import { assembleChapters, parseChapter } from './puzzles/chapters';
import { chapterFiles } from './puzzles/files/chapters';
import { encounterFiles } from './puzzles/files/encounters';
import { runFiles } from './puzzles/files/runs';
import { checkRunLinks, parseEncounter, parseRun, type StoryRun } from './puzzles/runs';

/**
 * The story's own files, read with no board: any puzzle id, and the enemy as written. Each
 * game reads them again with its puzzles and enemies (and the 2D game's tests check every
 * enemy against its 2D puzzle), but broken story data fails here first.
 */
const records = (files: Record<string, { default: unknown }>) =>
  Object.values(files).map((mod) => mod.default);

const encounters = new Map(
  records(encounterFiles).map((data) => {
    const e = parseEncounter(data, { puzzle: (id) => id, enemy: (enemy) => enemy });
    return [e.id, e] as const;
  }),
);
const runs = new Map(
  records(runFiles).map((data) => {
    const run = parseRun(data, (id) => encounters.get(id));
    return [run.id, run] as const;
  }),
);
const jobs = [...runs.values()].filter((run) => !run.overtimeOf && !run.bossOf);

describe('the story', () => {
  it('reads every encounter and job', () => {
    expect(encounters.size).toBe(Object.keys(encounterFiles).length);
    expect(runs.size).toBe(Object.keys(runFiles).length);
    expect(() => checkRunLinks(runs)).not.toThrow();
  });

  it('puts every job in exactly one chapter', () => {
    const parsed = records(chapterFiles).map((data) =>
      parseChapter<StoryRun<unknown>>(data, (id) => runs.get(id)),
    );
    const chapters = assembleChapters(parsed, jobs);
    expect(chapters.map((c) => c.number)).toEqual(chapters.map((_, i) => i + 1));
    expect(chapters.flatMap((c) => c.jobs)).toHaveLength(jobs.length);
  });
});
