import { Cell, createBoard, isSolved, type Board } from '../engine/board';
import { applyMove, History, type Change, type Move } from '../engine/history';
import type { Puzzle } from '../puzzles/format';
import type { SavedBoard } from './progress';

/** A puzzle being played: board state, undo history, and solved flag. */
export class Game {
  readonly board: Board;
  readonly history = new History();
  solved = false;

  constructor(
    readonly puzzle: Puzzle,
    saved?: SavedBoard,
  ) {
    this.board = createBoard(puzzle.width, puzzle.height);
    if (saved?.cells.length === this.board.cells.length) {
      [...saved.cells].forEach((ch, i) => {
        const cell = Number(ch);
        if (cell === Cell.Filled || cell === Cell.Marked) this.board.cells[i] = cell;
      });
      this.checkSolved();
    }
  }

  /** True when the player has made any marks worth saving. */
  get started(): boolean {
    return this.board.cells.some((c) => c !== Cell.Empty);
  }

  serialize(): SavedBoard {
    return { cells: this.board.cells.join('') };
  }

  /** Sets cells without recording history, for live drag previews. */
  preview(changes: Iterable<Change>): void {
    for (const { index, to } of changes) this.board.cells[index] = to;
  }

  /** Records a stroke already applied with `preview` as one undoable move. */
  commit(move: Move): void {
    this.history.push(move.filter((c) => c.from !== c.to));
    this.checkSolved();
  }

  undo(): void {
    if (this.history.undo(this.board)) this.checkSolved();
  }

  redo(): void {
    if (this.history.redo(this.board)) this.checkSolved();
  }

  /** Clears the board. Undoable. */
  reset(): void {
    const move: Move = [];
    this.board.cells.forEach((from, index) => {
      if (from !== Cell.Empty) move.push({ index, from, to: Cell.Empty });
    });
    applyMove(this.board, move);
    this.history.push(move);
    this.checkSolved();
  }

  private checkSolved(): void {
    this.solved = isSolved(this.board, this.puzzle.solution);
  }
}
