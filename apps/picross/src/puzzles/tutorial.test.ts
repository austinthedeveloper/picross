import { describe, expect, it } from 'vitest';
import { Cell, createBoard, isSolved } from '../engine/board';
import { solve, solveLine, Unknown, type Knowledge } from '../engine/solver';
import {
  currentStep,
  moveProblem,
  toolNeeded,
  tutorialPuzzle as puzzle,
  tutorialSteps as steps,
} from './tutorial';

const { width: w, height: h, clues } = puzzle;

describe('tutorial', () => {
  it('is a puzzle with one solution', () => {
    expect(solve(w, h, clues).status).toBe('unique');
  });

  it('asks only for moves that match the picture', () => {
    for (const step of steps) {
      for (const i of step.fill) expect(puzzle.solution.cells[i]).toBe(true);
      for (const i of step.mark) expect(puzzle.solution.cells[i]).toBe(false);
    }
  });

  it('teaches each step from its own lines and what came before', () => {
    const grid: Knowledge[] = new Array<Knowledge>(w * h).fill(Unknown);
    for (const step of steps) {
      for (const { kind, index } of step.lines) {
        const at = (k: number) => (kind === 'row' ? index * w + k : k * w + index);
        const length = kind === 'row' ? w : h;
        const line = Array.from({ length }, (_, k) => grid[at(k)]);
        const solved = solveLine(line, (kind === 'row' ? clues.rows : clues.cols)[index]);
        solved!.forEach((v, k) => (grid[at(k)] = v));
      }
      for (const i of step.fill) expect(grid[i], step.title).toBe(1);
      for (const i of step.mark) expect(grid[i], step.title).toBe(0);
    }
  });

  it('solves the picture when the last step is done', () => {
    const board = createBoard(w, h);
    steps.forEach((step, n) => {
      expect(currentStep(board)).toBe(n);
      expect(isSolved(board, puzzle.solution)).toBe(false);
      for (const i of step.fill) board.cells[i] = Cell.Filled;
      for (const i of step.mark) board.cells[i] = Cell.Marked;
    });
    expect(currentStep(board)).toBe(steps.length);
    expect(isSolved(board, puzzle.solution)).toBe(true);
  });

  it('goes back a step when a finished step is erased', () => {
    const board = createBoard(w, h);
    for (const i of steps[0].fill) board.cells[i] = Cell.Filled;
    expect(currentStep(board)).toBe(1);
    board.cells[steps[0].fill[0]] = Cell.Empty;
    expect(currentStep(board)).toBe(0);
  });

  it('asks for fills before marks within a step', () => {
    const board = createBoard(w, h);
    const mixed = steps.find((s) => s.fill.length && s.mark.length)!;
    expect(toolNeeded(board, mixed)).toBe(Cell.Filled);
    for (const i of mixed.fill) board.cells[i] = Cell.Filled;
    expect(toolNeeded(board, mixed)).toBe(Cell.Marked);
  });

  it('turns away moves that contradict the picture, and allows erasing', () => {
    const empty = puzzle.solution.cells.indexOf(false);
    const filled = puzzle.solution.cells.indexOf(true);
    const change = (index: number, to: Cell) => ({ index, from: Cell.Empty, to });
    expect(moveProblem(change(empty, Cell.Filled))).toBe('stays-empty');
    expect(moveProblem(change(filled, Cell.Marked))).toBe('gets-filled');
    expect(moveProblem(change(filled, Cell.Filled))).toBeNull();
    expect(moveProblem(change(empty, Cell.Marked))).toBeNull();
    expect(moveProblem(change(filled, Cell.Empty))).toBeNull();
  });
});
