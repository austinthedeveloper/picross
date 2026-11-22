import { describe, expect, it } from 'vitest';
import { bricksHref, parseBricksPath } from './href';

describe('the bricks route’s paths', () => {
  it('reads the picker, a build and a toy’s moment', () => {
    expect(parseBricksPath('')).toEqual({ page: 'picker' });
    expect(parseBricksPath('/')).toEqual({ page: 'picker' });
    expect(parseBricksPath('/car')).toEqual({ page: 'build', id: 'car' });
    expect(parseBricksPath('/car/show')).toEqual({ page: 'show', id: 'car' });
    expect(parseBricksPath('/car/nope')).toBeNull();
  });

  it('reads the steps for real bricks, with or without a step', () => {
    expect(parseBricksPath('/car/steps')).toEqual({ page: 'steps', id: 'car', step: null });
    expect(parseBricksPath('/car/steps/0')).toEqual({ page: 'steps', id: 'car', step: 0 });
    expect(parseBricksPath('/car/steps/12')).toEqual({ page: 'steps', id: 'car', step: 12 });
    expect(parseBricksPath('/car/steps/x')).toBeNull();
    expect(parseBricksPath('/car/show/1')).toBeNull();
    expect(parseBricksPath('car')).toBeNull();
  });

  it('writes links under #/bricks', () => {
    expect(bricksHref()).toBe('#/bricks');
    expect(bricksHref('/')).toBe('#/bricks');
    expect(bricksHref('/dog/show')).toBe('#/bricks/dog/show');
  });
});
