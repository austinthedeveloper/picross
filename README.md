# Picross

A nonogram (picross) puzzle game for the browser, built with Vite and TypeScript and no UI
framework. Play the latest release at **https://picross.z13.web.core.windows.net/**, or
the current `main` at https://austinthedeveloper.github.io/picross/.

Fill cells so each row and column matches its clue numbers, and a pixel picture appears.

- 462 handmade free-play puzzles from 5×5 to 20×20 (mostly 15×15 and up), each checked to have one solution reachable without
  guessing
- Mouse, touch, and keyboard play: drag to paint lines, right-click or the Mark tool to place
  X's, pinch to zoom
- Relaxed or Hearts mode, hints, undo/redo, a timer and stats, and saved progress
- Clue feedback, animations and sound, a high-contrast theme, and screen-reader support
- A puzzle editor for making new puzzles

## Quick start

Requires Node 20+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command                        | What it does                                                          |
| ------------------------------ | --------------------------------------------------------------------- |
| `npm run dev`                  | Dev server with hot reload and the debug tools                        |
| `npm run dev:prod`             | Dev server without the debug tools                                    |
| `npm test`                     | Unit tests (Vitest), including the puzzle pack uniqueness check       |
| `npm run test:watch`           | Tests in watch mode                                                   |
| `npm run check:puzzles`        | Only the puzzle pack uniqueness check                                 |
| `npm run rate:puzzles`         | Re-rate puzzle difficulty after adding or changing puzzles            |
| `npm run script-review`        | Generate the script review site and serve it at http://localhost:4177 |
| `npm run script-review:notes`  | Print your open script review notes                                   |
| `npm run script-review:export` | Export the whole script and open notes as JSON for rewriting          |
| `npm run lint`                 | ESLint plus a Prettier format check                                   |
| `npm run format`               | Format everything with Prettier                                       |
| `npm run build`                | Type-check and build to `dist/`                                       |
| `npm run build:dev`            | The same, with the debug tools, to `dist-dev/`                        |
| `npm run check:bundle`         | Fails if debug code reached `dist/`                                   |
| `npm run preview`              | Serve the production build locally                                    |
| `npm run e2e`                  | Browser tests (Playwright, phone-sized) against the build             |

## Docs

- [Architecture](docs/architecture.md): where everything lives and how a move flows through
  the code
- [Development](docs/development.md): running, testing, CI and deploys, branches and stacked PRs
- [How-to guides](docs/how-to.md): add a puzzle, screen, setting, sound, animation, or game rule
- [Art direction](docs/art-direction.md): the look and feel, palette, type, and mood board
- [Files the 3D game shares](docs/shared-files.md): what [Picross Cubed](https://github.com/austinthedeveloper/picross-3d) copies from here
