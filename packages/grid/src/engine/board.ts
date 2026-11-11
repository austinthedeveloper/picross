/** State of a single cell on the player's board. */
export const Cell = {
  Empty: 0,
  Filled: 1,
  Marked: 2,
} as const;
export type Cell = (typeof Cell)[keyof typeof Cell];

/** A rectangular grid of cells, stored row-major. */
export interface Grid<T> {
  readonly width: number;
  readonly height: number;
  readonly cells: T[];
}

export type Board = Grid<Cell>;
export type Solution = Grid<boolean>;

export function createBoard(width: number, height: number): Board {
  return { width, height, cells: new Array<Cell>(width * height).fill(Cell.Empty) };
}

export function index(grid: Grid<unknown>, row: number, col: number): number {
  return row * grid.width + col;
}

export function getCell<T>(grid: Grid<T>, row: number, col: number): T {
  return grid.cells[index(grid, row, col)];
}

export function row<T>(grid: Grid<T>, r: number): T[] {
  return grid.cells.slice(r * grid.width, (r + 1) * grid.width);
}

export function column<T>(grid: Grid<T>, c: number): T[] {
  const out: T[] = [];
  for (let r = 0; r < grid.height; r++) out.push(getCell(grid, r, c));
  return out;
}

/** True when every filled cell matches the solution. Marks are treated as empty. */
export function isSolved(board: Board, solution: Solution): boolean {
  return board.cells.every((cell, i) => (cell === Cell.Filled) === solution.cells[i]);
}

/** What a reveal (a hint or a blast) puts in a cell: filled if it's in the picture, else marked. */
export function revealedCell(solution: Solution, i: number): Cell {
  return solution.cells[i] ? Cell.Filled : Cell.Marked;
}
