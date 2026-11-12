// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toPuzzleFile } from '@picross/grid/puzzles/format';
import { decodeShare, encodeShare } from './share';

describe('a grid share code (#159)', () => {
  it('reads back the same picture, in its own id space', async () => {
    const cells = [true, false, true, false, true, false];
    const code = await encodeShare(toPuzzleFile('zig', 'Zig', 3, 2, cells));
    const puzzle = await decodeShare(code);
    expect(puzzle.id).toBe('shared-zig');
    expect(puzzle.name).toBe('Zig');
    expect([puzzle.width, puzzle.height]).toEqual([3, 2]);
    expect(puzzle.solution.cells).toEqual(cells);
  });

  it('refuses a code that is not a puzzle', async () => {
    await expect(decodeShare('jbm90LWE')).rejects.toThrow();
  });
});
