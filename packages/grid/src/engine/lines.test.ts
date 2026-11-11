import { describe, expect, it } from 'vitest';
import {
  hasLine,
  keyToLine,
  lineKey,
  lineKeys,
  linesRemoved,
  removeLine,
  unionLines,
} from './lines';

describe('line sets', () => {
  const set = { rows: [1, 3], cols: [0] };

  it('removes only the completed line', () => {
    expect(removeLine(set, 'row', 3)).toEqual({ rows: [1], cols: [0] });
    expect(removeLine(set, 'col', 4)).toEqual(set);
  });

  it('answers membership', () => {
    expect(hasLine(set, 'row', 3)).toBe(true);
    expect(hasLine(set, 'col', 3)).toBe(false);
  });

  it('converts lines to keys and back', () => {
    expect(lineKey('col', 12)).toBe('c12');
    expect(keyToLine('r7')).toEqual({ kind: 'row', index: 7 });
    expect(lineKeys(set)).toEqual(['r1', 'r3', 'c0']);
  });

  it('lists removed lines and unions sets', () => {
    expect(linesRemoved(set, { rows: [1], cols: [] })).toEqual([
      { kind: 'row', index: 3 },
      { kind: 'col', index: 0 },
    ]);
    expect(unionLines([set, undefined, { rows: [3, 5], cols: [] }])).toEqual({
      rows: [1, 3, 5],
      cols: [0],
    });
  });
});
