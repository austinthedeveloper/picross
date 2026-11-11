import { murals } from '@picross/grid/puzzles/murals';
import { puzzles } from '@picross/grid/puzzles/index';
import { blockCatalog } from '@picross/block/puzzles/catalog';
import { DAILY_POINTS, puzzlePoints, ranks, TILE_POINTS, type Rank } from '../puzzles/ranks';
import { dailySolves } from './daily';
import { progressFor } from './progress';

/**
 * Rank (#106) measures how much you've solved. It's worked out from existing
 * solves and never stored, so old saves have the right rank with no migration.
 * Time and mode don't count: slow, careful solving is the game. Both boards count (#157):
 * a block by its longest side, a diorama piece like a mural tile.
 */

interface Sized {
  id: string;
  width: number;
  height: number;
}

/** Points for what's solved. Each puzzle counts once, however often you solve it. */
export function countPoints(
  pack: readonly Sized[],
  tiles: readonly { id: string }[],
  isSolved: (id: string) => boolean,
  dailies: number,
): number {
  const solved = pack.filter((p) => isSolved(p.id));
  return (
    solved.reduce((sum, p) => sum + puzzlePoints(Math.max(p.width, p.height)), 0) +
    tiles.filter((t) => isSolved(t.id)).length * TILE_POINTS +
    dailies * DAILY_POINTS
  );
}

/** Cubed's pack, sized by each block's longest side, from the catalog (not the pack itself). */
export const blockPack: Sized[] = Object.entries(blockCatalog.puzzles).map(([id, side]) => ({
  id,
  width: side,
  height: side,
}));
const blockTiles = blockCatalog.dioramaTiles.map((id) => ({ id }));
const muralTiles = murals.flatMap((m) => m.tiles);

/**
 * The player's points right now, on both boards. Counts from the lists, since the save holds
 * other ids too.
 */
export function currentPoints(): number {
  const flat = progressFor('grid');
  const block = progressFor('block');
  return (
    countPoints(puzzles, muralTiles, (id) => Boolean(flat.getPuzzleStats(id)), dailySolves()) +
    countPoints(blockPack, blockTiles, (id) => Boolean(block.getPuzzleStats(id)), 0)
  );
}

export interface RankProgress {
  rank: Rank;
  /** Null at the top rank. */
  next: Rank | null;
  points: number;
  /** How far from this rank to the next, 0 to 1. Full at the top rank. */
  fraction: number;
}

export function rankProgress(points: number): RankProgress {
  const i = ranks.filter((r) => r.points <= points).length - 1;
  const rank = ranks[i];
  const next = ranks[i + 1] ?? null;
  const fraction = next ? (points - rank.points) / (next.points - rank.points) : 1;
  return { rank, next, points, fraction };
}

/** The line for the solved screen when a solve crossed into a new rank, else ''. */
export function rankUpNote(pointsBefore: number, pointsNow = currentPoints()): string {
  const { rank } = rankProgress(pointsNow);
  return rank.name === rankProgress(pointsBefore).rank.name ? '' : `New rank: ${rank.name}!`;
}
