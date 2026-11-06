import { describe, expect, it } from 'vitest';
import { backdrops, parseBackdrop } from './backdrops';
import { runs } from './runs';
import { scenes } from './scenes';

describe('parseBackdrop', () => {
  it('reads the size from the rows', () => {
    expect(parseBackdrop({ id: 'b', rows: ['#..', '.#.'] })).toMatchObject({
      width: 3,
      height: 2,
    });
  });

  it.each([
    [{ rows: ['#'] }, /missing id/],
    [{ id: 'b' }, /rows must be/],
    [{ id: 'b', rows: [] }, /rows must be/],
    [{ id: 'b', rows: ['##', '#'] }, /same width/],
    [{ id: 'b', rows: ['#x'] }, /only # and \./],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseBackdrop(input)).toThrow(error);
  });
});

describe('bundled backdrops', () => {
  it('are all used by a scene', () => {
    const used = new Set(scenes.map((scene) => scene.backdrop));
    expect(backdrops.map((b) => b.id).filter((id) => !used.has(id))).toEqual([]);
  });

  it('are behind every scene that plays', () => {
    // A run's outro is only ever text on the results screen.
    const outros = new Set(runs.map((run) => run.outro));
    const bare = scenes.filter((scene) => !scene.backdrop && !outros.has(scene.id));
    expect(bare.map((scene) => scene.id)).toEqual([]);
  });
});
