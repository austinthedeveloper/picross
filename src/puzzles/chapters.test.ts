import { describe, expect, it } from 'vitest';
import type { RunDef } from './runs';
import { runs } from './runs';
import { assembleChapters, chapters, parseChapter } from './chapters';

const job = (id: string) => ({ id, name: id, hp: 10, encounters: [], gadgets: [] }) as RunDef;
const jobs = [job('a'), job('b')];
const find = (id: string) => jobs.find((j) => j.id === id);

describe('parseChapter', () => {
  it('resolves its jobs in order', () => {
    const c = parseChapter({ id: 'c', title: 'C', order: 1, jobs: ['b', 'a'] }, find);
    expect(c.jobs.map((j) => j.id)).toEqual(['b', 'a']);
  });

  it.each([
    [{ title: 'C', order: 1, jobs: ['a'] }, /missing id/],
    [{ id: 'c', order: 1, jobs: ['a'] }, /missing title/],
    [{ id: 'c', title: 'C', jobs: ['a'] }, /order/],
    [{ id: 'c', title: 'C', order: 1, jobs: [] }, /needs jobs/],
    [{ id: 'c', title: 'C', order: 1, jobs: ['nope'] }, /unknown job "nope"/],
    [{ id: 'c', title: 'C', order: 1, jobs: ['a'], opening: 'nope' }, /unknown opening/],
  ])('rejects %j', (data, error) => {
    expect(() => parseChapter(data, find)).toThrow(error);
  });
});

describe('assembleChapters', () => {
  it('sorts and numbers chapters', () => {
    const two = parseChapter({ id: 'two', title: 'Two', order: 5, jobs: ['b'] }, find);
    const one = parseChapter({ id: 'one', title: 'One', order: 1, jobs: ['a'] }, find);
    expect(assembleChapters([two, one], jobs).map((c) => [c.id, c.number])).toEqual([
      ['one', 1],
      ['two', 2],
    ]);
  });

  it('needs every job in exactly one chapter', () => {
    const one = parseChapter({ id: 'one', title: 'One', order: 1, jobs: ['a'] }, find);
    expect(() => assembleChapters([one], jobs)).toThrow(/"b" must be in exactly one/);
    expect(() => assembleChapters([one, one], [jobs[0]])).toThrow(/in 2/);
  });
});

describe('chapters', () => {
  it('cover every job, and each chapter after the first follows on from the last', () => {
    expect(chapters.flatMap((c) => c.jobs).length).toBe(runs.length);
    chapters.slice(1).forEach((c, i) => {
      const before = chapters[i].jobs.map((j) => j.id);
      expect(before).toContain(c.jobs[0].requires);
    });
  });
});
