/**
 * Endless on a block (#158): the block a fight is played on, and its enemy as a block reads
 * it. The enemy is the story encounter's (packages/block's story loader turns its powers into
 * counts for a block), scaled by depth as on a grid (`scaleEnemy`). The block comes from
 * Cubed's pack, by difficulty band: the first four block fights are easy, the next four
 * medium, then hard, then expert from there on. Each turn of four draws from a fresh
 * shuffle of its band, set by the run's seed, so a reload plays the same blocks.
 *
 * This brings Cubed's pack, so only the block fight (`ui/screens/run/blockFight.ts`, loaded
 * on demand) imports it: none of it is in the first download.
 */
import { BANDS, difficultyOf } from '@picross/block/puzzles/difficulty';
import type { Puzzle } from '@picross/block/puzzles/format';
import { PUZZLES } from '@picross/block/puzzles/index';
import { getEncounter, type Enemy } from '@picross/block/story/data';
import { shuffled } from '@picross/shared/engine/random';
import { scaleEnemy } from './endless';

/** Block fights per difficulty band, before the next band. */
const PER_BAND = 4;

/** The blocks of the band for the `nth` block fight. */
function bandPool(nth: number): Puzzle[] {
  const band = BANDS[Math.min(BANDS.length - 1, Math.floor(nth / PER_BAND))];
  const pool = PUZZLES.filter((p) => difficultyOf(p).id === band.id);
  return pool.length ? pool : [...PUZZLES];
}

/**
 * The block and enemy for an Endless fight: `of` is the story encounter, `fight` how many
 * fights came before (it scales the enemy, as on a grid), `nth` how many block fights did (it
 * picks the band). Null if the encounter has no enemy on a block.
 */
export function endlessBlock(
  of: string,
  fight: number,
  nth: number,
  seed: number,
): { enemy: Enemy; puzzle: Puzzle } | null {
  const enemy = getEncounter(of)?.enemy;
  if (!enemy) return null;
  const pool = bandPool(nth);
  const inBand = nth % PER_BAND;
  const cycle = Math.floor(nth / PER_BAND);
  // A fresh order for each band's turn, from the run's seed.
  const puzzle = shuffled(pool, seed + cycle * 7919)[inBand % pool.length];
  return { enemy: scaleEnemy(enemy, fight), puzzle };
}
