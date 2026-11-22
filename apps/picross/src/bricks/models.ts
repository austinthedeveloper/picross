/**
 * The bricks route's models (docs/brick-kids.md): its own toys (`@picross/block`'s
 * `puzzles/bricks/`: animals, things that go, things kids know), the Cubed pack's smallest,
 * which split into 20 bricks or fewer, and the trio's dog. The pack's are its own puzzles,
 * not copies, so a change to one changes it here too (`models.test.ts` keeps them small).
 */
import { SNAP_REACH, type BuildRules } from '@picross/block/build/build';
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
  'duck',
  'chair',
  'ice-cream',
  'airplane',
  'goldfish',
  'garden-snail',
  'field-mouse',
  'hen',
  'race-car',
  'carrot',
  'mushroom',
  'watermelon',
  'crab',
  'tugboat',
  'sheep',
  'wheelbarrow',
  'fire-truck',
  'rainbow',
  'brolly',
  'bunny',
  'helicopter',
  'daisy-pot',
  'digger',
  'fairy-cake',
  'piglet',
  'box-turtle',
  'light-tower',
  'dino',
  'birthday-cake',
  'cottage',
  'snow-buddy',
  'honeybee',
  'hoot-owl',
  'kitty',
  'fox-cub',
  'pony',
  'frog',
  'berry',
  'sky-balloon',
  'pumpkin',
  'dog',
  'giraffe',
  'ladybird',
  'whale',
  'mini-sub',
  'lion',
  'train',
  'teddy',
  'tractor',
  'toy-robot',
  'elephant',
  'bus',
  'dump-truck',
  'penguin',
  'cow',
  'toy-castle',
  'apple-tree',
  'space-rocket',
] as const;

/**
 * How a build plays for 3- and 4-year-olds: a tap on or next to a ghost of the brick's kind
 * (the build stage's reach, a cube) snaps it in, and it turns itself to fit. A tap anywhere
 * else bounces, so the child finds the spot, not just the plate. The tray shows every kind
 * the layer needs, as the build stage's does (`oneKind` is there for a younger setting, if
 * one's wanted).
 */
export const KIDS_RULES: BuildRules = { reach: SNAP_REACH, anyTurn: true };

/** One of the route's models, or undefined for any other id. */
export const bricksModel = (id: string): BrickModel | undefined =>
  (BRICKS_MODELS as readonly string[]).includes(id) ? buildModel(id) : undefined;
