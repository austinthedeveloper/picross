/**
 * The bricks route's models (docs/brick-kids.md): the Cubed pack's smallest, which split
 * into 20 bricks or fewer, and the trio's dog. They're the pack's own puzzles, not copies,
 * so a change to one changes it here too (`models.test.ts` keeps them small).
 */
import type { BuildRules } from '@picross/block/build/build';
import { buildModel } from '@picross/block/puzzles/trio';
import type { Puzzle } from '@picross/block/puzzles/format';

/** In the picker's order: fewest bricks first. */
export const BRICKS_MODELS = [
  'jack',
  'steps',
  'car',
  'table',
  'sailboat',
  'cactus',
  'heart',
  'chair',
  'mushroom',
  'wheelbarrow',
  'dog',
] as const;

/**
 * How a build plays for 3- and 4-year-olds: a tap anywhere snaps the brick into the nearest
 * open ghost of its kind, and it turns itself to fit. The tray shows every kind the layer
 * needs, as the build stage's does (`oneKind` is there for a younger setting, if one's
 * wanted).
 */
export const KIDS_RULES: BuildRules = { reach: Infinity, anyTurn: true };

/** One of the route's models, or undefined for any other id. */
export const bricksModel = (id: string): Puzzle | undefined =>
  (BRICKS_MODELS as readonly string[]).includes(id) ? buildModel(id) : undefined;
