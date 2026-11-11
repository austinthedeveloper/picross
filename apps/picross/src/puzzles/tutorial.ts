import { Cell, type Board } from '@picross/grid/engine/board';
import type { Change } from '@picross/grid/engine/history';
import type { Line } from '@picross/grid/engine/lines';
import { parsePuzzle } from '@picross/grid/puzzles/format';

/** The How to play picture. It isn't in the pack, so solving it records nothing. */
export const tutorialPuzzle = parsePuzzle({
  id: 'tutorial',
  name: 'Little House',
  width: 5,
  height: 5,
  solution: ['..#..', '.###.', '#####', '.#.#.', '.#.#.'],
});

const at = (r: number, c: number) => r * tutorialPuzzle.width + c;
const row = (index: number): Line => ({ kind: 'row', index });
const col = (index: number): Line => ({ kind: 'col', index });

export interface TutorialStep {
  title: string;
  text: string;
  /** The lines this step reasons from; they're highlighted on the board. */
  lines: Line[];
  /** Cells to fill and cells to cross off before the step is done. */
  fill: number[];
  mark: number[];
}

/**
 * One line of reasoning per step. The tests check each step's cells really do
 * follow from its lines, given only the steps before it.
 */
export const tutorialSteps: TutorialStep[] = [
  {
    title: 'Clues count cells',
    text: 'The numbers beside each line are runs of filled cells. Row 3 says 5, and the row is only 5 wide, so all of it is filled. Drag across it or tap each cell.',
    lines: [row(2)],
    fill: [at(2, 0), at(2, 1), at(2, 2), at(2, 3), at(2, 4)],
    mark: [],
  },
  {
    title: 'Find the overlap',
    text: 'Columns 2 and 4 each say 4. In 5 cells, a run of 4 starts at the top or one lower. Either way it covers the middle three, so fill those.',
    lines: [col(1), col(3)],
    fill: [at(1, 1), at(3, 1), at(1, 3), at(3, 3)],
    mark: [],
  },
  {
    title: 'Close the gap',
    text: 'Row 2 says 3, which is one run. Two of its cells are filled with a gap between them, so the gap is filled too.',
    lines: [row(1)],
    fill: [at(1, 2)],
    mark: [],
  },
  {
    title: 'Cross off what’s empty',
    text: 'Row 2’s clue has gone dim: it’s satisfied, so its other cells are empty. Switch to ✕ Mark and cross them off.',
    lines: [row(1)],
    fill: [],
    mark: [at(1, 0), at(1, 4)],
  },
  {
    title: 'Same again',
    text: 'Row 4 says 1 1, and you already have both. Cross off its other three cells.',
    lines: [row(3)],
    fill: [],
    mark: [at(3, 0), at(3, 2), at(3, 4)],
  },
  {
    title: 'Marks are clues too',
    text: 'Column 3 says 3. Row 4 is crossed off, so the run can’t go down. It has to reach row 1: fill that cell, then cross off the bottom one.',
    lines: [col(2)],
    fill: [at(0, 2)],
    mark: [at(4, 2)],
  },
  {
    title: 'Your turn',
    text: 'Row 1 says 1, and you’ve placed it. So columns 2 and 4 can’t reach the top, and their runs end at the bottom instead. Finish the picture.',
    lines: [row(0), col(1), col(3)],
    fill: [at(4, 1), at(4, 3)],
    mark: [],
  },
];

const stepDone = (board: Board, step: TutorialStep) =>
  step.fill.every((i) => board.cells[i] === Cell.Filled) &&
  step.mark.every((i) => board.cells[i] === Cell.Marked);

/** The first step not done yet, or `tutorialSteps.length` once they all are. */
export function currentStep(board: Board): number {
  const next = tutorialSteps.findIndex((step) => !stepDone(board, step));
  return next < 0 ? tutorialSteps.length : next;
}

/** Which tool the step needs next: fills come first, then marks. */
export function toolNeeded(board: Board, step: TutorialStep): Cell {
  return step.fill.some((i) => board.cells[i] !== Cell.Filled) ? Cell.Filled : Cell.Marked;
}

/**
 * Why a move contradicts the picture, if it does. The tutorial turns these away
 * with a nudge, instead of letting a beginner build on a mistake.
 */
export function moveProblem(change: Change): 'stays-empty' | 'gets-filled' | null {
  const filled = tutorialPuzzle.solution.cells[change.index];
  if (change.to === Cell.Filled && !filled) return 'stays-empty';
  if (change.to === Cell.Marked && filled) return 'gets-filled';
  return null;
}
