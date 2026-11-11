# @picross/grid

The 2D game's puzzles with nothing of the page in them: the engine (grids, clues, the
line solver, and the fight mechanics' pure parts), the puzzle file format, the free-play
pack and murals, and `Game`, the rules of one puzzle in play. The 2D game
(`apps/picross`) and its play screen (`@picross/play-grid`) import it. It came out of
`apps/picross/src` in #144.

It's plain TypeScript with no build step: each app's Vite compiles it.

## What's in it

The paths under `src/` are the ones these files had in the 2D game, so
`apps/picross/src/engine/solver.ts` is now `src/engine/solver.ts` here.

| What    | Files                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine  | `src/engine/`: `board`, `clues`, `history`, `lines`, `solver`, `transform`, `blast`, `charge`, `fakes`, `ink`, `swap`                                           |
| Puzzles | `src/puzzles/format.ts` (the file format, parse and validate, export helpers)                                                                                   |
| Pack    | `src/puzzles/index.ts` (loads `pack/*.json` and the story's run puzzles from `@picross/story`; `ORDER`), `pack/`, `sheets/`, `ratings.json` and `difficulty.ts` |
| Murals  | `src/puzzles/murals.ts`, `murals/*.json`                                                                                                                        |
| Play    | `src/game/game.ts`: `Game` (board, history, hearts, hints, clock) and its save format, `SavedBoard`                                                             |
| Debug   | `src/debug/hooks.ts`: how the debug panel (in the app) reaches into a board in play                                                                             |

`pack.test.ts` checks every pack and run puzzle is uniquely solvable without guessing
(`npm run check:puzzles` runs only that), and `difficulty.test.ts` keeps `ratings.json` in
step with the pack (`npm run rate:puzzles`, a script in the app, rewrites it).

The app keeps what needs its game layer: fights (`game/battle.ts`), runs, saves and
settings, the daily puzzle, badges and ranks. Its `game/progress.ts` and `game/settings.ts`
re-export `SavedBoard` and `Mode` from here, so they're still where the app looks.

## Importing it

The 2D game lists `"@picross/grid": "*"` in its `package.json`. Import by path, without
the extension:

```ts
import { solve } from '@picross/grid/engine/solver';
import { getPuzzle } from '@picross/grid/puzzles/index';
import { Game } from '@picross/grid/game/game';
```

The `exports` map is `./*` → `./src/*.ts`.

## The rule: nothing from the page

It can be loaded, tested and run anywhere: Node, a worker, a build script. So it uses only
its own files (with relative imports) and the pure modules of `@picross/shared` and
`@picross/story` (the gadget catalog and the run puzzles; never their `ui/` or styles), and
never an app or `@picross/play-grid`. Three checks:

- `tsconfig.json` leaves out the DOM types, so `document` or `HTMLElement` don't compile.
  (`debug/hooks.ts` names the two `localStorage` methods it uses; only debug builds call
  them.)
- `vitest.config.ts` runs every test in Node, and `src/node.test.ts` loads every module
  there and plays a pack puzzle.
- `src/imports.test.ts` fails on an import that leaves the package or isn't allowed, and
  `eslint.config.js` says the same with `no-restricted-imports`.

## Tests

`npm test` at the root runs this package's tests (`tsc --noEmit && vitest run`) after
shared's. `npm run test:grid` runs just these.

## Outside this repo

The SNES demake (`../snes/picross-snes`) imports the pack with `make import`. It's here
now: `src/puzzles/index.ts` (for `ORDER`), `ratings.json`, `pack/` and `murals/`.
