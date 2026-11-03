import { describe, expect, it } from 'vitest';
import { isFogged, liftFog } from './fog';

describe('liftFog', () => {
  const fog = { rows: [1, 3], cols: [] };

  it('clears only the completed line', () => {
    expect(liftFog(fog, 'row', 3)).toEqual({ rows: [1], cols: [] });
  });

  it('ignores completed lines that cross the fog', () => {
    expect(liftFog(fog, 'col', 0)).toEqual(fog);
  });

  it('reports fogged lines', () => {
    expect(isFogged(fog, 'row', 3)).toBe(true);
    expect(isFogged(fog, 'col', 3)).toBe(false);
  });
});
