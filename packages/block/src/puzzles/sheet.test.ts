import { describe, expect, it } from 'vitest';
import { parsePuzzle } from './format';
import { parseSheet, toSheet } from './sheet';

const SHEET = `
# Two small ones
== mug "Mug" hide=0.4
b=sky
bbb.. bbb..
bbb.. b.bbb

== dot "Dot"
r=red
r
`;

describe('sheets', () => {
  it('reads puzzles with layers side by side', () => {
    const [mug, dot] = parseSheet(SHEET);
    expect(mug).toEqual({
      id: 'mug',
      name: 'Mug',
      hideRatio: 0.4,
      colors: { b: 'sky' },
      layers: [
        ['bbb..', 'bbb..'],
        ['bbb..', 'b.bbb'],
      ],
    });
    expect(parsePuzzle(dot).dims).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('round-trips through toSheet', () => {
    const [mug] = parseSheet(SHEET);
    expect(parseSheet(toSheet(mug))).toEqual([mug]);
  });

  it('says where a row has the wrong number of layers', () => {
    expect(() => parseSheet('== a "A"\nr=red\nr r\nr')).toThrow(/line 4/);
  });
});
