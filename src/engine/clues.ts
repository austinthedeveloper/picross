import { Cell, column, row, type Solution } from './board';

/** Lengths of consecutive runs of `true`. An empty line has no runs. */
export function lineClues(line: readonly boolean[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) {
      run++;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);
  return runs;
}

export interface Clues {
  rows: number[][];
  cols: number[][];
}

export function deriveClues(solution: Solution): Clues {
  const rows: number[][] = [];
  const cols: number[][] = [];
  for (let r = 0; r < solution.height; r++) rows.push(lineClues(row(solution, r)));
  for (let c = 0; c < solution.width; c++) cols.push(lineClues(column(solution, c)));
  return { rows, cols };
}

interface Run {
  start: number;
  length: number;
}

function filledRuns(line: readonly Cell[]): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== Cell.Filled) continue;
    const start = i;
    while (i < line.length && line[i] === Cell.Filled) i++;
    runs.push({ start, length: i - start });
  }
  return runs;
}

/**
 * Which clue numbers are satisfied by the player's line, for dimming.
 *
 * A clue is satisfied when the whole line's runs match the clues exactly, or
 * when its run is locked in from one end: every cell between the edge and the
 * run is decided (filled or marked) and the run is closed off by a mark or the
 * edge, so it can no longer grow or shift.
 */
export function satisfiedClues(line: readonly Cell[], clues: readonly number[]): boolean[] {
  const runs = filledRuns(line);
  const done = clues.map(() => false);
  if (runs.length === clues.length && runs.every((run, i) => run.length === clues[i])) {
    return done.fill(true);
  }

  const closed = (i: number) => i < 0 || i >= line.length || line[i] === Cell.Marked;

  // From the left.
  let ci = 0;
  for (const run of runs) {
    if (ci >= clues.length) break;
    if (line.slice(0, run.start).includes(Cell.Empty)) break;
    if (!closed(run.start + run.length) || run.length !== clues[ci]) break;
    done[ci++] = true;
  }

  // From the right.
  ci = clues.length - 1;
  for (let ri = runs.length - 1; ri >= 0 && ci >= 0; ri--) {
    const run = runs[ri];
    const end = run.start + run.length;
    if (line.slice(end).includes(Cell.Empty)) break;
    if (!closed(run.start - 1) || run.length !== clues[ci]) break;
    done[ci--] = true;
  }

  return done;
}
