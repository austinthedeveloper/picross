import type { BoardTurn, FightBoard, Hidden } from '@picross/story/fight/board';
import { blastSize, pickBlast, type Blast } from '../engine/blast';
import { Cell, column, createBoard, revealedCell, row, type Board } from '../engine/board';
import { pickLiveLine } from '../engine/charge';
import { satisfiedClues } from '../engine/clues';
import { fakeClue } from '../engine/fakes';
import { pickInk } from '../engine/ink';
import type { Line, LineSet } from '../engine/lines';
import { solve } from '../engine/solver';
import { pickSwap, type Swap } from '../engine/swap';
import { turnIndex, turnLine } from '../engine/transform';
import type { Puzzle } from '../puzzles/format';

/**
 * A flat grid as a fight sees it (#164): the story's `FightBoard` over a 2D puzzle and the
 * board in play, wrapping the 2D fight helpers in `engine/` (`pickLiveLine`, `pickInk`,
 * `pickSwap`, `pickBlast`, `fakeClue`, `solve`, `turnLine` and `turnIndex`). The 2D
 * fight step (`gridStep`, in the app's `game/fight.ts`) makes its picks through it.
 *
 * A line's id is its row (0 to height − 1), then its column (height + c): `lineId` and
 * `lineAt` convert. Every pick here is deterministic, as the 2D game's always were (the
 * bomb's spot aside), so they never draw from the generator they're given.
 */

/** What the board needs of a game: its cells, and the game's own wipe and reveal if it has them. */
export interface GridFightGame {
  readonly board: Board;
  /** `Game.wipe`, which also starts the undo history over. */
  wipe?(cells: readonly number[]): void;
  /** `Game.reveal`, which makes the reveal one undoable move. */
  reveal?(cells: readonly number[]): unknown;
}

/** Share of a board's lines you finish before a charge first goes live. */
export const WARM_UP_SHARE = 0.25;

/**
 * How many lines the charge waits for before it first goes live: a quarter of the
 * board, so the opening is yours and the first live line is one you've started on.
 */
export function warmUpLines(width: number, height: number): number {
  return Math.max(1, Math.round((width + height) * WARM_UP_SHARE));
}

/** A row's or column's id on a board `height` rows tall: rows first, then columns. */
export const lineId = (height: number, line: Line) =>
  line.kind === 'row' ? line.index : height + line.index;

/** The row or column with this id on a board `height` rows tall. */
export const lineAt = (height: number, id: number): Line =>
  id < height ? { kind: 'row', index: id } : { kind: 'col', index: id - height };

/** Line ids as rows and columns. */
export function lineSetOf(height: number, ids: Iterable<number>): LineSet {
  const set: LineSet = { rows: [], cols: [] };
  for (const id of new Set(ids)) {
    const { kind, index } = lineAt(height, id);
    (kind === 'row' ? set.rows : set.cols).push(index);
  }
  return set;
}

/** A quarter turn clockwise of an n×n board, by line id and cell (#83). */
export function gridTurn(n: number): BoardTurn {
  return {
    line: (id) => lineId(n, turnLine(lineAt(n, id), n)),
    cell: (index) => turnIndex(index, n),
  };
}

/** The Mimic's swap as `pickSwap` gives it, from the board's pick (two rows or two columns). */
export function swapOf(height: number, pick: { lines: number[]; cells: number[] }): Swap {
  const [a, b] = pick.lines.map((id) => lineAt(height, id));
  return { kind: a.kind, lines: [a.index, b.index], cells: pick.cells };
}

/**
 * A bomb's blast as `pickBlast` gives it, from the cells the board picked: a square, row by
 * row, so its first cell is the top left and its center is half way across.
 */
export function blastOf(width: number, cells: number[]): Blast {
  const s = Math.round(Math.sqrt(cells.length));
  const middle = Math.floor(s / 2);
  return {
    cells,
    row: Math.floor(cells[0] / width) + middle,
    col: (cells[0] % width) + middle,
  };
}

/**
 * The fight's view of a 2D board: `puzzle` as the board stands (turned, if it has turned),
 * and the game in play. Without a game, a blank board.
 */
export function gridFightBoard(
  puzzle: Puzzle,
  game: GridFightGame = { board: createBoard(puzzle.width, puzzle.height) },
): FightBoard<number[]> {
  const { width: w, height: h, solution, clues } = puzzle;
  const { board } = game;
  const lines = [
    ...Array.from({ length: h }, (_, r) => ({
      id: r,
      cells: Array.from({ length: w }, (_, c) => r * w + c),
    })),
    ...Array.from({ length: w }, (_, c) => ({
      id: h + c,
      cells: Array.from({ length: h }, (_, r) => r * w + c),
    })),
  ];
  const clueOf = (id: number) => (id < h ? clues.rows[id] : clues.cols[id - h]);
  const cellsOf = (id: number) => (id < h ? row(board, id) : column(board, id - h));
  const set = (ids: Iterable<number>) => lineSetOf(h, ids);

  return {
    kind: 'flat',
    lines,
    hpLines: w + h,
    warmUpLines: () => warmUpLines(board.width, board.height),
    clue: clueOf,

    // As the board view dims a clue: every run matched, or nothing filled in a blank line.
    finishedLines: () =>
      lines
        .filter(({ id }) => {
          const clue = clueOf(id);
          const cells = cellsOf(id);
          return clue.length
            ? satisfiedClues(cells, clue).every(Boolean)
            : !cells.includes(Cell.Filled);
        })
        .map((l) => l.id),

    // Suspects can't be trusted, so they count as fog (the 2D game's `allUnreadable`). The
    // line solver has no start board, so `'marks'` is checked from blank: the stricter
    // question, and the only one the 2D game asks (its pools are proven offline).
    solvable: ({ fog = [], scramble = [], suspects = [] }: Hidden) =>
      solve(w, h, clues, { fog: set([...fog, ...suspects]), scramble: set(scramble) }).status ===
      'unique',

    // At least two different runs, as the enemy loader checks.
    canScramble: (id) => new Set(clueOf(id)).size >= 2,
    hasShape: (id) => clueOf(id).length > 0,
    fakeClue: (id) => fakeClue(clueOf(id), id < h ? w : h),

    pickLive: (skip) => {
      const live = pickLiveLine(board, solution, [], set(skip));
      return live && lineId(h, live);
    },

    pickInk: (size, inked, done) => pickInk(board, size, [...inked], set(done)),

    // By the truth on the board: a struck line a swap re-opened can be swapped again.
    pickSwap: () => {
      const swap = pickSwap(board, solution);
      if (!swap) return null;
      return {
        lines: swap.lines.map((index) => lineId(h, { kind: swap.kind, index })),
        cells: swap.cells,
      };
    },

    wipe: (cells) => {
      if (game.wipe) game.wipe(cells);
      else for (const i of cells) board.cells[i] = Cell.Empty;
    },

    blast: (_done, rng) => pickBlast(board, solution, blastSize(w, h), rng)?.cells ?? [],

    reveal: (cells) => {
      if (game.reveal) game.reveal(cells);
      else for (const i of cells) board.cells[i] = revealedCell(solution, i);
    },

    // Only a square board turns: a turn swaps width and height.
    turn: () => (w === h ? gridTurn(w) : null),
  };
}
