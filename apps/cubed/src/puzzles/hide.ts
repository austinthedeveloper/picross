import { shuffled } from '@picross/shared/engine/random';
import { solve } from '../engine/solver';
import type { Clue } from '../engine/clues';
import type { Puzzle } from './format';

/** A stable number from a string, to seed each puzzle's own shuffle. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Picks clues to hide: goes through the lines in a shuffled order and hides each one if
 * the puzzle can still be solved without guessing, until `ratio` of them are hidden.
 * Returns null when the shape can't be solved even with every clue shown.
 */
export function chooseHidden(puzzle: Puzzle, ratio: number, seed = hashString(puzzle.id)) {
  const clues: (Clue | null)[] = [...puzzle.allClues];
  if (!solve(puzzle.dims, clues, undefined, puzzle.lines).solved) return null;
  const target = Math.floor(clues.length * ratio);
  let hiddenCount = 0;
  for (const id of shuffled(
    puzzle.lines.map((l) => l.id),
    seed,
  )) {
    if (hiddenCount >= target) break;
    clues[id] = null;
    if (solve(puzzle.dims, clues, undefined, puzzle.lines).solved) hiddenCount++;
    else clues[id] = puzzle.allClues[id];
  }
  return clues.map((c) => c === null);
}
