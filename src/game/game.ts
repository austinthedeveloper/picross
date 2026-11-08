import { EMPTY, FILLED, nextStep, solve, UNKNOWN } from '../engine/solver';
import { lineIdAt, pointOf, type Axis, type Line } from '../engine/volume';
import { isFilled, type Puzzle } from '../puzzles/format';
import type { SavedBoard } from './progress';
import type { Mode } from './settings';

/**
 * How mistakes work. Relaxed never checks; hearts refuses a break into the shape, paints
 * the cube and costs one of three hearts; battle (story fights with Hits on) does the same
 * but has no hearts: the fight decides what a mistake costs.
 */
export type GameMode = Mode | 'battle';

/** A cube as the player sees it: still there, painted to keep it safe, or broken away. */
export const SOLID = 0;
export const PAINTED = 1;
export const BROKEN = 2;
export type Block = typeof SOLID | typeof PAINTED | typeof BROKEN;

export const MAX_HEARTS = 3;
export const MAX_HINTS = 3;

export interface Change {
  index: number;
  from: Block;
  to: Block;
}
/** One undoable action: a stroke, a hint, or a reset. */
export type Move = Change[];

export type Tool = 'break' | 'paint';

/** What happened to one cube in a stroke. */
export type Outcome = 'broke' | 'painted' | 'unpainted' | 'strike' | 'none';

/**
 * A stroke: one press, dragged across cubes. It keeps to the layer it started on, seen
 * from the face it started on, so breaking a cube never lets the stroke fall through to
 * the one behind it.
 */
interface Stroke {
  tool: Tool;
  /** Painting a painted cube starts an unpaint stroke, and the reverse. */
  paintTo: Block;
  axis: Axis;
  layer: number;
  /** The cube it started on. */
  start: number;
  move: Move;
}

/**
 * A puzzle in play. How mistakes work: relaxed never checks what you break (the clues
 * stop adding up, and undo puts it back); hearts refuses to break a cube of the shape,
 * paints it instead, and costs a heart. Breaking every cube that isn't the shape solves it.
 */
export class Game {
  readonly puzzle: Puzzle;
  readonly blocks: Uint8Array;
  mode: GameMode;
  hearts = MAX_HEARTS;
  hintsUsed = 0;
  /** Breaks into the shape this game refused (hearts and battle). */
  strikes = 0;
  /** Milliseconds played before this session's clock started. */
  elapsed = 0;
  private past: Move[] = [];
  private future: Move[] = [];
  private stroke: Stroke | null = null;

  constructor(puzzle: Puzzle, mode: GameMode, saved?: SavedBoard) {
    this.puzzle = puzzle;
    this.blocks = new Uint8Array(puzzle.solution.length);
    this.mode = mode === 'battle' ? mode : (saved?.mode ?? mode);
    if (saved && saved.blocks.length === this.blocks.length) {
      [...saved.blocks].forEach((ch, i) => (this.blocks[i] = Number(ch) as Block));
      this.elapsed = saved.elapsed ?? 0;
      this.hearts = saved.hearts ?? MAX_HEARTS;
      this.hintsUsed = saved.hintsUsed ?? 0;
    }
  }

  get solved(): boolean {
    return this.puzzle.solution.every((c, i) => c !== 0 || this.blocks[i] === BROKEN);
  }

  /** Out of hearts in hearts mode. */
  get failed(): boolean {
    return this.mode === 'hearts' && this.hearts <= 0;
  }

  get over(): boolean {
    return this.solved || this.failed;
  }

  get canUndo(): boolean {
    return this.past.length > 0 && !this.over;
  }

  get canRedo(): boolean {
    return this.future.length > 0 && !this.over;
  }

  get hintsLeft(): number {
    return MAX_HINTS - this.hintsUsed;
  }

  /** Cubes of the shape broken by mistake (only possible in relaxed). */
  get mistakes(): number[] {
    const out: number[] = [];
    this.blocks.forEach((b, i) => {
      if (b === BROKEN && isFilled(this.puzzle, i)) out.push(i);
    });
    return out;
  }

  save(): SavedBoard {
    return {
      blocks: this.blocks.join(''),
      elapsed: this.elapsed,
      ...(this.mode !== 'battle' ? { mode: this.mode } : {}),
      ...(this.mode === 'hearts' ? { hearts: this.hearts } : {}),
      ...(this.hintsUsed ? { hintsUsed: this.hintsUsed } : {}),
    };
  }

  /** Starts a stroke on `cell`, seen through a face facing along `axis`. */
  begin(tool: Tool, cell: number, axis: Axis): Outcome {
    if (this.over || this.blocks[cell] === BROKEN) return 'none';
    const paintTo = this.blocks[cell] === PAINTED ? SOLID : PAINTED;
    this.stroke = {
      tool,
      paintTo,
      axis,
      layer: pointOf(this.puzzle.dims, cell)[axis],
      start: cell,
      move: [],
    };
    return this.extend(cell);
  }

  /** Carries the stroke onto another cube, if it's on the stroke's layer. */
  extend(cell: number): Outcome {
    const s = this.stroke;
    if (!s || this.over) return 'none';
    if (pointOf(this.puzzle.dims, cell)[s.axis] !== s.layer) return 'none';
    return this.extendAny(cell);
  }

  /** Applies the stroke's tool to a cube, wherever it is. */
  private extendAny(cell: number): Outcome {
    const s = this.stroke;
    if (!s || this.over) return 'none';
    if (s.move.some((c) => c.index === cell)) return 'none';
    const from = this.blocks[cell] as Block;
    if (s.tool === 'paint') {
      if (from === BROKEN || from === s.paintTo) return 'none';
      this.set(cell, s.paintTo);
      return s.paintTo === PAINTED ? 'painted' : 'unpainted';
    }
    if (from !== SOLID) return 'none';
    if (this.mode !== 'relaxed' && isFilled(this.puzzle, cell)) {
      // Not undoable: the paint stays as the mark of the mistake.
      this.blocks[cell] = PAINTED;
      if (this.mode === 'hearts') this.hearts--;
      this.strikes++;
      this.end();
      return 'strike';
    }
    this.set(cell, BROKEN);
    return 'broke';
  }

  /**
   * Carries the stroke straight through the block: the whole line its first cube's face
   * looks along (a hold). A 0 clue breaks in one go; a full one paints in one go. Hearts
   * mode still stops at the first cube of the shape.
   */
  extendLine(): Outcome[] {
    const s = this.stroke;
    if (!s || this.over) return [];
    const { dims } = this.puzzle;
    const line = this.puzzle.lines[lineIdAt(dims, s.axis, pointOf(dims, s.start))];
    const outcomes: Outcome[] = [];
    // Outward from the cube you're holding, so a strike stops nearest you.
    const at = line.cells.indexOf(s.start);
    const order = line.cells
      .map((c, t) => ({ c, d: Math.abs(t - at) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.c);
    for (const cell of order) {
      if (!this.stroke) break;
      if (s.move.some((c) => c.index === cell)) continue;
      const outcome = this.extendAny(cell);
      if (outcome !== 'none') outcomes.push(outcome);
    }
    return outcomes;
  }

  end(): void {
    if (this.stroke?.move.length) {
      this.past.push(this.stroke.move);
      this.future = [];
    }
    this.stroke = null;
  }

  private set(cell: number, to: Block): void {
    this.stroke!.move.push({ index: cell, from: this.blocks[cell] as Block, to });
    this.blocks[cell] = to;
  }

  undo(): Move | null {
    if (!this.canUndo) return null;
    const move = this.past.pop()!;
    for (const { index, from } of move) this.blocks[index] = from;
    this.future.push(move);
    return move;
  }

  redo(): Move | null {
    if (!this.canRedo) return null;
    const move = this.future.pop()!;
    for (const { index, to } of move) this.blocks[index] = to;
    this.past.push(move);
    return move;
  }

  /** Puts every cube back. Undoable. */
  reset(): void {
    const move: Move = [];
    this.blocks.forEach((b, i) => {
      if (b !== SOLID) move.push({ index: i, from: b as Block, to: SOLID });
    });
    for (const { index } of move) this.blocks[index] = SOLID;
    if (move.length) {
      this.past.push(move);
      this.future = [];
    }
  }

  /** Starts over after running out of hearts. */
  retry(): void {
    this.blocks.fill(SOLID);
    this.hearts = MAX_HEARTS;
    this.hintsUsed = 0;
    this.elapsed = 0;
    this.past = [];
    this.future = [];
  }

  /**
   * Uses a hint: finds the line that proves the most from what's correctly on the board,
   * and breaks and paints what it proves. Returns that line (or null) and the move.
   */
  hint(): { line: Line | null; move: Move } | null {
    if (this.hintsLeft <= 0 || this.over) return null;
    const move: Move = [];
    let line: Line | null = null;
    const known = new Uint8Array(this.blocks.length);
    this.blocks.forEach((b, i) => {
      const filled = isFilled(this.puzzle, i);
      if (b === BROKEN && !filled) known[i] = EMPTY;
      else if (b === PAINTED && filled) known[i] = FILLED;
    });
    const { puzzle } = this;
    const step = nextStep(puzzle.dims, puzzle.clues, known, puzzle.lines);
    if (step) {
      line = step.line;
      for (const i of step.empty) {
        if (this.blocks[i] !== BROKEN)
          move.push({ index: i, from: this.blocks[i] as Block, to: BROKEN });
      }
      for (const i of step.filled) {
        if (this.blocks[i] !== PAINTED) {
          move.push({ index: i, from: this.blocks[i] as Block, to: PAINTED });
        }
      }
    } else {
      // Wrongly painted cubes can hide every step; fall back to the answer for one cube.
      const solved = solve(puzzle.dims, puzzle.clues, undefined, puzzle.lines).known;
      const i = this.blocks.findIndex((b, c) => b === SOLID && solved[c] !== UNKNOWN);
      if (i < 0) return null;
      move.push({ index: i, from: SOLID, to: isFilled(puzzle, i) ? PAINTED : BROKEN });
    }
    if (!move.length) return null;
    for (const { index, to } of move) this.blocks[index] = to;
    this.past.push(move);
    this.future = [];
    this.hintsUsed++;
    return { line, move };
  }

  /**
   * Uses a hint to check for mistakes: puts back (painted) every cube of the shape that
   * was broken. Returns those cubes, or null if no hint could be used.
   */
  check(): number[] | null {
    if (this.hintsLeft <= 0 || this.over) return null;
    const wrong = this.mistakes;
    this.hintsUsed++;
    if (wrong.length) {
      const move: Move = wrong.map((index) => ({ index, from: BROKEN, to: PAINTED }));
      for (const { index } of move) this.blocks[index] = PAINTED;
      this.past.push(move);
      this.future = [];
    }
    return wrong;
  }
}
