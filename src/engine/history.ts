import type { Board, Cell } from './board';

export interface Change {
  index: number;
  from: Cell;
  to: Cell;
}

/** One undoable action, such as a drag stroke or a reset. */
export type Move = Change[];

export function applyMove(board: Board, move: Move): void {
  for (const { index, to } of move) board.cells[index] = to;
}

export function revertMove(board: Board, move: Move): void {
  for (const { index, from } of move) board.cells[index] = from;
}

export class History {
  private past: Move[] = [];
  private future: Move[] = [];

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Records a move that has already been applied to the board. */
  push(move: Move): void {
    if (move.length === 0) return;
    this.past.push(move);
    this.future = [];
  }

  undo(board: Board): boolean {
    const move = this.past.pop();
    if (!move) return false;
    revertMove(board, move);
    this.future.push(move);
    return true;
  }

  redo(board: Board): boolean {
    const move = this.future.pop();
    if (!move) return false;
    applyMove(board, move);
    this.past.push(move);
    return true;
  }
}
