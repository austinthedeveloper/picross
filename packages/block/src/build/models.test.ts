import { describe, expect, it } from 'vitest';
import { BRICKS_PUZZLES } from '../puzzles/bricks';
import { PUZZLES, STORY_PUZZLES } from '../puzzles/index';
import { TRIO_PUZZLES } from '../puzzles/trio';
import { buildModel } from './models';

describe('buildModel', () => {
  it('finds a model of every kind', () => {
    expect(buildModel('dog')?.id).toBe('dog'); // the trio's
    expect(buildModel('duck')?.id).toBe('duck'); // Brick kids' own
    expect(buildModel('mug')?.id).toBe('mug'); // free play's
    expect(buildModel(STORY_PUZZLES[0].id)?.id).toBe(STORY_PUZZLES[0].id); // the story's
    expect(buildModel('no-such-model')).toBeUndefined();
  });

  it('finds one model per id: no two sources share one', () => {
    // A story puzzle is named after its encounter's 2D puzzle, so it can share an id with a
    // pack puzzle (bat, octopus…): those count as one source, and buildModel takes the pack's.
    const sources = {
      trio: TRIO_PUZZLES,
      bricks: BRICKS_PUZZLES,
      'pack and story': [...PUZZLES, ...STORY_PUZZLES],
    };
    const seen = new Map<string, string>();
    for (const [source, models] of Object.entries(sources)) {
      for (const id of new Set(models.map((m) => m.id))) {
        expect(seen.get(id), `${id} is in ${source} and ${seen.get(id)}`).toBeUndefined();
        seen.set(id, source);
      }
    }
  });
});
