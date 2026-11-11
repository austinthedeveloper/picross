# @picross/block

The 3D puzzle's rules and data, with no screen and no three.js: Picross Cubed
(`apps/picross/src/cubed`) is built on it, and the 2D game imports it for the Curator's
block phases. `@picross/play-block` draws it. It came out of Cubed's app (then
`apps/cubed/src`, #145).

It's plain TypeScript with no build step: each app's Vite compiles it.

## What's in it

The paths under `src/` are the ones these files had in Cubed, so
`apps/cubed/src/engine/solver.ts` is now `src/engine/solver.ts` here.

| What    | Files                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine  | `src/engine/volume.ts` (the block and its lines), `clues.ts`, `solver.ts` (the line solver)                                                                                               |
| Puzzles | `src/puzzles/format.ts` (the file format), `hide.ts`, `check.ts`, `draft.ts`, `share.ts`, `transform.ts`, `sheet.ts`, `difficulty.ts`, `daily.ts`                                         |
| Data    | `src/puzzles/pack/*.json`, `dioramas/*.json` (with `diorama.ts`, `dioramas.ts`), `story/*.json` (the story's 3D puzzles), `sheets/*.txt`; `index.ts` loads the pack                       |
| Play    | `src/game/game.ts` (a puzzle in play, `Mode`, `SavedBoard`), `battle.ts` (`Battle`: the story's `StoryBattle` on a block, #166; `battleTraces.test.ts` snapshots every fight), `clock.ts` |
| Fights  | `src/game/fightBoard.ts`: `blockFightBoard`, the block's `FightBoard` (#165), which `Battle` plays on with `BLOCK_RULES`                                                                  |
| Story   | `src/story/data.ts` (the story, from `@picross/story`, fitted to blocks; what it can't play yet), `powers.ts` (how each power is shown)                                                   |

Cubed's saves, settings, runs, daily streak and badges stay in the app, in
`apps/picross/src/cubed/game/`. Since #229 they're in the one save with the 2D game's:
`picross:v2` (free play), `picross:run` (Cubed's run as its `block`), `picross:settings`,
`picross:daily2` and `picross:badges`. Only the first-launch migration reads the old
`picross3d:` keys.

## Importing it

Each app lists `"@picross/block": "*"` in its `package.json`. Import by path, without the
extension (the `exports` map is `./*` → `./src/*.ts`):

```ts
import { solve } from '@picross/block/engine/solver';
import { Battle } from '@picross/block/game/battle';
```

## The rule: rules and data only

Both games import this package, and the 2D game loads it only for a block fight, so it
stays small and screenless. It imports only its own files (with relative paths) and the
modules of `@picross/shared` and `@picross/story` outside `ui/` and `styles/`, and never
three.js, an app or `@picross/play-block`. `src/imports.test.ts` fails on anything else (and has its own check
for three.js), and `eslint.config.js` says the same with `no-restricted-imports`.

## Puzzles

`npm run puzzles` here (`scripts/puzzles.ts`; `npm -w packages/block run puzzles` from the
root) writes `hide` and `passes` into `src/puzzles/pack/` and `story/`, and exports sheets:
`npm run puzzles -- --sheet src/puzzles/sheets/<name>.txt`. `npm run bench`
(`scripts/bench.ts`) times hiding and solving a 10×10×10 block. See Cubed's
[how-to](../../docs/cubed/how-to.md).

## Tests

`npm test` at the root runs this package's tests (`tsc --noEmit && vitest run`), with the
pack check; `npm run test:block` runs just these. The story's gate, which fails if
`src/story/data.ts` can't play an encounter or power, is `packages/story/src/boards.test.ts`.
