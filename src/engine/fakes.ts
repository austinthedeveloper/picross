import type { Clues } from './clues';
import { lineKey, type LineSet } from './lines';

const fits = (clue: number[], length: number) =>
  clue.reduce((sum, run) => sum + run, 0) + Math.max(0, clue.length - 1) <= length;

/**
 * A convincing wrong clue for a line (the Forger, #64): it still fits the line,
 * so it can't be ruled out at a glance, but it isn't the real one. Tries, in
 * order: merging two neighboring runs, splitting a long run, lengthening a run,
 * then shortening one. Deterministic, so a fight plays the same way every time.
 */
export function fakeClue(clue: readonly number[], length: number): number[] {
  const swapAt = (i: number, ...runs: number[]) => [
    ...clue.slice(0, i),
    ...runs,
    ...clue.slice(i + 1),
  ];
  const candidates: number[][] = [];
  for (let i = 0; i + 1 < clue.length; i++) {
    candidates.push([...clue.slice(0, i), clue[i] + clue[i + 1] + 1, ...clue.slice(i + 2)]);
  }
  clue.forEach((run, i) => run >= 3 && candidates.push(swapAt(i, run - 2, 1)));
  clue.forEach((run, i) => candidates.push(swapAt(i, run + 1)));
  clue.forEach((run, i) => run >= 2 && candidates.push(swapAt(i, run - 1)));
  if (!clue.length) candidates.push([1]);
  if (clue.length === 1 && clue[0] === 1) candidates.push([]);
  const fake = candidates.find((c) => fits(c, length) && c.join() !== clue.join());
  if (!fake) throw new Error(`No fake fits a line of ${length} with clue ${clue.join(' ')}`);
  return fake;
}

/** The fake clue shown for each faked line, keyed by line ("r3", "c0"). */
export function fakeClues(width: number, height: number, clues: Clues, fakes: LineSet) {
  const shown = new Map<string, number[]>();
  for (const r of fakes.rows) shown.set(lineKey('row', r), fakeClue(clues.rows[r], width));
  for (const c of fakes.cols) shown.set(lineKey('col', c), fakeClue(clues.cols[c], height));
  return shown;
}
