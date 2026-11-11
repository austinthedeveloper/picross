import { describe, expect, it } from 'vitest';
import { clueFrame, clueOf, clueText } from './clues';
import { EMPTY, FILLED, solve, solveLine, UNKNOWN } from './solver';
import { allLines, indexOf, lineCount, lineIdAt, pointOf, volume } from './volume';

const d = { x: 4, y: 3, z: 2 };

describe('volume', () => {
  it('numbers cubes layer by layer and back again', () => {
    for (let i = 0; i < volume(d); i++) expect(indexOf(d, pointOf(d, i))).toBe(i);
    expect(indexOf(d, { x: 1, y: 2, z: 1 })).toBe(1 + 4 * (1 + 2 * 2));
  });

  it('has a line along each axis through every cube, ids in allLines order', () => {
    const lines = allLines(d);
    expect(lines.length).toBe(lineCount(d, 'x') + lineCount(d, 'y') + lineCount(d, 'z'));
    expect(lines.length).toBe(3 * 2 + 4 * 2 + 4 * 3);
    for (let i = 0; i < volume(d); i++) {
      const p = pointOf(d, i);
      for (const axis of ['x', 'y', 'z'] as const) {
        const line = lines[lineIdAt(d, axis, p)];
        expect(line.axis).toBe(axis);
        expect(line.cells[p[axis]]).toBe(i);
      }
    }
  });
});

describe('clues', () => {
  it('counts cubes and pieces', () => {
    expect(clueOf([false, false])).toEqual({ count: 0, pieces: 0 });
    expect(clueOf([true, true, false])).toEqual({ count: 2, pieces: 1 });
    expect(clueOf([true, false, true])).toEqual({ count: 2, pieces: 2 });
    expect(clueOf([true, false, true, false, true, false, true])).toEqual({ count: 4, pieces: 3 });
  });

  it('frames and reads them', () => {
    expect(clueFrame({ count: 3, pieces: 1 })).toBe('plain');
    expect(clueFrame({ count: 3, pieces: 2 })).toBe('circle');
    expect(clueFrame({ count: 3, pieces: 3 })).toBe('square');
    expect(clueText({ count: 3, pieces: 2 })).toBe('3 in 2 pieces');
  });
});

describe('solver', () => {
  const line = { axis: 'x' as const, cells: [0, 1, 2, 3, 4], id: 0 };

  it('finds the cubes every fitting arrangement agrees on', () => {
    const known = new Uint8Array(5);
    // 4 in one piece in 5: the middle three are certain.
    const step = solveLine(line, { count: 4, pieces: 1 }, known)!;
    expect(step.filled).toEqual([1, 2, 3]);
    expect(step.empty).toEqual([]);
    // 0: all empty.
    expect(solveLine(line, { count: 0, pieces: 0 }, known)!.empty).toEqual([0, 1, 2, 3, 4]);
    // 3 in 2 pieces with the first cube empty and the second filled: 1, gap at 2? Not yet.
    known[0] = EMPTY;
    known[1] = FILLED;
    known[2] = FILLED;
    expect(solveLine(line, { count: 3, pieces: 2 }, known)!).toMatchObject({
      filled: [4],
      empty: [3],
    });
  });

  it('uses just the count when the pieces are unknown', () => {
    const known = new Uint8Array(5);
    // 5 of 5: certain whatever the pieces.
    expect(solveLine(line, { count: 5, pieces: null }, known)!.filled).toEqual([0, 1, 2, 3, 4]);
    // 2 in one piece would say nothing either, but 2 in an unknown number says even less.
    known[0] = FILLED;
    known[4] = FILLED;
    expect(solveLine(line, { count: 2, pieces: null }, known)!.empty).toEqual([1, 2, 3]);
  });

  it('reports a contradiction', () => {
    const known = new Uint8Array([FILLED, FILLED, FILLED, UNKNOWN, UNKNOWN]);
    expect(solveLine(line, { count: 2, pieces: 1 }, known)).toBeNull();
  });

  it('solves a whole block, and needs the clues to', () => {
    const dims = { x: 2, y: 2, z: 2 };
    const lines = allLines(dims);
    // An L of three cubes on the bottom layer.
    const filled = new Set([0, 1, 2]);
    const clues = lines.map((l) => clueOf(l.cells.map((c) => filled.has(c))));
    const result = solve(dims, clues);
    expect(result.solved).toBe(true);
    // Every line's clue says everything at once on a block this small.
    expect(result.firstPass).toBe(1);
    expect([...result.known].map((k) => k === FILLED)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map((c) => filled.has(c)),
    );
    expect(
      solve(
        dims,
        clues.map(() => null),
      ).solved,
    ).toBe(false);
  });

  it('says how much of the block the first sweep settles (#168)', () => {
    const dims = { x: 3, y: 1, z: 1 };
    const lines = allLines(dims);
    // A row of 3 with one cube at the end: only the x line says anything, all at once.
    const filled = new Set([2]);
    const clues = lines.map((l) => clueOf(l.cells.map((c) => filled.has(c))));
    expect(solve(dims, clues, undefined, lines)).toMatchObject({ solved: true, firstPass: 1 });
    // Without the x line, the three single-cube lines settle a cube each.
    const noRow = clues.map((c, i) => (lines[i].axis === 'x' ? null : c));
    expect(solve(dims, noRow, undefined, lines).firstPass).toBe(1);
    // With nothing to read, nothing is settled.
    expect(
      solve(
        dims,
        clues.map(() => null),
        undefined,
        lines,
      ),
    ).toMatchObject({
      passes: 0,
      firstPass: 0,
    });
    // A start counts: one cube known of three, before any sweep.
    const start = new Uint8Array([FILLED, UNKNOWN, UNKNOWN]);
    expect(
      solve(
        dims,
        clues.map(() => null),
        start,
        lines,
      ).firstPass,
    ).toBeCloseTo(1 / 3);
  });
});
