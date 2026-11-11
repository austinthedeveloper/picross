import { describe, expect, it } from 'vitest';
import { fightBoardContract } from '@picross/story/fight/fightBoardContract';
import { random } from '@picross/shared/engine/random';
import { blastSize, pickBlast } from '../engine/blast';
import { Cell } from '../engine/board';
import { pickSwap } from '../engine/swap';
import { turnIndex, turnLine } from '../engine/transform';
import { getPuzzle } from '../puzzles/index';
import { parsePuzzle, type Puzzle } from '../puzzles/format';
import { blastOf, gridFightBoard, gridTurn, lineAt, lineId, swapOf } from './fightBoard';
import { Game } from './game';

/** A board that isn't square, so it can't turn. */
const WIDE = parsePuzzle({
  id: 'wide',
  name: 'Wide',
  width: 6,
  height: 4,
  solution: ['######', '#....#', '#.##.#', '######'],
});

const boards = (puzzle: Puzzle) => ({
  fresh: () => gridFightBoard(puzzle, new Game(puzzle)),
  worked: (lines: readonly number[]) => {
    const game = new Game(puzzle);
    const board = gridFightBoard(puzzle, game);
    board.reveal(lines.flatMap((id) => board.lines[id].cells));
    return board;
  },
});

const SUBJECTS: Puzzle[] = [
  WIDE,
  getPuzzle('arrow')!,
  getPuzzle('beetle')!,
  getPuzzle('cave-wyrm')!,
];
for (const puzzle of SUBJECTS) {
  fightBoardContract(`a ${puzzle.width}×${puzzle.height} grid (${puzzle.id})`, boards(puzzle));
}

describe('gridFightBoard', () => {
  const beetle = getPuzzle('beetle')!;

  it('numbers rows, then columns', () => {
    const board = gridFightBoard(WIDE);
    expect(board.lines).toHaveLength(10);
    expect(board.lines[1].cells).toEqual([6, 7, 8, 9, 10, 11]);
    expect(board.lines[4 + 2].cells).toEqual([2, 8, 14, 20]);
    expect(lineAt(4, 6)).toEqual({ kind: 'col', index: 2 });
    expect(lineId(4, { kind: 'col', index: 2 })).toBe(6);
    expect(board.hpLines).toBe(10);
    expect(board.clue(2)).toEqual([1, 2, 1]);
    expect(board.canScramble(2)).toBe(true);
    expect(board.canScramble(0)).toBe(false);
  });

  it('finishes a line when its clue is satisfied, as the board view says', () => {
    const game = new Game(WIDE);
    const board = gridFightBoard(WIDE, game);
    // Row 1's two runs of one, filled in the wrong cells, still satisfy its clue.
    game.board.cells[7] = Cell.Filled;
    game.board.cells[9] = Cell.Filled;
    expect(board.finishedLines()).toEqual([1]);
  });

  it('picks what the 2D helpers pick', () => {
    const game = new Game(beetle);
    const board = gridFightBoard(beetle, game);
    board.reveal([...board.lines[3].cells, ...board.lines[4].cells]);
    const pick = board.pickSwap(new Set())!;
    expect(swapOf(beetle.height, pick)).toEqual(pickSwap(game.board, beetle.solution));
    const cells = board.blast(new Set(), random(3));
    const blast = pickBlast(game.board, beetle.solution, blastSize(15, 15), random(3))!;
    expect(blastOf(beetle.width, cells)).toEqual(blast);
  });

  it('turns lines and cells as the 2D board turns', () => {
    const turn = gridTurn(15);
    for (let id = 0; id < 30; id++) {
      expect(lineAt(15, turn.line(id))).toEqual(turnLine(lineAt(15, id), 15));
    }
    for (let i = 0; i < 225; i++) expect(turn.cell(i)).toBe(turnIndex(i, 15));
    expect(gridFightBoard(WIDE).turn()).toBeNull();
  });

  it('checks solvability as the line solver does, suspects as fog', () => {
    const board = gridFightBoard(beetle);
    expect(board.solvable({ fog: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }, 'blank')).toBe(
      false,
    );
    expect(board.solvable({ suspects: [7] }, 'marks')).toBe(board.solvable({ fog: [7] }, 'blank'));
  });

  it('never draws from the generator (a bomb aside)', () => {
    const board = boards(beetle).worked([0, 1]);
    const rng = () => {
      throw new Error('drew');
    };
    expect(() => {
      board.pickLive(new Set(), rng);
      board.pickInk(3, new Set(), new Set([0, 1]), rng);
      board.fakeClue(5, rng);
      board.pickSwap(new Set());
    }).not.toThrow();
  });
});
