import { Cell, createBoard, isSolved, type Board } from '../engine/board';
import { applyMove, History, type Change, type Move } from '../engine/history';
import type { Puzzle } from '../puzzles/format';
import type { SavedBoard } from './progress';
import type { Mode } from './settings';

export const MAX_HEARTS = 3;

export interface PreviewResult {
  /** Changes actually made, which may differ from those requested. */
  applied: Change[];
  /** A wrong fill in hearts mode; the stroke should end here. */
  mistake: Change | null;
}

/** A puzzle being played: board state, undo history, mode, and clock. */
export class Game {
  readonly board: Board;
  history = new History();
  readonly mode: Mode;
  hearts = MAX_HEARTS;
  solved = false;
  /** Milliseconds spent on this puzzle, excluding time after it ended. */
  elapsed = 0;

  constructor(
    readonly puzzle: Puzzle,
    saved?: SavedBoard,
    mode: Mode = 'relaxed',
  ) {
    this.board = createBoard(puzzle.width, puzzle.height);
    this.mode = saved?.mode ?? mode;
    this.elapsed = saved?.elapsed ?? 0;
    this.hearts = saved?.hearts ?? MAX_HEARTS;
    if (saved?.cells.length === this.board.cells.length) {
      [...saved.cells].forEach((ch, i) => {
        const cell = Number(ch);
        if (cell === Cell.Filled || cell === Cell.Marked) this.board.cells[i] = cell;
      });
      this.checkSolved();
    }
  }

  /** Out of hearts in hearts mode. */
  get failed(): boolean {
    return this.mode === 'hearts' && this.hearts <= 0;
  }

  get over(): boolean {
    return this.solved || this.failed;
  }

  /** True when the player has made any marks worth saving. */
  get started(): boolean {
    return this.board.cells.some((c) => c !== Cell.Empty);
  }

  serialize(): SavedBoard {
    return {
      cells: this.board.cells.join(''),
      elapsed: Math.round(this.elapsed),
      mode: this.mode,
      ...(this.mode === 'hearts' ? { hearts: this.hearts } : {}),
    };
  }

  tick(ms: number): void {
    if (!this.over) this.elapsed += ms;
  }

  /**
   * Sets cells without recording history, for live drag previews. In hearts
   * mode a wrong fill costs a heart and is marked instead.
   */
  preview(changes: Iterable<Change>): PreviewResult {
    const applied: Change[] = [];
    for (const change of changes) {
      if (
        this.mode === 'hearts' &&
        change.to === Cell.Filled &&
        !this.puzzle.solution.cells[change.index]
      ) {
        const mistake = { ...change, to: Cell.Marked };
        this.board.cells[change.index] = Cell.Marked;
        this.hearts--;
        applied.push(mistake);
        return { applied, mistake };
      }
      this.board.cells[change.index] = change.to;
      applied.push(change);
    }
    return { applied, mistake: null };
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

  /** Starts over after running out of hearts. */
  retry(): void {
    this.board.cells.fill(Cell.Empty);
    this.history = new History();
    this.hearts = MAX_HEARTS;
    this.solved = false;
  }

  private checkSolved(): void {
    this.solved = isSolved(this.board, this.puzzle.solution);
  }
}
