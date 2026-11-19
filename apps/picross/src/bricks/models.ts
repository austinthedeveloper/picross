/**
 * The bricks route's models (docs/brick-kids.md): its own toys (`@picross/block`'s
 * `puzzles/bricks/`: animals, things that go, things kids know), the Cubed pack's smallest,
 * which split into 20 bricks or fewer, and the trio's dog. The pack's are its own puzzles,
 * not copies, so a change to one changes it here too (`models.test.ts` keeps them small).
 */
import type { BuildRules } from '@picross/block/build/build';
import { buildModel } from '@picross/block/puzzles/trio';
import type { Puzzle } from '@picross/block/puzzles/format';

/** In the picker's order: fewest bricks first. */
export const BRICKS_MODELS = [
  'jack',
  'ice-pop',
  'steps',
  'car',
  'table',
  'sailboat',
  'cactus',
  'heart',
  'chair',
  'duck',
  'hen',
  'airplane',
  'garden-snail',
  'sheep',
  'mushroom',
  'bunny',
  'crab',
  'tugboat',
  'daisy-pot',
  'wheelbarrow',
  'fire-truck',
  'rainbow',
  'digger',
  'piglet',
  'birthday-cake',
  'cottage',
  'frog',
  'honeybee',
  'dog',
  'train',
  'whale',
  'elephant',
  'teddy',
  'bus',
  'penguin',
  'tractor',
  'apple-tree',
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
