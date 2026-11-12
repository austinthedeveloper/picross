import { describe, expect, it } from 'vitest';
import { PUZZLES } from '@picross/block/puzzles/index';
import { difficultyOf } from '@picross/block/puzzles/difficulty';
import {
  deepestEndless,
  ENDLESS_BOARDS,
  ENDLESS_ID,
  endlessBoardOf,
  endlessId,
  isEndlessId,
  endlessEncounter,
  endlessSetup,
  fightOnBlock,
  isBreak,
  type EndlessBoard,
} from './endless';
import { endlessBlock } from './endlessBlocks';
import { rateBlockFight, rateFlat } from './fightRatings';
import { runs } from './runs';

const ROUNDS = 50;

/** The first `ROUNDS` fights of an Endless run on `board`, from every job, with a seed. */
function fights(board: EndlessBoard, seed: number) {
  const setup = endlessSetup(runs, seed, board);
  const out = [];
  for (let node = 0; out.length < ROUNDS; node++) {
    if (isBreak(node)) continue;
    out.push(endlessEncounter(setup, node));
  }
  return out;
}

describe('Endless on either board (#158)', () => {
  it('Flat stays flat, Cubed is all blocks, Mixed takes turns (flat first)', () => {
    for (const board of ENDLESS_BOARDS) {
      const onBlock = fights(board, 7).map((e) => Boolean(e.onBlock));
      if (board === 'flat') expect(onBlock.every((b) => !b)).toBe(true);
      if (board === 'cubed') expect(onBlock.every(Boolean)).toBe(true);
      if (board === 'mixed') expect(onBlock).toEqual(onBlock.map((_, i) => i % 2 === 1));
    }
    // A run from before there was a choice has no board: flat.
    expect(fightOnBlock({}, 3)).toBe(false);
  });

  for (const board of ENDLESS_BOARDS) {
    it(`${ROUNDS} rounds on ${board}: every fight can be solved without guessing`, () => {
      for (const seed of [1, 2]) {
        for (const e of fights(board, seed)) {
          if (!e.onBlock) {
            expect(rateFlat(e).status, e.id).toBe('unique');
            continue;
          }
          const { of, fight, nth } = e.onBlock;
          const block = endlessBlock(of, fight, nth, seed);
          expect(block, `${e.id} has a block enemy`).not.toBeNull();
          const rating = rateBlockFight(e.id, block!.enemy, block!.puzzle);
          expect(rating.status, `${e.id} on ${block!.puzzle.id}`).toBe('unique');
        }
      }
    });
  }

  it('blocks get harder by band as the run goes on, and a reload picks the same', () => {
    const bands = Array.from(
      { length: 16 },
      (_, nth) => difficultyOf(endlessBlock('goblin', nth, nth, 5)!.puzzle).id,
    );
    expect(bands.slice(0, 4)).toEqual(['easy', 'easy', 'easy', 'easy']);
    expect(bands.slice(4, 8)).toEqual(Array(4).fill('medium'));
    expect(bands.slice(8, 12)).toEqual(Array(4).fill('hard'));
    expect(bands.slice(12)).toEqual(Array(4).fill('expert'));
    expect(endlessBlock('goblin', 3, 3, 5)!.puzzle.id).toBe(
      endlessBlock('goblin', 3, 3, 5)!.puzzle.id,
    );
    // Every block it picks is from Cubed's pack.
    expect(PUZZLES.map((p) => p.id)).toContain(endlessBlock('goblin', 0, 0, 5)!.puzzle.id);
  });

  it('scales a block enemy by depth, as on a grid', () => {
    const early = endlessBlock('goblin', 0, 0, 5)!.enemy;
    const late = endlessBlock('goblin', 12, 12, 5)!.enemy;
    expect(late.hp).toBeGreaterThan(early.hp);
    expect(late.attack).toBe(early.attack + 3);
  });

  it('each board keeps its own best, Flat on the old id, and badges count the deepest', () => {
    expect(ENDLESS_BOARDS.map(endlessId)).toEqual([ENDLESS_ID, 'endless-cubed', 'endless-mixed']);
    expect(ENDLESS_BOARDS.map((b) => endlessBoardOf(endlessId(b)))).toEqual([...ENDLESS_BOARDS]);
    expect(endlessBoardOf('first-job')).toBe('flat');
    expect(isEndlessId('endless-mixed')).toBe(true);
    expect(isEndlessId('first-job')).toBe(false);
    const bests: Record<string, number> = { endless: 4, 'endless-cubed': 11 };
    expect(deepestEndless((id) => bests[id])).toBe(11);
    expect(deepestEndless(() => undefined)).toBe(0);
  });
});
