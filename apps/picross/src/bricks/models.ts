/**
 * The bricks route's models (docs/brick-kids.md): its own toys (`@picross/block`'s
 * `puzzles/bricks/`: animals, things that go, things kids know), the Cubed pack's smallest,
 * which split into 20 bricks or fewer, and the trio's dog. The pack's are its own puzzles,
 * not copies, so a change to one changes it here too (`models.test.ts` keeps them small).
 */
import type { BuildRules } from '@picross/block/build/build';
import { buildModel, type BrickModel } from '@picross/block/build/models';

/** In the picker's order: fewest bricks first. */
export const BRICKS_MODELS = [
  'jack',
  'ice-pop',
  'steps',
  'car',
  'table',
  'sailboat',
  'caterpillar',
  'cactus',
  'heart',
  'chair',
  'duck',
  'hen',
  'ice-cream',
  'airplane',
  'garden-snail',
  'field-mouse',
  'goldfish',
  'race-car',
  'sheep',
  'mushroom',
  'bunny',
  'carrot',
  'watermelon',
  'crab',
  'tugboat',
  'daisy-pot',
  'wheelbarrow',
  'fire-truck',
  'rainbow',
  'digger',
  'piglet',
  'fairy-cake',
  'box-turtle',
  'dino',
  'fox-cub',
  'helicopter',
  'birthday-cake',
  'pony',
  'cottage',
  'frog',
  'honeybee',
  'hoot-owl',
  'light-tower',
  'lion',
  'pumpkin',
  'snow-buddy',
  'dog',
  'train',
  'berry',
  'giraffe',
  'ladybird',
  'whale',
  'brolly',
  'kitty',
  'mini-sub',
  'toy-robot',
  'elephant',
  'teddy',
  'bus',
  'cow',
  'dump-truck',
  'penguin',
  'tractor',
  'toy-castle',
  'sky-balloon',
  'apple-tree',
  'space-rocket',
] as const;

/**
 * How a build plays for 3- and 4-year-olds: a tap anywhere snaps the brick into the nearest
 * open ghost of its kind, and it turns itself to fit. The tray shows every kind the layer
 * needs, as the build stage's does (`oneKind` is there for a younger setting, if one's
 * wanted).
 */
export const KIDS_RULES: BuildRules = { reach: Infinity, anyTurn: true };

/** One of the route's models, or undefined for any other id. */
export const bricksModel = (id: string): BrickModel | undefined =>
  (BRICKS_MODELS as readonly string[]).includes(id) ? buildModel(id) : undefined;
