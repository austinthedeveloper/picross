import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockCatalog } from '@picross/block/puzzles/catalog';
import { murals } from '@picross/grid/puzzles/murals';
import { puzzles } from '@picross/grid/puzzles/index';
import { DAILY_POINTS, puzzlePoints, ranks, TILE_POINTS } from '../puzzles/ranks';
import { blockPack, countPoints, rankProgress, rankUpNote } from './rank';

const sized = (id: string, size: number) => ({ id, width: size, height: size });

describe('countPoints', () => {
  it('scores each size', () => {
    expect([5, 10, 15, 20].map(puzzlePoints)).toEqual([1, 2, 3, 6]);
    const pack = [sized('a', 5), sized('b', 10), sized('c', 15), sized('d', 20)];
    expect(countPoints(pack, [], () => true, 0)).toBe(12);
  });

  it('counts only what is solved, plus tiles and dailies', () => {
    const pack = [sized('a', 15), sized('b', 20)];
    const tiles = [{ id: 't1' }, { id: 't2' }];
    const solved = new Set(['a', 't1', 'not-in-any-list']);
    expect(countPoints(pack, tiles, (id) => solved.has(id), 2)).toBe(
      3 + TILE_POINTS + 2 * DAILY_POINTS,
    );
  });

  it('leaves room below the top rank for the whole pack and murals', () => {
    const tiles = murals.flatMap((m) => m.tiles);
    const total = countPoints(puzzles, tiles, () => true, 0);
    expect(total).toBeGreaterThanOrEqual(1868);
    expect(total).toBeGreaterThan(ranks.at(-1)!.points);
  });
});

describe('rankProgress', () => {
  it('starts at the bottom', () => {
    expect(rankProgress(0)).toEqual({ rank: ranks[0], next: ranks[1], points: 0, fraction: 0 });
  });

  it('changes rank exactly on each threshold', () => {
    ranks.forEach((rank, i) => {
      expect(rankProgress(rank.points).rank).toBe(rank);
      if (i > 0) expect(rankProgress(rank.points - 1).rank).toBe(ranks[i - 1]);
    });
  });

  it('measures progress between ranks', () => {
    expect(rankProgress(20)).toMatchObject({ rank: { name: 'Tinkerer' }, fraction: 0.5 });
  });

  it('stays full at the top', () => {
    const top = ranks.at(-1)!;
    expect(rankProgress(top.points + 500)).toMatchObject({ rank: top, next: null, fraction: 1 });
  });

  it('has a ladder that only climbs and starts at zero', () => {
    expect(ranks[0].points).toBe(0);
    ranks.slice(1).forEach((r, i) => expect(r.points).toBeGreaterThan(ranks[i].points));
  });
});

describe('rankUpNote', () => {
  it('speaks up only when a solve crosses a threshold', () => {
    expect(rankUpNote(9, 12)).toBe('New rank: Tinkerer!');
    expect(rankUpNote(10, 13)).toBe('');
    expect(rankUpNote(12, 12)).toBe('');
  });
});

describe('both boards (#157)', () => {
  beforeEach(() => localStorage.clear());

  it("count Cubed's pack by each block's longest side, and diorama pieces like tiles", async () => {
    const [small] = blockPack.filter((p) => p.width <= 5);
    const [mid] = blockPack.filter((p) => p.width > 5);
    const solved = Object.fromEntries(
      [
        `block:${small.id}`,
        `block:${mid.id}`,
        `block:${blockCatalog.dioramaTiles[0]}`,
        'grid:heart',
      ].map((id) => [id, { solves: 1, bestTime: 9 }]),
    );
    localStorage.setItem('picross:v2', JSON.stringify({ solved, boards: {}, time: {} }));
    vi.resetModules();
    const { currentPoints } = await import('./rank');
    const heart = puzzles.find((p) => p.id === 'heart')!;
    expect(currentPoints()).toBe(
      puzzlePoints(heart.width) + puzzlePoints(small.width) + puzzlePoints(mid.width) + TILE_POINTS,
    );
  });

  it('leaves room below the top rank for both packs', () => {
    const tiles = murals.flatMap((m) => m.tiles);
    const blocks = blockCatalog.dioramaTiles.map((id) => ({ id }));
    const total =
      countPoints(puzzles, tiles, () => true, 0) + countPoints(blockPack, blocks, () => true, 0);
    expect(total).toBeGreaterThan(ranks.at(-1)!.points);
  });
});
