import { describe, expect, it } from 'vitest';
import { lineName } from './format';

describe('lineName', () => {
  it('names lines 1-based', () => {
    expect(lineName({ kind: 'row', index: 2 })).toBe('row 3');
    expect(lineName({ kind: 'col', index: 0 }, true)).toBe('Column 1');
  });
});
