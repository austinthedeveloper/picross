# Picross Cubed

A 3D picross puzzle game for the browser, built with Vite, TypeScript and three.js. It's the
3D sibling of [Picross](https://github.com/austinthedeveloper/picross) (the 2D web game) and
shares its look, sounds and settings. Play the current `main` at
**https://austinthedeveloper.github.io/picross-3d/**.

Every puzzle is a block of cubes with a shape hidden inside. The number on a face counts the
cubes of the shape in the line running into that face; a circle means they're in two pieces,
a square three or more. Break away everything that isn't the shape and it's revealed in color.

- 37 handmade puzzles from 3×3×3 to 9×8×9, each checked to be solvable without guessing,
  banded Easy to Expert, with filters
- A guided tutorial, and a hint menu that works out a line or checks for mistakes
- An editor: draw a shape layer by layer, check it can be solved, play-test it, share a link
- Story mode: the 2D game's ten chapters of jobs, scenes and bosses, on blocks
- Break and Paint tools, drag strokes along a layer, turn and zoom with a drag or a pinch
- Peel layers off either end of each axis to see inside; snap to front, side or top
- Relaxed or Hearts mode, hints, undo/redo, a timer and best times, saved progress
- Keyboard play, screen-reader descriptions of each cube, high contrast, haptics

## Quick start

Requires Node 20+.

```bash
npm install
npm run dev
```

Then open http://localhost:5174 (the 2D game's dev server keeps 5173).

| Command                | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                            |
| `npm test`             | Unit tests (Vitest), including the solvability check for every puzzle |
| `npm run e2e`          | Browser tests (Playwright, phone-sized) against the production build  |
| `npm run lint`         | ESLint plus a Prettier format check                                   |
| `npm run format`       | Format everything with Prettier                                       |
| `npm run build`        | Type-check and build to `dist/`                                       |
| `npm run puzzles`      | Check the pack and pick which clues new puzzles hide                  |
| `npm run sync:web`     | Copy the shared files from the 2D game in `../picross`                |
| `npm run check:shared` | Fail if a shared file was edited here                                 |
| `npm run screenshot`   | Screenshot a page of the running dev server                           |

## Docs

- [Architecture](docs/architecture.md): the layers, the files, and how a stroke flows
- [How-to guides](docs/how-to.md): add a puzzle, a color, a sound
- [Shared files](docs/shared-files.md): what comes from the 2D game and how to update it
- [Story mode](docs/story.md): how the 2D story is shared, fitted to blocks, and gated
- [Roadmap](docs/roadmap.md): what's carried over from the 2D game so far, and what's next

The look follows the 2D game's [art direction](https://github.com/austinthedeveloper/picross/blob/main/docs/art-direction.md);
the shape colors are in `src/styles/voxels.css`.
