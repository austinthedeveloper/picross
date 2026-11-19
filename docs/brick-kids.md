# Brick kids (a concept)

> **Where it stands.** The first step below is built: Brick kids is a route in this app,
> `#/bricks` ([bricks.md](bricks.md) has how it plays and the code). What was decided on
> the way: it's one game aimed at the youngest end, with bricks that turn themselves, and
> the tray shows the whole layer, not one kind at a time (#254: choosing is part of the
> fun). A brick snaps into a ghost tapped on or next to: snapping from a tap anywhere was
> tried first, but then the spot didn't matter, and finding it is the game. It has 56
> models of its own (#255, #257) besides the pack's ten smallest and the trio's dog, and a
> route came first, as recommended. The rest of the open questions at the end are still
> open. The page below is the concept as written, kept for its reasoning.

A spin-off of the build stage ([cubed/build.md](cubed/build.md), PR #250) as a small game of
its own: building toy bricks for kids who are a little too young for real brick sets. The
prototype already plays like that. Bricks come turned to fit, snap from a stud away, and
nothing can go wrong. This page is the idea, not a plan. It covers what we'd keep, what
we'd change for little hands, where the models come from, how it could ship, and what's
still open. "Brick kids" is only a working title.

## Who it's for

Kids of about 3 to 6, with a grown-up nearby but not doing it for them.

- **Taps, not drags.** A 3-year-old can tap a big target; a precise drag that ends on the
  right spot is hard, and two-finger gestures are out. Every action works by tap: tap a
  brick, tap where it goes. Dragging can still work for the older ones, but it's never
  needed.
- **No reading.** Nothing they need is written down: no counts, no "Layer 3 of 6", no
  instructions. The picture, sound and motion carry everything. Words are for grown-ups,
  behind a parent gate (below).
- **Short sessions.** One build is 2 to 4 minutes: about 6 to 20 bricks over 3 to 6 layers.
  They can stop at any point and pick up where they left off, and finishing one build is
  the whole goal: no levels to unlock, streaks, timers or scores.
- **Big targets.** Tray bricks and buttons at least 64 px; the plate fills the screen.
- **No way to lose.** As in the prototype, a wrong drop hops back. Nothing is ever taken
  away or marked wrong.

## What carries over as-is

The prototype splits into the parts a kids' game needs, and most of them don't know about
the puzzles at all.

| Piece        | Where                                           | Why it carries over                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The split    | `packages/block/src/build/bricks.ts`            | `splitIntoBricks` takes any `Shape` (dims and solution), so any voxel model gets a build, written by no one, the same every time. It needs only `engine/volume`                                                         |
| `BrickBuild` | `packages/block/src/build/build.ts`             | The build's state: layers, filled slots, the tray by kind, snapping, `advance`. No DOM, no three.js, and already tested                                                                                                 |
| `BrickView`  | `packages/play-block/src/ui/board/brickView.ts` | The plate, solid built layers, the ghost of the current layer, the pile around the plate, the pop, the per-brick squash, the turntable finish and `snapshot()`. It reads only the puzzle's `name`, `dims` and `palette` |
| Build screen | `packages/play-block/src/ui/screens/build.ts`   | The flow (pop, layer by layer, finish), tap-then-tap placing, the bounce on a wrong drop, holding the same kind for the next one. The kids' screen starts as a copy and loses the text                                  |

`BrickView` and the screen take a `Puzzle`, but only use the model part of it. A small
`Model` type (`id`, `name`, `dims`, `solution`, `palette`) that `Puzzle` already satisfies
would let a kids' model skip clues altogether.

## What changes for little kids

Most of these are options on what's there, not new code. Where an option goes into
`BrickBuild` or the split, both games keep today's defaults.

- **No turning.** The tray hands over a brick already turned to fit its next open ghost, as
  `pick()` does now, and there's no Turn button or R key. If a dropped brick fits an open
  ghost only the other way round, it turns itself on the way in. (`fits()` grows a
  "rotation doesn't matter" option.)
- **Bigger reach.** `SNAP_REACH` becomes an option. For the youngest, a tap anywhere on the
  layer snaps to the nearest open ghost of that kind, with a short flight there so they see
  where it went; for older kids, two studs. The ghosts it could go in glow and bob while
  they hold one, more than they do now.
- **One kind at a time.** The tray shows one pile: the next kind to place, biggest bricks
  first. When that pile's empty the next one slides in. With one choice, there's nothing to
  choose wrong. A later "big kid" setting can show the whole layer's tray.
- **Fewer, bigger bricks.** Drop the 1×4 from the set, keep the 1×1 for the corners nothing
  else fits (the split only uses one where no bigger brick fits), and favour big bricks over
  staggered seams, which matter for strength in real bricks and not at all here. Kids'
  models are designed so most cubes fall into 2×2 and 2×4.
- **Sound for everything.** Each brick has a pop when it lands, rising in pitch through a
  layer; a layer done plays a short tune; a wrong drop is a soft boing, never `error`'s
  buzz. Optional voice cues ("Red one!", "On top!", "You built a dog!") would need
  recorded lines or the browser's speech voice; see open questions. `shared`'s synth sounds
  are a start, but these want their own set.
- **The camera looks after itself.** No orbiting by dragging the plate (it fights with
  carrying a brick), no zoom. The camera frames the layer being built, turns a little on its
  own while they think, and rises with each layer, as `rise()` does.
- **A bigger finish.** The turntable and burst stay, then the toy comes to life with a
  little animation of its own: a dog wags and hops, a car drives a loop round the plate, a
  rocket lifts off. Then it goes on a **shelf** of everything they've built, which is the
  only progress there is. Tapping a toy on the shelf plays its moment again.
- **Free building after.** Once a model's built, its bricks (or a bucket of any bricks) can
  be stacked anywhere on an empty plate, snapping to the grid with no ghost. `BrickBuild`
  doesn't cover this: it needs a small "free" model (a set of placed bricks and the heights
  under them), but the view and the brick meshes serve as they are.
- **No words in the way.** The top bar is a big Home button and nothing else. Settings,
  mute, and "start over" sit behind a parent gate: hold a button for three seconds, not a
  question to read.

## Where models come from

- **The Cubed pack** (`packages/block/src/puzzles/pack/`, 117 models). Most are too big:
  split today, the median is 52 bricks and the biggest 260. Only about 10 come in at 20 or
  under (jack, steps, car, table, sailboat, cactus, heart, chair, mushroom, wheelbarrow) and
  29 at 30 or under. Those are a first set; the rest would need a chunky version (below).
- **Dioramas** (`dioramas/harbor.json`, `park.json`) are already cut into tiles. Each tile
  could be one short build, so the park goes up a piece at a time over a week, a big shared
  scene built from little sittings.
- **Kids' own subjects**, made for it: animals (duck, cat, fish, snail, elephant), vehicles
  (car, bus, train, boat, rocket), and things they know (house, tree, flower, cake, a
  snowman). Small (about 4×4×4 to 6×6×6), chunky, two to four bright colors, each designed
  so the split gives mostly big bricks. They'd live in their own folder next to `trio/`,
  not the pack, so they don't reshuffle the dailies (as with the trio).
- **Chunky versions**, maybe: halve a pack model on each axis (a cube where most of a 2×2×2
  is filled) so big models come down to kid size without redrawing them. Worth a try on a
  few before counting on it.

Everything stays original, as the rest of the repo does: our own models, names and look.
Nothing from another game's puzzles or any toy brand's sets, characters, names, colors or
packaging. The bricks keep this game's own stud (wide, slightly tapered, with a step on
top), and the name and copy call them toy bricks or just bricks, never a brand's word for
them. Before the working title becomes a real name, it gets a trademark search.

## How it could ship

Three ways, from least to most separate. The package rules are in the
[package map](architecture.md#package-map).

1. **A route in this app** (`#/bricks/…`, loaded with `import()` like Cubed). The quickest
   to try with real kids: it can use every package, and the PWA, offline play and deploys
   are already there. But a kids' game inside a nonogram app is hard to hand to a child:
   one tap on Home and they're in a 20×20 puzzle. Fine for a prototype; not where it ends
   up.
2. **A second app in this workspace** (`apps/bricks`, its own `index.html`, PWA manifest,
   name and icon, deployed to its own site). The workspace already takes `apps/*`. Its
   kids' screen, shelf, free building, sounds and models live in the app; it imports
   `@picross/block/build/*` (the split and `BrickBuild`), `@picross/play-block`'s
   `BrickView`, and `shared`'s dom, motion, sound, haptics, storage and tokens. It never
   needs `story`, `grid` or `play-grid`, and nothing in `picross` imports it. The new app
   gets its own block in `eslint.config.js`, and the deploy scripts need a second target.
   The catch is the one in CLAUDE.md: a change to `block` or `play-block` changes all
   three games, so its tests run with theirs.
3. **Its own repo.** The packages have no build step and aren't published, so it would
   start as a copy of `build/`, `brickView.ts` and the bits of `shared` it uses, and the two
   would drift. That's how Cubed began, and it took a merge (PR #135) to bring it back.
   Worth it only if it grows into something else entirely, like a native kids' app.

**Recommended:** start as a route (1) to try it with kids, then move to its own app in the
workspace (2) once it's a game. If it grows, the brick code can come out of `block` and
`play-block` into its own pair (`packages/bricks` with no three.js, `packages/play-bricks`
with it), on the same rules the 2D and 3D pairs follow, which the build stage in Cubed
would then import too. `build/` is a good candidate: it only needs `engine/volume` and the
trio's loader.

Either way it keeps the repo's rules: three.js loads with `import()` behind a light first
screen, and no raw hex colors outside the token files. Being for kids adds a few: no ads,
accounts, links out or tracking, saves only on the device, and it works offline.

## Open questions for Austin

1. **How young, really?** 3 and 6 want different things: one kind at a time and snap from
   anywhere for 3, the full tray and some choosing for 6. One game with a setting, or pick
   one end? _Answered for now: one game and the full tray (#254), and a tap has to be on or near
   its ghost (snap from anywhere was tried first, and made the spot not matter)._
2. **Voice or no voice?** Recorded lines are warm but need a voice (yours? a kid's?) and
   don't translate; the browser's speech voice is free but varies by device and can sound
   flat. Or only sounds and music, no words at all?
3. **Free building: in the first version, or later?** It's the part kids might play
   longest, and the part with the least code to reuse.
4. **Where do the first models come from?** The ten small pack models as they are, a new
   set of 10 to 15 kids' subjects, or try chunky versions of pack models first? _Answered:
   both the pack's ten and 56 of its own (#255, #257); chunky versions are untried._
5. **Phone, tablet or both?** Little kids mostly use a parent's tablet. Landscape tablet
   first would change the layout, and the camera.
6. **Route or app first?** Is a `#/bricks` route good enough to try with kids you know, or
   should it be its own site from the start so they never land in the puzzles? _Answered:
   a route first (#252)._
7. **Should the build stage in Cubed pick any of this up?** Auto-turn and a bigger reach
   could be settings there too, or that stage stays as it is.
8. **A name.** Something of its own to replace "Brick kids", after a trademark search.
