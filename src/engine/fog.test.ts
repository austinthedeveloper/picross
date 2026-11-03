import { describe, expect, it } from 'vitest';
import { isFogged, liftFog } from './fog';

describe('liftFog', () => {
  const fog = { rows: [1, 3], cols: [0, 4] };

  it('clears crossing fog where the completed line is filled', () => {
    // Completing row 2, filled at columns 0 and 2 (not 4).
    const left = liftFog(fog, 'row', 2, (c) => c === 0 || c === 2);
    expect(left).toEqual({ rows: [1, 3], cols: [4] });
  });

  it('clears the completed line’s own fog', () => {
    expect(liftFog(fog, 'col', 4, () => false)).toEqual({ rows: [1, 3], cols: [0] });
  });

  it('reports fogged lines', () => {
    expect(isFogged(fog, 'row', 3)).toBe(true);
    expect(isFogged(fog, 'col', 3)).toBe(false);
  });
});
