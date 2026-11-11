// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Cell } from './engine/board';
import { solve } from './engine/solver';
import { Game } from './game/game';
import { getPuzzle, puzzles } from './puzzles/index';

/**
 * Nothing here touches the page: every module loads and works in Node, with no DOM.
 * (The package's tsconfig leaves out the DOM types, and imports.test.ts keeps it off
 * `@picross/shared/ui`.)
 */
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts']);

describe('in Node, with no DOM', () => {
  it('has no page', () => {
    expect('document' in globalThis).toBe(false);
    expect('window' in globalThis).toBe(false);
  });

  it('loads every module', async () => {
    expect(Object.keys(modules)).toContain('./engine/solver.ts');
    for (const load of Object.values(modules)) await expect(load()).resolves.toBeTypeOf('object');
  });

  it('loads the pack, solves a puzzle, and plays it', () => {
    expect(puzzles.length).toBeGreaterThan(0);
    const heart = getPuzzle('heart')!;
    expect(solve(heart.width, heart.height, heart.clues).status).toBe('unique');
    const game = new Game(heart);
    const fills = heart.solution.cells.flatMap((filled, index) =>
      filled ? [{ index, from: Cell.Empty, to: Cell.Filled }] : [],
    );
    game.commit(game.preview(fills).applied);
    expect(game.solved).toBe(true);
  });
});
