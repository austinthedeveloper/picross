import { describe, expect, it } from 'vitest';
import { runs } from './runs';
import { chapters } from './chapters';

// Reading and checking a chapter is tested in packages/story (src/puzzles/chapters.test.ts).

describe('chapters', () => {
  it('cover every job, and each chapter after the first follows on from the last', () => {
    expect(chapters.flatMap((c) => c.jobs).length).toBe(runs.length);
    chapters.slice(1).forEach((c, i) => {
      const before = chapters[i].jobs.map((j) => j.id);
      expect(before).toContain(c.jobs[0].requires);
    });
  });
});
