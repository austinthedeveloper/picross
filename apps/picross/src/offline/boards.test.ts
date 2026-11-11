import { describe, expect, it } from 'vitest';
import { isBoardRoute } from './boards';

describe('isBoardRoute', () => {
  it.each([
    '#/play/heart',
    '#/run/play',
    '#/daily',
    '#/mural/harbor/3',
    '#/editor',
    '#/cubed/play/steps',
    '#/cubed/tutorial',
    '#/cubed/diorama/park/2',
    '#/cubed/story/play',
    '#/cubed/editor',
    '#/cubed/p/abc123',
    '#/cubed/p/abc123/test',
  ])('%s is a board', (hash) => expect(isBoardRoute(hash)).toBe(true));

  it.each([
    '',
    '#/',
    '#/run',
    '#/badges',
    '#/how-to-play',
    '#/mural/harbor',
    '#/scene/first-job-intro',
    '#/cubed',
    '#/cubed/',
    '#/cubed/story',
    '#/cubed/diorama/park',
    '#/cubed/how-to-play',
    // The old links to Cubed's daily and badges: they never stay up (main.ts moves them to
    // #/daily and #/badges).
    '#/cubed/daily',
    '#/cubed/badges',
    // Free play's tabs (#153): lists, so an update can reload there.
    '#/free',
    '#/free/flat',
    '#/free/cubed',
    // Look-alikes.
    '#/play/',
    '#/dailyx',
    '#/cubed/play/steps/extra',
  ])('%s is not', (hash) => expect(isBoardRoute(hash)).toBe(false));
});
