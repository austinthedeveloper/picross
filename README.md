# Picross

A nonogram (picross) puzzle game for the browser, built with Vite and TypeScript and no UI
framework. Play it at **https://austinthedeveloper.github.io/picross/**.

Fill cells so each row and column matches its clue numbers, and a pixel picture appears.

- 12 handmade puzzles from 5×5 to 15×15, each checked to have one solution reachable without
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

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload                                      |
| `npm test`              | Unit tests (Vitest), including the puzzle pack uniqueness check |
| `npm run test:watch`    | Tests in watch mode                                             |
| `npm run check:puzzles` | Only the puzzle pack uniqueness check                           |
| `npm run lint`          | ESLint plus a Prettier format check                             |
| `npm run format`        | Format everything with Prettier                                 |
| `npm run build`         | Type-check and build to `dist/`                                 |
| `npm run preview`       | Serve the production build locally                              |

## Docs

- [Architecture](docs/architecture.md): where everything lives and how a move flows through
  the code
- [Development](docs/development.md): running, testing, CI and deploys, branches and stacked PRs
- [How-to guides](docs/how-to.md): add a puzzle, screen, setting, sound, animation, or game rule
