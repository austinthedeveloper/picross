import { describe, expect, it } from 'vitest';
import { formatTime, plural } from './format';

describe('format', () => {
  it('formats times', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(61_000)).toBe('1:01');
    expect(formatTime(3_725_000)).toBe('1:02:05');
  });

  it('pluralizes', () => {
    expect(plural(1, 'hint')).toBe('1 hint');
    expect(plural(2, 'hint')).toBe('2 hints');
  });
});
