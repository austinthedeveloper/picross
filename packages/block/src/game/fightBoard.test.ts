import { describe, expect, it } from 'vitest';
import { fightBoardContract } from '@picross/story/fight/fightBoardContract';
import { encounterFiles } from '@picross/story/puzzles/files/encounters';
import { runPuzzleFiles } from '@picross/story/puzzles/files/runPuzzles';
import type { Clue } from '../engine/clues';
import type { Puzzle } from '../puzzles/format';
import { getPuzzle, getStoryPuzzle } from '../puzzles/index';
import { getEncounter } from '../story/data';
import { Battle } from './battle';
import { blockFightBoard } from './fightBoard';
import { BROKEN, PAINTED, SOLID } from './game';

const boards = (puzzle: Puzzle, clues?: readonly (Clue | null)[]) => {
  const make = () => {
    const blocks = new Uint8Array(puzzle.solution.length);
    return blockFightBoard(puzzle, { blocks }, clues);
  };
  return {
    fresh: make,
    worked: (lines: readonly number[]) => {
      const board = make();
      board.reveal(lines.flatMap((id) => board.lines[id].cells));
      return board;
    },
  };
};

// Story blocks start from every clue when the enemy hides some; free play from about half.
for (const id of ['bat', 'eel', 'mimic-chest', 'pocket-watch']) {
  const puzzle = getStoryPuzzle(id)!;
  const { x, y, z } = puzzle.dims;
  fightBoardContract(`a ${x}×${y}×${z} block (${id})`, boards(puzzle));
}
{
  const mushroom = getPuzzle('mushroom')!;
  fightBoardContract(
    'a block with its free-play clues (mushroom)',
    boards(mushroom, mushroom.clues),
  );
}

const load = <T>(files: Record<string, unknown>) =>
  Object.values(files).map((m) => (m as { default: T }).default);

describe('blockFightBoard', () => {
  it("scales HP by its lines over the flat board's, as the story's enemies have it", () => {
    const flat = new Map(
      load<{ id: string; width: number; height: number }>(runPuzzleFiles).map((p) => [p.id, p]),
    );
    let checked = 0;
    for (const data of load<{ id: string; puzzle: string; enemy?: { hp: number } }>(
      encounterFiles,
    )) {
      const encounter = getEncounter(data.id);
      if (!data.enemy || !encounter?.enemy) continue;
      const board = blockFightBoard(encounter.puzzle);
      expect(board.hpLines).toBe(encounter.puzzle.lines.length);
      // The flat board's lines (its rows and columns), or 30 when the 2D puzzle is missing.
      const twoD = flat.get(data.puzzle);
      const lines2d = twoD ? twoD.width + twoD.height : 30;
      const hp = Math.max(1, Math.round((data.enemy.hp * board.hpLines) / lines2d));
      expect(encounter.enemy.hp, data.id).toBe(hp);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('wipes to solid and reveals the truth', () => {
    const puzzle = getStoryPuzzle('bat')!;
    const blocks = new Uint8Array(puzzle.solution.length);
    const board = blockFightBoard(puzzle, { blocks });
    const cells = board.lines[0].cells;
    board.reveal(cells);
    for (const c of cells) expect(blocks[c]).toBe(puzzle.solution[c] ? PAINTED : BROKEN);
    board.wipe(cells);
    for (const c of cells) expect(blocks[c]).toBe(SOLID);
  });

  it("gives the battle's hints: fog and suspects unread, scrambles without their frame", () => {
    const puzzle = getStoryPuzzle('bat')!;
    const battle = new Battle(
      { name: 'Test', sprite: 'goblin', hp: 50, attack: 1, fog: 2, scramble: 2 },
      puzzle,
      true,
      undefined,
      { seed: 7 },
    );
    const board = blockFightBoard(puzzle, undefined, battle.base);
    const { fog, scramble, suspects } = battle.state;
    expect(battle.hintClues()).toEqual(board.readableClues({ fog, scramble, suspects }));
    for (const id of fog) expect(battle.hintClues()[id]).toBeNull();
    for (const id of scramble) expect(battle.hintClues()[id]?.pieces).toBeNull();
  });

  it("says what can't scramble or be armor", () => {
    const puzzle = getStoryPuzzle('bat')!;
    const board = blockFightBoard(puzzle);
    for (const line of puzzle.lines) {
      const { count } = puzzle.allClues[line.id];
      expect(board.hasShape(line.id)).toBe(count > 0);
      expect(board.canScramble(line.id)).toBe(count >= 2 && count < line.cells.length);
    }
    expect(board.turn()).toBeNull();
  });
});
