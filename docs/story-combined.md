# The story, with both games

How the story could work now that Flat (2D) and Cubed (3D) are one game. Nothing here is
built yet; it's the design to agree on before the story code is combined (steps 5–7 of
[combining.md](combining.md)). Two ideas lead it:

1. **Bosses that switch back and forth** between a flat board and a block.
2. **Flat first, then build:** solve a picture flat to get the whole design, then build
   pieces of that design as small blocks.

## Today

- **Flat** has the story: ten chapters of jobs (Rook and Dee's odd jobs), each a path of
  fights, digs and rest stops, with scenes, Overtime runs and a boss.
- **Cubed** plays the same story on blocks: the same jobs, scenes and enemies, a 3D puzzle
  per encounter, and every enemy power rebuilt for three axes.

So the story exists twice, once per dimension. The combined game should tell it once, and
use each dimension for what it's good at.

## What each dimension is good at

|          | Flat                                                | Cubed                           |
| -------- | --------------------------------------------------- | ------------------------------- |
| Reads as | A picture, a plan, a schematic                      | An object you can hold and turn |
| Pace     | Quick: one view, clues at a glance                  | Slower: turning, peeling, depth |
| Best for | Seeing the whole design; fights with lots of powers | Building a thing; digs; finales |

That suggests a shape: **flat to understand, 3D to make.** Rook and Dee's jobs already fit
it: they fix strange broken things. First they diagram what's wrong, then they rebuild it.

## Idea 1: bosses that switch dimension

A boss phase can change the board, and switch back later:

```
Clockwork Curator  ── flat (100%–60%) ── unfolds into a block (60%–30%) ── folds flat (30%–0%)
```

- **What carries over:** the enemy's HP, phase and attack, your run's HP, shields and
  gadgets. Powers tied to the board (fog, scrambles, forgeries, targets, ink, the live
  line) are picked again on the new board, kept solvable as always.
- **Each board keeps its own progress.** When the boss folds back to flat, the flat board is
  as you left it. So switching costs time and attention, never your work, and finishing
  lines on either board chips the same HP bar.
- **What triggers a switch:**
  - Phases, at HP thresholds, like any other phase change.
  - Optionally, a **flip meter** for bosses built around it: every few finished lines the
    boss flips, the way the Weathervane turns. That fits "back and forth" best, and is
    measured in lines, never time, like every other pressure in the game.
- **How it looks:** the flat picture lifts off the grid and becomes the block's front face
  (unfolding); folding back reverses it. With reduced motion it simply swaps.
- **Difficulty:** switching is hard on its own, so a switching boss's other powers stay
  light. The Curator stays the ceiling before Insane, as it is now.

## Idea 2: flat first, then build ("blueprint" jobs)

A new kind of job built around one design:

1. **The blueprint (flat):** a big flat puzzle, 15×15 to 20×20, of the whole thing: a
   schematic of the broken generator, a robot, a ship. Solving it reveals the design.
2. **The builds (3D):** the next encounters build pieces of that design as small blocks,
   5×5×5 to 8×8×8: the head, the arm, the engine. Each piece is a region of the blueprint.
3. **Assembly:** the finished pieces snap together into the model, like a diorama, and the
   job's boss (or a final build) uses the assembled thing.

### The blueprint carries into the builds

A build's block is designed so that **its front view is its region of the blueprint.**
Wherever the blueprint has no ink, the line running straight back through the block is
empty. So the solved blueprint **carves the silhouette for you**:

- When a build starts, every line straight back from a blank blueprint cell is already
  broken away. You start from the shape's outline, and only its depth is left to solve.
- The better your blueprint (solved without hints, say), the more it carves. For example, a
  blueprint solved with hints carves only part of the silhouette, so finishing the flat
  puzzle well is a real advantage.
- The puzzle tooling checks every build stays solvable from its carved start, and still has
  something left to work out.

This is the same idea as carrying 2D progress into a boss's block (step 8 of the plan), so
the tooling for one serves both.

### Where blueprint jobs fit

Options, from smallest to largest change:

- **A. Add them:** keep the ten chapters as they are (flat jobs, with bosses that can switch)
  and add a new chapter or job type built on blueprints.
- **B. One per chapter:** each chapter's last job becomes a blueprint job building something
  that chapter is about (the generator, the museum Rex, the old engine).
- **C. Rework the arc:** each chapter is a project: a blueprint, its builds, then a boss that
  switches dimension using the thing you built.

**I'd start with A**, one blueprint job, to find out what's fun before reshaping chapters.
Then grow it into B if it works.

## Other places the two meet

- **Digs:** 3D digs read as excavation. A dig could start flat, as the surface survey of
  where things are buried, then dig in 3D.
- **Rest stops:** flat. They're short breathers, so the quicker dimension fits.
- **Daily:** alternate days, or offer both.
- **Free play:** stays separate per dimension (the Flat | Cubed switch), plus blueprint sets
  in free play once the format exists.
- **Badges:** across both, plus ones for blueprints and switching bosses.

## How it fits the data

Sketches, to be settled in steps 5–7:

```json
// A boss phase that switches the board (and a flip meter for back-and-forth bosses).
{ "at": 0.6, "board": "block", "taunt": "Flat was never my best side." }
{ "flip": 6 }

// A blueprint job: one flat design, then builds of its regions.
{
  "id": "generator-blueprint",
  "kind": "blueprint",
  "puzzle": "generator-schematic",
  "builds": [
    { "block": "generator-coil", "region": { "x": 0, "y": 0, "width": 6, "height": 7 } },
    { "block": "generator-fan", "region": { "x": 7, "y": 2, "width": 5, "height": 5 } }
  ]
}
```

Encounters keep naming a flat `puzzle`, and gain an optional `block` (the 3D version), so
any encounter can be played either way and a job can mix them.

## Questions for you

1. **Blueprint jobs:** start with one (option A), or go straight to one per chapter (B)?
2. **Carving:** should the blueprint always carve the silhouette, or carve only as much as
   you solved cleanly?
3. **Switching bosses:** switch by phase only, or have a flip meter for back-and-forth bosses?
   Which bosses should switch first? The Curator is the obvious one.
4. **The duplicated story:** once fights work on both boards, should Cubed's separate copy
   of the story go away in favor of one story that uses both?
