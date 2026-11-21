# Brick kids in real bricks

Each build on the screen is a real build too: the same bricks (2×4, 2×2, 1×4, 1×2 and 1×1,
one layer tall), one layer a step. `#/bricks/<id>/steps` turns a model into steps for real
toy bricks, for a grown-up and a child to build together. It's reached from the grown-ups'
corner of a build or a toy's moment (**Build it in real bricks**).

## The steps page

- **What you need** first: the toy built, how many bricks and layers, whether it holds
  together (below), and the parts list, each size and color drawn with a count.
- **Then a page a layer**: the toy so far from the front left (where the build camera looks
  from), with earlier layers faded so the new bricks stand out, a plan of the layer from
  above (front at the bottom, the layer under it outlined), and the bricks it adds.
- Numbered steps along the top, **Back** and **Next**, a swipe, or the arrow keys. It opens
  again on the step it was last on (in `picross:bricks`).
- **Print** prints every page, one to a sheet.
- The pictures are drawn flat, with seams and studs, and a little taller than the screen's
  cubes, as real bricks are (9.6 tall to 8 wide). No three.js, so it opens fast.

## Does it hold together?

On the screen, a brick can sit on air and a toy can be two loose halves. Real bricks hold
only by their studs, to the bricks right above and below. `checkReal` (in
`packages/block/src/build/real.ts`) looks at a split and grades it (`realFit`):

| Grade    | What it means                                                                                   | Models |
| -------- | ----------------------------------------------------------------------------------------------- | -----: |
| `stands` | One toy, built from the bottom up                                                               |     14 |
| `hangs`  | One toy, but some bricks have nothing under them: they press on under the brick above, after it |      6 |
| `plate`  | It holds on a base plate, and comes off it in pieces (columns side by side don't hold)          |     12 |
| `loose`  | Some bricks only touch the toy from the side, so they fall off                                  |     35 |

The page says which grade a toy is. In the steps, a brick that hangs is dashed, and one that
won't hold is dashed and crossed, with a note.

As of this page:

- **stands:** ice-pop, sailboat, chair, tugboat, fire-truck, rainbow, digger, fairy-cake,
  birthday-cake, cottage, frog, light-tower, train, dump-truck.
- **hangs:** heart, ice-cream, carrot, hoot-owl, bus, space-rocket.
- **plate:** steps, car, table, caterpillar, garden-snail, field-mouse, race-car, box-turtle,
  honeybee, ladybird, elephant, toy-castle.
- **loose:** the other 35, mostly animals: jack, cactus, duck, hen, airplane, goldfish,
  sheep, mushroom, bunny, watermelon, crab, daisy-pot, wheelbarrow, piglet, dino, fox-cub,
  helicopter, pony, lion, pumpkin, snow-buddy, dog, berry, giraffe, whale, brolly, kitty,
  mini-sub, toy-robot, teddy, cow, penguin, tractor, sky-balloon, apple-tree.

## Why so many come apart

Three things, roughly in order:

1. **Features in another color, on the side.** A beak, an eye, a nose, a tail: the split
   makes every brick one color, so a feature's bricks never cross into the head's, and if
   nothing's under it, it only touches from the side. Duck, hen, penguin, snow-buddy's
   eyes.
2. **Overhangs.** A body over two legs, a cap over a stalk, the arms of a robot or a teddy:
   the first layer of the overhang sits on air. Where the color carries on, a brick could
   reach back over the stalk and hold it, but the split doesn't look for that; it only
   prefers crossing seams.
3. **Columns.** Stripes (the bee), wheels, or legs built as stacks of the same brick are
   pieces of their own, held only by a plate.

## What would fix it

- **A real-bricks rule in the split** (worth trying first): don't leave a brick with nothing
  under it if a bigger brick of the same color can reach back over something that is, and
  prefer a brick that joins two pieces. That's the same scoring idea as crossing seams, and
  it would change the screen's builds too, keeping one set of steps. It can't fix a
  feature in another color.
- **Model changes**, for the features: put something under each beak and eye (a cube of the
  head's color inside, or move the feature down a layer), or make a feature the head's
  color plus a top cube in its own. A test can keep every model at `plate` or better, once
  they get there.
- **A base plate in the parts list**, so `plate` toys hold. Most kids' sets have one.
