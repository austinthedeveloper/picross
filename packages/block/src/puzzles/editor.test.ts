// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkPuzzle } from './check';
import type { PuzzleFile } from './format';
import { decodeShare, encodeShare } from './share';

const steps: PuzzleFile = {
  id: 'steps',
  name: 'Steps',
  colors: { s: 'stone' },
  layers: [
    ['sss', 'sss', 'sss'],
    ['sss', 'sss', '...'],
    ['sss', '...', '...'],
  ],
};

describe('checkPuzzle', () => {
  it('passes a solvable shape and hides clues', () => {
    const result = checkPuzzle(steps, 0.4);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.shown).toBeLessThan(result.lines);
  });

  it('names the cubes line logic cannot work out', () => {
    // Four cubes, one in every line of a 2×2×2 block: the other four fit every clue too.
    const result = checkPuzzle(
      {
        id: 'x',
        name: 'X',
        colors: { r: 'red' },
        layers: [
          ['r.', '.r'],
          ['.r', 'r.'],
        ],
      },
      0,
    );
    expect(result).toMatchObject({ ok: false, unknown: [0, 1, 2, 3, 4, 5, 6, 7] });
  });

  it('reports a malformed shape', () => {
    const result = checkPuzzle({ ...steps, layers: [['...']] }, 0.5);
    expect(result).toMatchObject({ ok: false, error: 'no cubes in the shape' });
  });
});

describe('share codes', () => {
  it('round-trip a puzzle', async () => {
    const code = await encodeShare(steps);
    expect(code).toMatch(/^[zj][\w-]+$/);
    const puzzle = await decodeShare(code);
    expect(puzzle.name).toBe('Steps');
    expect(puzzle.id).toBe('shared-steps');
    expect(puzzle.dims).toEqual({ x: 3, y: 3, z: 3 });
  });

  it('refuse a broken code', async () => {
    await expect(decodeShare('jbm90LWpzb24')).rejects.toThrow();
  });
});
