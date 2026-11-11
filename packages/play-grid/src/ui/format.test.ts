import { describe, expect, it } from 'vitest';
import { formatTime, lineName } from './format';

describe('formatTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65_400)).toBe('1:05');
    expect(formatTime(3_726_000)).toBe('1:02:06');
  });
});

describe('lineName', () => {
  it('names lines 1-based', () => {
    expect(lineName({ kind: 'row', index: 2 })).toBe('row 3');
    expect(lineName({ kind: 'col', index: 0 }, true)).toBe('Column 1');
  });
});
