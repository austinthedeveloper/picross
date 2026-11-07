import { describe, expect, it } from 'vitest';
import { deriveClues } from './clues';
import { TRANSFORMS, transformGrid, turnClue, turnIndex, turnLine, turnLines } from './transform';

// 3 wide, 2 tall:  a b c
//                  d e f
const grid = { width: 3, height: 2, cells: ['a', 'b', 'c', 'd', 'e', 'f'] };
const rows = (g: { width: number; cells: string[] }) =>
  Array.from({ length: g.cells.length / g.width }, (_, r) =>
    g.cells.slice(r * g.width, (r + 1) * g.width).join(''),
  );

describe('transformGrid', () => {
  it.each([
    [0, ['abc', 'def']],
    [1, ['da', 'eb', 'fc']], // a quarter turn clockwise
    [2, ['fed', 'cba']],
    [3, ['cf', 'be', 'ad']],
    [4, ['cba', 'fed']], // flipped left to right
    [5, ['fc', 'eb', 'da']],
    [6, ['def', 'abc']],
    [7, ['ad', 'be', 'cf']],
  ])('%i: %j', (t, expected) => {
    expect(rows(transformGrid(grid, t))).toEqual(expected);
  });

  it('gives eight different grids for a lopsided picture', () => {
    const all = TRANSFORMS.map((_, t) => rows(transformGrid(grid, t)).join('/'));
    expect(new Set(all).size).toBe(8);
  });
});

describe('turning a square board (#83)', () => {
  // 3×3:  a b c
  //       d e f
  //       g h i
  const square = { width: 3, height: 3, cells: [...'abcdefghi'] };

  it('moves each cell where a quarter turn moves it', () => {
    for (const turns of [1, 2, 3]) {
      const turned = transformGrid(square, turns);
      square.cells.forEach((cell, i) => expect(turned.cells[turnIndex(i, 3, turns)]).toBe(cell));
    }
  });

  it('makes row r column n-1-r, and column c row c', () => {
    expect(turnLine({ kind: 'row', index: 0 }, 3)).toEqual({ kind: 'col', index: 2 });
    expect(turnLine({ kind: 'col', index: 0 }, 3)).toEqual({ kind: 'row', index: 0 });
    expect(turnLine({ kind: 'row', index: 0 }, 3, 4)).toEqual({ kind: 'row', index: 0 });
    expect(turnLines({ rows: [0, 1], cols: [2] }, 3)).toEqual({ rows: [2], cols: [2, 1] });
  });

  it('goes back with negative turns', () => {
    for (let i = 0; i < 9; i++) expect(turnIndex(turnIndex(i, 3, 3), 3, -3)).toBe(i);
    const line = { kind: 'col', index: 1 } as const;
    expect(turnLine(turnLine(line, 3), 3, -1)).toEqual(line);
  });

  it('turns clues with their lines: a column that becomes a row reads backwards', () => {
    const solution = { width: 3, height: 3, cells: [...'##.#....#'].map((c) => c === '#') };
    const before = deriveClues(solution);
    for (const turns of [1, 2, 3]) {
      const after = deriveClues(transformGrid(solution, turns));
      for (const kind of ['row', 'col'] as const) {
        for (let index = 0; index < 3; index++) {
          const clue = (kind === 'row' ? before.rows : before.cols)[index];
          const turned = turnClue({ kind, index }, clue, 3, turns);
          const lines = turned.line.kind === 'row' ? after.rows : after.cols;
          expect(lines[turned.line.index]).toEqual(turned.clue);
        }
      }
    }
    // Column 1 reads 2 1 from the top. Turned, its bottom end is row 1's left end.
    expect(turnClue({ kind: 'col', index: 0 }, [2, 1], 4)).toEqual({
      line: { kind: 'row', index: 0 },
      clue: [1, 2],
    });
  });
});
