import { describe, expect, it } from 'vitest';
import { chapters, getJob, jobs, storyIssues } from './data';

describe('the story, as imported from the 2D game', () => {
  // The compatibility gate (docs/story.md): the 2D story uses nothing this game can't play.
  it('has nothing that needs porting', () => {
    expect(storyIssues).toEqual([]);
  });

  it('has every chapter and job, with a 3D puzzle for every encounter', () => {
    expect(chapters.length).toBe(10);
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const c of chapters) expect(c.jobs.length).toBeGreaterThan(0);
    expect(jobs.length).toBe(20);
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
