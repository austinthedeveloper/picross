import { debug } from '../debug/hooks';
import { Cell, createBoard, isSolved, revealedCell, type Board } from '../engine/board';
import { applyMove, History, type Change, type Move } from '../engine/history';
import { transformGrid, turnIndex } from '../engine/transform';
import type { Puzzle } from '../puzzles/format';

/** Relaxed never checks fills; hearts mode costs a heart for each wrong fill. */
export type Mode = 'relaxed' | 'hearts';

/**
 * How mistakes work: relaxed never checks fills; hearts checks them and fails
 * after three; battle checks them and reports each one (the fight decides the
 * cost), but never fails on its own.
 */
export type GameMode = Mode | 'battle';

export const MAX_HEARTS = 3;
export const MAX_HINTS = 3;

export type HintTarget = 'cell' | 'row' | 'col';

/**
 * An in-progress board. `cells` holds one digit per cell (see `Cell`). Free play saves
 * it in the app's progress, and a run with its encounter.
 */
export interface SavedBoard {
  cells: string;
  /** Milliseconds played so far. */
  elapsed?: number;
  mode?: GameMode;
  hearts?: number;
  hintsUsed?: number;
}

export interface PreviewResult {
  /** Changes actually made, which may differ from those requested. */
  applied: Change[];
  /** A wrong fill in hearts or battle mode; the stroke should end here. */
  mistake: Change | null;
}

/** A puzzle being played: board state, undo history, mode, and clock. */
export class Game {
  readonly board: Board;
  history = new History();
  readonly mode: GameMode;
  hearts = MAX_HEARTS;
  hintsUsed = 0;
  solved = false;
  /** Milliseconds spent on this puzzle, excluding time after it ended. */
  elapsed = 0;

  constructor(
    /** Replaced only when the board turns mid-fight (#83). */
    public puzzle: Puzzle,
    saved?: SavedBoard,
    mode: GameMode = 'relaxed',
  ) {
    this.board = createBoard(puzzle.width, puzzle.height);
    this.mode = saved?.mode ?? mode;
    this.elapsed = saved?.elapsed ?? 0;
    this.hearts = saved?.hearts ?? MAX_HEARTS;
    this.hintsUsed = saved?.hintsUsed ?? 0;
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
      ...(this.hintsUsed ? { hintsUsed: this.hintsUsed } : {}),
    };
  }

  tick(ms: number): void {
    if (!this.over) this.elapsed += ms;
  }

  /**
   * Sets cells without recording history, for live drag previews. In hearts
   * and battle modes a wrong fill is marked instead and reported as a mistake;
   * in hearts mode it also costs a heart.
   */
  preview(changes: Iterable<Change>): PreviewResult {
    const applied: Change[] = [];
    for (const change of changes) {
      if (
        this.mode !== 'relaxed' &&
        change.to === Cell.Filled &&
        !this.puzzle.solution.cells[change.index]
      ) {
        const mistake = { ...change, to: Cell.Marked };
        this.board.cells[change.index] = Cell.Marked;
        const spared = import.meta.env.VITE_DEBUG === '1' && debug.infiniteHealth();
        if (this.mode === 'hearts' && !spared) this.hearts--;
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

  get hintsLeft(): number {
    return MAX_HINTS - this.hintsUsed;
  }

  /**
   * Reveals the cell, row, or column at (r, c): filled cells are filled and
   * empty cells are marked. Costs one hint if anything changed. Returns the
   * revealed changes (undoable as one move).
   */
  hint(target: HintTarget, r: number, c: number): Change[] {
    if (this.hintsLeft <= 0 || this.over) return [];
    const { width, height } = this.board;
    const indexes =
      target === 'cell'
        ? [r * width + c]
        : target === 'row'
          ? Array.from({ length: width }, (_, cc) => r * width + cc)
          : Array.from({ length: height }, (_, rr) => rr * width + c);
    const move = this.reveal(indexes);
    if (move.length) this.hintsUsed++;
    return move;
  }

  /**
   * Shows the truth in these cells without spending a hint (a bomb's blast, #115):
   * filled cells are filled and empty cells are marked. It can't count as a
   * mistake. Returns the changes (undoable as one move).
   */
  reveal(indexes: readonly number[]): Change[] {
    if (this.over) return [];
    const move: Move = [];
    for (const index of indexes) {
      const from = this.board.cells[index];
      const to = revealedCell(this.puzzle.solution, index);
      if (from !== to) move.push({ index, from, to });
    }
    if (!move.length) return [];
    applyMove(this.board, move);
    this.history.push(move);
    this.checkSolved();
    return move;
  }

  /**
   * Clears cells the Mimic ate (#48). It isn't a move you can undo, and older
   * moves would bring the marks back, so the undo history starts over.
   */
  wipe(indexes: readonly number[]): void {
    for (const i of indexes) this.board.cells[i] = Cell.Empty;
    this.history = new History();
    this.checkSolved();
  }

  /**
   * Turns a square board a quarter clockwise onto `puzzle`, the same picture turned
   * (#83). Your marks turn with it, and so does the undo history, so undo and redo
   * keep working on the cells you actually changed.
   */
  turn(puzzle: Puzzle): void {
    const n = this.board.width;
    const turned = transformGrid(this.board, 1);
    turned.cells.forEach((cell, i) => (this.board.cells[i] = cell));
    this.history.remap((i) => turnIndex(i, n));
    this.puzzle = puzzle;
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
