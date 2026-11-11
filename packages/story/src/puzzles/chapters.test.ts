import { describe, expect, it } from 'vitest';
import { assembleChapters, parseChapter } from './chapters';

const job = (id: string) => ({ id, name: id });
const jobs = [job('a'), job('b')];
const find = (id: string) => jobs.find((j) => j.id === id);

describe('parseChapter', () => {
  it('resolves its jobs in order', () => {
    const c = parseChapter({ id: 'c', title: 'C', order: 1, jobs: ['b', 'a'] }, find);
    expect(c.jobs.map((j) => j.id)).toEqual(['b', 'a']);
  });

  it("leaves out a job the game can't play yet (null), but not an unknown one", () => {
    const skip = (id: string) => (id === 'b' ? null : find(id));
    const c = parseChapter({ id: 'c', title: 'C', order: 1, jobs: ['b', 'a'] }, skip);
    expect(c.jobs.map((j) => j.id)).toEqual(['a']);
    expect(() => parseChapter({ id: 'c', title: 'C', order: 1, jobs: ['x'] }, skip)).toThrow(
      /unknown job "x"/,
    );
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
