# Brick kids in real bricks

Each build on the screen is a real build too: the same bricks (2×4, 2×2, 1×4, 1×2 and 1×1,
one layer tall), one layer a step. `#/bricks/<id>/steps` turns a model into steps for real
toy bricks, for a grown-up and a child to build together. It's reached from the grown-ups'
corner of a build or a toy's moment (**Build it in real bricks**).

## The steps page

- **What you need** first: the toy built, how many bricks and layers, whether it holds
  together (below), and the parts list, each size and color drawn with a count. A toy that
  needs a base plate says how big (what its bottom layer covers).
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

- **stands:** ice-pop, steps, car, sailboat, duck, chair, garden-snail, hen, watermelon,
  tugboat, sheep, fire-truck, rainbow, helicopter, daisy-pot, digger, fairy-cake, piglet,
  light-tower, birthday-cake, cottage, frog, whale, train, tractor, dump-truck, penguin.
- **hangs:** heart, ice-cream, goldfish, carrot, brolly, dino, hoot-owl, fox-cub, pony,
  berry, sky-balloon, pumpkin, giraffe, teddy, toy-robot, elephant, bus, cow, apple-tree,
  space-rocket.
- **plate:** table, caterpillar, airplane, field-mouse, race-car, crab, bunny, box-turtle,
  snow-buddy, honeybee, kitty, ladybird, mini-sub, lion, toy-castle. Most are parts in
  their own colors side by side (the caterpillar's segments, the bee's stripes, wheels),
  which nothing can join.
- **loose:** jack, cactus, mushroom, wheelbarrow and the dog. They're Cubed's puzzles too
  (the pack's and the trio's), so they stay as they are: changing one changes a 3D puzzle.
  Each has a part only one cube holds up (the jack's arms, the cactus's arms, the
  mushroom's cap, the barrow's handles and wheel, the dog's nose).

`manual.test.ts` keeps every other model at `plate` or better, and `real.test.ts` (in
`@picross/block`) keeps all of Brick kids' own there.

## How it got there

At first 35 came apart. Three things did it:

1. **Features in another color, on the side.** A beak, an eye, a nose, a tail: the split
   makes every brick one color, so a feature's bricks never cross into the head's, and if
   nothing's under it, it only touches from the side.
2. **Overhangs.** A body over two legs, a cap over a stalk, the arms of a teddy: the first
   layer of the overhang sits on air unless a brick reaches back over what's under it.
3. **Columns.** Stripes, wheels, or legs built as stacks of the same brick are pieces of
   their own, held only by a plate.

**The split** (`splitIntoBricks`, `packages/block/src/build/bricks.ts`) now builds for real
bricks. In each layer, the cubes with nothing standing under them go first: each takes the
best brick that reaches back over something that stands, the cube with the fewest such
bricks first. A brick on air costs more than any size difference, and one that joins two
pieces scores more. Each layer is tried from all four corners, and the best four splits so
far go on to the next layer, so a choice that only pays off a layer up still wins. That
fixed the overhangs and most columns (7 of the 35 on its own), and it changes the screen's
builds too, so the screen and the steps stay one build.

**The models** were changed for the rest, keeping their look: each feature now sits on a
cube of the body's color that reaches into the body (the duck's and the hen's chests come
forward under the beak, the sheep's face is a layer higher, the piglet's snout and tail sit
on its back), a tail sits on the body (the giraffe's and the pony's hang under it, the
goldfish's is a fan), and a few were rebuilt where the shape couldn't hold:

- **airplane:** a tail wheel, a white nose, and a shorter tailplane.
- **helicopter:** a 2×2 mast under one long rotor, without the cross.
- **brolly:** a purple canopy under a pink top, rather than panels (panels side by side
  never hold each other).
- **sky-balloon:** bands of red and yellow, a layer each, rather than stripes up the side.
- **daisy-pot:** leaves under the petals. **snow-buddy:** a square hat brim. **toy-robot:**
  stone shoulders the arms hang from. **tractor:** axles under the body. **whale:** a wider
  spout. **cow:** horns on the head's sides, the tail on its back. **kitty:** a narrower
  belly and its stripe a cube over, so the tail holds. **dino:** the tail a layer up, and
  its eye on top. **mini-sub:** the propeller on the hull. **penguin:** a belly under the
  beak. **bunny:** its tail and nose on the body. **watermelon:** the rind under its tips.

A base plate in the parts list holds the `plate` toys.
