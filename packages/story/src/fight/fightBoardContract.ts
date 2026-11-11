import { describe, expect, it } from 'vitest';
import { random } from '@picross/shared/engine/random';
import type { FightBoard } from './board';

/**
 * The tests every `FightBoard` must pass (#164), whatever its board. It isn't a test file
 * itself (`*.test.ts`), so each board's tests can run it on its own puzzles:
 *
 * ```ts
 * fightBoardContract('a grid, 15×15', {
 *   fresh: () => gridFightBoard(puzzle, new Game(puzzle)),
 *   worked: (lines) => …,
 * });
 * ```
 *
 * It checks what the battle relies on: the lines cover the board the way lines do, a
 * solved board has every line finished, a fresh one is solvable, the picks stay on the
 * board and keep out of what they're told to skip, a forgery is never the real clue, the
 * same generator gives the same picks, and a turn moves lines and cells consistently.
 * What a board picks (which line, which patch) is its own and isn't checked here: each
 * board's golden traces hold that.
 */

/** Ways to make the board under test, each a new one. */
export interface ContractBoards<C> {
  /** Nothing played yet. */
  fresh(): FightBoard<C>;
  /** These lines worked out (every cell of theirs the truth, as a reveal puts it), nothing else. */
  worked(lines: readonly number[]): FightBoard<C>;
}

const SEED = 20261111;

export function fightBoardContract<C>(name: string, boards: ContractBoards<C>): void {
  describe(`FightBoard contract: ${name}`, () => {
    const board = boards.fresh();
    const ids = board.lines.map((l) => l.id);
    const size = Math.max(...board.lines.flatMap((l) => l.cells)) + 1;
    const cellsOf = (lines: Iterable<number>) =>
      new Set([...lines].flatMap((id) => board.lines[id].cells));
    const all = new Set(ids);
    const shaped = ids.filter((id) => board.hasShape(id));
    /** Two lines side by side (they never cross): the first two. */
    const firstTwo = ids.slice(0, 2);
    const inRange = (cells: readonly number[]) =>
      cells.every((c) => Number.isInteger(c) && c >= 0 && c < size);
    const unique = (list: readonly number[]) => new Set(list).size === list.length;

    it('is a flat board or a block', () => {
      expect(['flat', 'block']).toContain(board.kind);
    });

    it('numbers its lines in order, and they cover the board the way lines do', () => {
      expect(ids).toEqual([...ids.keys()]);
      const covering = new Array<number>(size).fill(0);
      for (const line of board.lines) {
        expect(line.cells.length).toBeGreaterThan(0);
        expect(inRange(line.cells)).toBe(true);
        expect(unique(line.cells)).toBe(true);
        for (const c of line.cells) covering[c]++;
      }
      // Every cell is in the same number of lines, one per direction (2 flat, 3 on a block).
      const k = covering[0];
      expect(k).toBeGreaterThanOrEqual(2);
      expect(covering.every((n) => n === k)).toBe(true);
      // Two lines cross at one cell at most.
      const lineOf = Array.from({ length: size }, () => [] as number[]);
      for (const line of board.lines) for (const c of line.cells) lineOf[c].push(line.id);
      for (const line of board.lines) {
        const met = line.cells.flatMap((c) => lineOf[c].filter((id) => id !== line.id));
        expect(unique(met)).toBe(true);
      }
    });

    it('scales HP and warms up by a share of its lines', () => {
      for (const n of [board.hpLines, board.warmUpLines()]) {
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(ids.length);
      }
    });

    it('has the lines a solved board has finished', () => {
      expect(
        boards
          .worked(ids)
          .finishedLines()
          .sort((a, b) => a - b),
      ).toEqual(ids);
      const worked = boards.worked(firstTwo).finishedLines();
      for (const id of firstTwo) expect(worked).toContain(id);
      // Nothing played finishes only a line with nothing in the picture.
      for (const id of board.finishedLines()) expect(board.hasShape(id)).toBe(false);
    });

    it('reveals the truth and wipes back to blank', () => {
      const revealed = boards.fresh();
      revealed.reveal([...Array(size).keys()]);
      expect(revealed.finishedLines().sort((a, b) => a - b)).toEqual(ids);
      const wiped = boards.worked(ids);
      wiped.wipe([...Array(size).keys()]);
      expect(wiped.finishedLines()).toEqual(boards.fresh().finishedLines());
    });

    it('is solvable with nothing hidden, and not with every clue fogged', () => {
      expect(board.solvable({}, 'blank')).toBe(true);
      expect(board.solvable({}, 'marks')).toBe(true);
      expect(board.solvable({ fog: ids }, 'blank')).toBe(false);
      expect(board.solvable({ suspects: ids }, 'blank')).toBe(false);
    });

    it('has lines in the picture, and only those can scramble', () => {
      expect(shaped.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(board.clue(id)).not.toBeUndefined();
        if (board.canScramble(id)) expect(board.hasShape(id)).toBe(true);
      }
    });

    it('forges a clue that is never the real one', () => {
      const rng = random(SEED);
      for (const id of ids) {
        const truth = board.clue(id);
        if (truth === null) continue;
        expect(board.fakeClue(id, rng)).not.toEqual(truth);
      }
    });

    it('goes live on a line it is not told to skip', () => {
      const rng = random(SEED);
      const live = board.pickLive(new Set(), rng);
      expect(live).not.toBeNull();
      expect(ids).toContain(live);
      const only = shaped[shaped.length - 1];
      expect(board.pickLive(new Set(ids.filter((id) => id !== only)), rng)).toBe(only);
      expect(board.pickLive(all, rng)).toBeNull();
    });

    it('inks new cells, outside finished lines', () => {
      const rng = random(SEED);
      const worked = boards.worked(firstTwo);
      const done = new Set(firstTwo);
      const inked = new Set(board.lines[shaped[0]].cells.slice(0, 1));
      const ink = worked.pickInk(3, inked, done, rng);
      expect(ink.length).toBeGreaterThan(0);
      expect(ink.length).toBeLessThanOrEqual(9);
      expect(inRange(ink)).toBe(true);
      expect(unique(ink)).toBe(true);
      const finished = cellsOf(done);
      for (const c of ink) {
        expect(inked.has(c)).toBe(false);
        expect(finished.has(c)).toBe(false);
      }
      expect(worked.pickInk(3, new Set(), all, rng)).toEqual([]);
    });

    it('swaps up to two unfinished lines with work in them, and only their cells', () => {
      expect(board.pickSwap(new Set())).toBeNull();
      const worked = boards.worked(firstTwo);
      const swap = worked.pickSwap(new Set(firstTwo));
      expect(swap).not.toBeNull();
      const { lines, cells } = swap!;
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(2);
      expect(unique(lines)).toBe(true);
      for (const id of lines) {
        expect(ids).toContain(id);
        expect(firstTwo).not.toContain(id);
      }
      expect(cells.length).toBeGreaterThan(0);
      expect(unique(cells)).toBe(true);
      const theirs = cellsOf(lines);
      for (const c of cells) expect(theirs.has(c)).toBe(true);
    });

    it('blasts cells on the board, and nothing once it is solved', () => {
      const rng = random(SEED);
      const cells = board.blast(new Set(), rng);
      expect(cells.length).toBeGreaterThan(0);
      expect(inRange(cells)).toBe(true);
      expect(unique(cells)).toBe(true);
      expect(boards.worked(ids).blast(new Set(), rng)).toEqual([]);
    });

    it('picks the same with the same generator', () => {
      const play = () => {
        const rng = random(SEED);
        const b = boards.worked(firstTwo);
        const done = new Set(firstTwo);
        return {
          live: b.pickLive(done, rng),
          ink: b.pickInk(3, new Set(), done, rng),
          fakes: shaped.filter((id) => b.clue(id) !== null).map((id) => b.fakeClue(id, rng)),
          swap: b.pickSwap(done),
          blast: b.blast(done, rng),
          after: rng(),
        };
      };
      expect(play()).toEqual(play());
    });

    it('turns lines and cells together, if it turns', () => {
      const turn = board.turn();
      if (!turn) return;
      const lines = ids.map((id) => turn.line(id));
      expect([...lines].sort((a, b) => a - b)).toEqual(ids);
      const cells = [...Array(size).keys()].map((c) => turn.cell(c));
      expect([...cells].sort((a, b) => a - b)).toEqual([...Array(size).keys()]);
      for (const line of board.lines) {
        const moved = line.cells.map((c) => turn.cell(c)).sort((a, b) => a - b);
        expect(moved).toEqual([...board.lines[turn.line(line.id)].cells].sort((a, b) => a - b));
      }
      // Four quarter turns go all the way round.
      const round = (f: (n: number) => number, n: number) => f(f(f(f(n))));
      for (const id of ids) expect(round((n) => turn.line(n), id)).toBe(id);
      for (let c = 0; c < size; c++) expect(round((n) => turn.cell(n), c)).toBe(c);
    });
  });
}
