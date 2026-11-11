import { describe, expect, it } from 'vitest';
import { chapterFiles } from '@picross/story/puzzles/files/chapters';
import { runFiles } from '@picross/story/puzzles/files/runs';
import { chapters, getJob, jobs, storyIssues } from './data';

// What this game can't play yet (`storyIssues`) is reported by packages/story's
// boards.test.ts, the story's gate, rather than failing here.
describe('the story, as imported from the 2D game', () => {
  it('has every chapter, and every job but the ones it reports, with a 3D puzzle each', () => {
    const files = Object.keys(chapterFiles);
    expect(chapters.map((c) => c.number)).toEqual(files.map((_, i) => i + 1));
    const ids = Object.values(runFiles).map((mod) => (mod.default as { id: string }).id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      if (!getJob(id))
        expect(storyIssues.some((issue) => issue.startsWith(`job "${id}"`))).toBe(true);
    }
    for (const job of jobs) {
      for (const e of job.encounters) expect(e.puzzle.id).toBeTruthy();
    }
  });

  it('keeps enemies, rests, digs and their gadgets', () => {
    const first = getJob('first-job')!;
    const [goblin, dig, , rest] = first.encounters;
    expect(goblin.kind).toBe('fight');
    expect(goblin.enemy!.hp).toBeGreaterThan(0);
    expect(dig).toMatchObject({ kind: 'dig', gadget: 'bomb' });
    expect(rest.rest).toEqual({ seconds: 120, heal: 4 });
  });

  it('turns 2D fog lines into a count of lines', () => {
    const angler = jobs.flatMap((j) => j.encounters).find((e) => e.id === 'anglerfish')!;
    expect(angler.enemy).toMatchObject({ fog: 5, phases: [{ at: 0.8, fog: 3 + 2 }] });
  });
});
