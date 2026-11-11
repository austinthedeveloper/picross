import { describe, expect, it } from 'vitest';
import { blastSize, pickBlast } from './blast';
import { Cell, createBoard, revealedCell, type Board, type Solution } from './board';
import { random } from '@picross/shared/engine/random';

const solution = (size: number): Solution => ({
  width: size,
  height: size,
  cells: Array.from({ length: size * size }, (_, i) => i % 3 === 0),
});

/** A board with every cell already showing the truth. */
function finished(s: Solution): Board {
  return { ...createBoard(s.width, s.height), cells: s.cells.map((_, i) => revealedCell(s, i)) };
}

const unsolved = (board: Board, s: Solution, cells: number[]) =>
  cells.filter((i) => board.cells[i] !== revealedCell(s, i)).length;

describe('blastSize', () => {
  it('scales with the board', () => {
    expect(blastSize(10, 10)).toBe(3);
    expect(blastSize(15, 15)).toBe(5);
    expect(blastSize(20, 20)).toBe(5);
  });
});

describe('pickBlast', () => {
  it('hits a whole square, centered on the row and column it reports', () => {
    const s = solution(15);
    const blast = pickBlast(createBoard(15, 15), s, 5, () => 0)!;
    expect(blast.cells).toHaveLength(25);
    expect(blast.cells[0]).toBe(0);
    expect(blast.cells[24]).toBe(4 * 15 + 4);
    expect([blast.row, blast.col]).toEqual([2, 2]);
  });

  it('can land anywhere on an empty board', () => {
    const s = solution(10);
    const last = pickBlast(createBoard(10, 10), s, 3, () => 0.999)!;
    expect(last.cells[8]).toBe(99);
    expect([last.row, last.col]).toEqual([8, 8]);
  });

  it('is decided by the random source', () => {
    const s = solution(15);
    const pick = (seed: number) => pickBlast(createBoard(15, 15), s, 5, random(seed))!.cells[0];
    expect(pick(7)).toBe(pick(7));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(pick)).size).toBeGreaterThan(1);
  });

  it('only picks spots where at least half the blast is unsolved', () => {
    const s = solution(15);
    const board = finished(s);
    // Rows 0 to 3 are finished, and everything from row 4 down is untouched.
    for (let i = 4 * 15; i < board.cells.length; i++) board.cells[i] = Cell.Empty;
    const next = random(11);
    for (let n = 0; n < 200; n++) {
      const blast = pickBlast(board, s, 5, next)!;
      expect(unsolved(board, s, blast.cells)).toBeGreaterThanOrEqual(13);
    }
  });

  it('falls back to the spots with the most unsolved cells on a nearly finished board', () => {
    const s = solution(15);
    const board = finished(s);
    board.cells[7 * 15 + 7] = Cell.Empty;
    board.cells[7 * 15 + 8] = Cell.Empty;
    const next = random(3);
    for (let n = 0; n < 100; n++) {
      const blast = pickBlast(board, s, 5, next)!;
      expect(unsolved(board, s, blast.cells)).toBe(2);
    }
  });

  it('counts a wrong fill as unsolved', () => {
    const s = solution(10);
    const board = finished(s);
    board.cells[1] = Cell.Filled; // not in the picture
    const blast = pickBlast(board, s, 3, () => 0)!;
    expect(blast.cells).toContain(1);
  });

  it('returns null when nothing is left to reveal', () => {
    const s = solution(10);
    expect(pickBlast(finished(s), s, 3)).toBeNull();
  });

  it('fits a board smaller than the blast', () => {
    const s = solution(2);
    expect(pickBlast(createBoard(2, 2), s, 5, () => 0)!.cells).toEqual([0, 1, 2, 3]);
  });
});
