import type { FightBoard, Hidden } from '@picross/story/fight/board';
import type { Clue } from '../engine/clues';
import { EMPTY, FILLED, solve } from '../engine/solver';
import { indexOf, inside, pointOf } from '../engine/volume';
import type { Puzzle } from '../puzzles/format';
import { BROKEN, PAINTED, SOLID } from './game';

/**
 * A block as a fight sees it (#165): the story's `FightBoard` over a 3D puzzle and the
 * cubes in play. These are the block `Battle`'s own picks, lifted out of it unchanged
 * (`Battle` calls them, with its generator, in the order it always has): the solver check
 * every runtime pick of fog, scrambles and suspects makes, the live line, ink, the Mimic's
 * wipe, the bomb's line and a forged clue.
 *
 * A line's id is its index in `puzzle.lines`: the lines along x, then y, then z.
 */

/** Share of a block's lines finished before a charge first goes live. */
export const WARM_UP_SHARE = 0.15;

/** What the board needs of a game: its cubes (a `Game` has them). */
export interface BlockFightGame {
  readonly blocks: Uint8Array;
}

/** The block's board, with what the 3D game's hints also read. */
export interface BlockFightBoard extends FightBoard<Clue> {
  /** The clues a player can read and trust with these hidden: what solving and hints use. */
  readableClues(hidden: Hidden): (Clue | null)[];
}

/**
 * Lines of a block that are finished: every cube that isn't the shape broken, none that
 * is. A line that's all shape has nothing to break, so it's finished once it's all painted.
 */
export function finishedLines(puzzle: Puzzle, blocks: Uint8Array): number[] {
  return puzzle.lines
    .filter((line) => {
      const full = line.cells.every((c) => puzzle.solution[c]);
      return line.cells.every((c) =>
        puzzle.solution[c]
          ? full
            ? blocks[c] === PAINTED
            : blocks[c] !== BROKEN
          : blocks[c] === BROKEN,
      );
    })
    .map((l) => l.id);
}

/** What the player has right on the board, as solver knowledge. */
function knownFrom(puzzle: Puzzle, blocks: Uint8Array): Uint8Array {
  const known = new Uint8Array(blocks.length);
  blocks.forEach((b, i) => {
    if (b === BROKEN && !puzzle.solution[i]) known[i] = EMPTY;
    else if (b === PAINTED && puzzle.solution[i]) known[i] = FILLED;
  });
  return known;
}

/**
 * The fight's view of a block: `puzzle`, the cubes in `game` (a blank block without one),
 * and `clues`, the clues the fight starts from. A fight whose enemy hides clues starts from
 * all of them (the default); free play hides about half (`puzzle.clues`).
 */
export function blockFightBoard(
  puzzle: Puzzle,
  game: BlockFightGame = { blocks: new Uint8Array(puzzle.solution.length) },
  clues: readonly (Clue | null)[] = puzzle.allClues,
): BlockFightBoard {
  const { blocks } = game;
  const { dims, lines } = puzzle;
  const truth = (c: number) => (puzzle.solution[c] ? PAINTED : BROKEN);

  const readableClues = (hidden: Hidden) => {
    const fog = new Set(hidden.fog);
    const scramble = new Set(hidden.scramble);
    const suspects = new Set(hidden.suspects);
    return clues.map((clue, i) => {
      if (!clue || suspects.has(i) || fog.has(i)) return null;
      if (scramble.has(i)) return { count: clue.count, pieces: null };
      return clue;
    });
  };

  return {
    kind: 'block',
    lines,
    hpLines: lines.length,
    warmUpLines: () => Math.max(1, Math.round(lines.length * WARM_UP_SHARE)),
    clue: (id) => clues[id] ?? null,
    finishedLines: () => finishedLines(puzzle, blocks),
    readableClues,

    solvable: (hidden, from) => {
      const start = from === 'marks' ? blocks : new Uint8Array(blocks.length);
      return solve(dims, readableClues(hidden), knownFrom(puzzle, start), lines).solved;
    },

    // A count of 0 or 1, or a full line, has only one possible frame: nothing to scramble.
    canScramble: (id) => {
      const clue = clues[id];
      return Boolean(clue) && clue!.count >= 2 && clue!.count !== lines[id].cells.length;
    },

    // Targets are lines with cubes of the shape in them, so finishing one takes work.
    hasShape: (id) => puzzle.allClues[id].count > 0,

    // One more or one fewer, with a frame that could be true.
    fakeClue: (id, rng) => {
      const real = clues[id]!;
      const n = lines[id].cells.length;
      const options: Clue[] = [];
      for (const count of [real.count + 1, real.count - 1]) {
        if (count < 0 || count > n) continue;
        // The most pieces `count` cubes can make in a line of n.
        const most = Math.min(3, count, n - count + 1);
        const pieces = count === 0 ? 0 : Math.max(1, Math.min(real.pieces ?? 1, most));
        options.push({ count, pieces: pieces as Clue['pieces'] });
      }
      return options[Math.floor(rng() * options.length)];
    },

    // Any line with work left in it. Not a line that's already struck: finishing it again
    // wouldn't count, so it could never ground the charge.
    pickLive: (skip, rng) => {
      const finished = new Set([...finishedLines(puzzle, blocks), ...skip]);
      const open = lines.filter(
        (l) => !finished.has(l.id) && l.cells.some((c) => blocks[c] === SOLID),
      );
      if (!open.length) return null;
      return open[Math.floor(rng() * open.length)].id;
    },

    // A size×size patch of a layer, where you've done the most, outside finished lines:
    // around a cube you've painted if there is one, else any cube still standing.
    pickInk: (size, inked, done, rng) => {
      const finished = new Set([...done].flatMap((id) => lines[id].cells));
      const open = (i: number) => blocks[i] !== BROKEN && !finished.has(i) && !inked.has(i);
      const marked = [...blocks.keys()].filter(open);
      if (!marked.length) return [];
      const painted = marked.filter((i) => blocks[i] === PAINTED);
      const pool = painted.length ? painted : marked;
      const center = pointOf(dims, pool[Math.floor(rng() * pool.length)]);
      const half = Math.floor(size / 2);
      const cells: number[] = [];
      for (let dz = -half; dz < size - half; dz++) {
        for (let dx = -half; dx < size - half; dx++) {
          const p = { x: center.x + dx, y: center.y, z: center.z + dz };
          if (!inside(dims, p)) continue;
          const i = indexOf(dims, p);
          if (open(i)) cells.push(i);
        }
      }
      return cells;
    },

    // The two lines with the most of your work in them, along any axes.
    pickSwap: (done) => {
      const work = (cells: readonly number[]) => cells.filter((c) => blocks[c] !== SOLID).length;
      const picked = lines
        .filter((l) => !done.has(l.id) && work(l.cells) > 0)
        .sort((a, b) => work(b.cells) - work(a.cells) || a.id - b.id)
        .slice(0, 2);
      if (!picked.length) return null;
      const cells: number[] = [];
      for (const l of picked) {
        for (const c of l.cells) if (blocks[c] !== SOLID && !cells.includes(c)) cells.push(c);
      }
      return { lines: picked.map((l) => l.id), cells };
    },

    wipe: (cells) => {
      for (const c of cells) blocks[c] = SOLID;
    },

    // One open line, worked out: the cubes in it that aren't right yet.
    blast: (done, rng) => {
      const open = lines.filter((l) => !done.has(l.id) && l.cells.some((c) => blocks[c] === SOLID));
      const line = open.length ? open[Math.floor(rng() * open.length)] : null;
      return line ? line.cells.filter((c) => blocks[c] !== truth(c)) : [];
    },

    reveal: (cells) => {
      for (const c of cells) blocks[c] = truth(c);
    },

    // A block turns only the camera: its lines stay where they are.
    turn: () => null,
  };
}
