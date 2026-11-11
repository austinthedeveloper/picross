# Picross Cubed

A 3D picross puzzle game for the browser, built with Vite, TypeScript and three.js: the 3D
half of [Picross](../../README.md), in the same app under `#/cubed` (the Flat | Cubed switch
on the home screen). It used to be its own repo, austinthedeveloper/picross-3d, then the
`apps/cubed` workspace; its old address, `/3d/`, sends links and bookmarks on.

Every puzzle is a block of cubes with a shape hidden inside. The number on a face counts the
cubes of the shape in the line running into that face; a circle means they're in two pieces,
a square three or more. Break away everything that isn't the shape and it's revealed in color.

- 85 handmade puzzles from 3×3×3 up to 15 cubes long, each checked to be solvable without
  guessing, banded Easy to Expert, with filters. Themed sets: around the house and garden,
  the dungeon, the evil lab, the museum after hours, dinosaurs and fossils, deep water and
  haunted
- A guided tutorial, and a hint menu that works out a line or checks for mistakes
- An editor: draw a shape layer by layer, check it can be solved, play-test it, share a link
- Story mode: the 2D game's ten chapters of jobs, scenes and bosses, on blocks, with every
  enemy power rebuilt for a block
- A daily puzzle with a streak, dioramas that fill in piece by piece, and badges
- Break and Paint tools, drag strokes along a layer, turn and zoom with a drag or a pinch
- Peel layers off either end of each axis to see inside; snap to front, side or top
- Relaxed or Hearts mode, hints, undo/redo, a timer and best times, saved progress
- Keyboard play, screen-reader descriptions of each cube, high contrast, haptics

## Running it

It's part of the app: `npm run dev` at the repo root, then open http://localhost:5173/#/cubed.
The commands are the root's (see [development.md](../development.md#scripts)); the ones
that are only Cubed's:

| Command                              | What it does                                           |
| ------------------------------------ | ------------------------------------------------------ |
| `npm run e2e:cubed`                  | Only Cubed's browser tests (`apps/picross/e2e/cubed/`) |
| `npm -w packages/block run puzzles`  | Check the pack and pick which clues new puzzles hide   |
| `npm -w apps/picross run screenshot` | Screenshot a page of the running dev server            |

The timing test (`e2e/cubed/perf.spec.ts`) runs alone after the other browser tests, so they
don't share its CPU. To run just it: `npm run e2e -- --project cubed-perf --no-deps`.

## Docs

Start with the [package map](../architecture.md#package-map): where every file lives and
what it may import.

- [Architecture](architecture.md): the layers, the block, the view, the screens
- [How-to guides](how-to.md): add a puzzle, a color, a sound
- [Shared package](../../packages/shared/README.md): the code, styles and art shared with the 2D game, and the [story package](../../packages/story/README.md)
- [Block](../../packages/block/README.md) and [play-block](../../packages/play-block/README.md) packages: this game's puzzle rules and data, and its three.js view and screens
- [Story mode](story.md): how the 2D story is shared, fitted to blocks, and gated
- [Roadmap](roadmap.md): what's carried over from the 2D game so far, and what's next
- [Real-device checklist](device-checklist.md) and [release notes](releases/)
- [Combining with the 2D game](../combining.md): the plan for one game, with bosses that switch dimension

The look follows the 2D game's [art direction](../art-direction.md); the shape colors are in
`packages/play-block/src/styles/voxels.css`.
