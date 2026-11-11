# @picross/play-block

Playing a block: the three.js view, input, the play screen, the story fight and editor
screens, and their styles. Picross Cubed (`apps/cubed`) builds its screens on it, and the
2D game (`apps/picross`) runs its play and fight screens for the Curator's block phases.
It came out of `apps/cubed/src` (#145). The rules it plays are `@picross/block`.

It's plain TypeScript and CSS with no build step: each app's Vite compiles it.

## What's in it

The paths under `src/` are the ones these files had in Cubed, so
`apps/cubed/src/ui/board/blockView.ts` is now `src/ui/board/blockView.ts` here.

| What    | Files                                                                                                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| View    | `src/ui/board/blockView.ts` (the three.js scene), `atlas.ts`, `input.ts`, `thumbnail.ts`; `src/ui/tokens.ts`            |
| Play    | `src/ui/screens/play.ts` (the play controller), `src/ui/components/hintMenu.ts`, `src/ui/format.ts`, `src/ui/prefs.ts`  |
| Screens | `src/ui/screens/story/fight.ts` (a fight on a block), `story/kind.ts`, `src/ui/screens/editor/` (with its check worker) |
| Styles  | `src/styles/voxels.css` (shape colors), `game.css` (the play screen), `story.css`, `editor.css`                         |
| Tests   | `e2e/helpers.ts`: browser-test helpers for a block, for both games' Playwright tests                                    |

Cubed's list, free play, tutorial, daily, dioramas, badges and story screens (board, map,
encounter, dig, rest) stay in `apps/cubed/src/ui/`: they use that app's saves and routes.

## Importing it

Each app lists `"@picross/play-block": "*"` in its `package.json`. It has `three` (and
`@types/three`), so the apps don't. The `exports` map: `./*` is `./src/*.ts`,
`./styles/*` is `./src/styles/*` (with the extension), and `./e2e/*` is `./e2e/*.ts`.

```ts
import { createPlay } from '@picross/play-block/ui/screens/play';
import '@picross/play-block/styles/voxels.css';
```

Load modules that import three.js (`ui/board/blockView.ts`, `atlas.ts`, `input.ts`, and
the screens using them) on demand, so three.js stays out of an app's first download.
`thumbnail.ts`, `format.ts` and `prefs.ts` don't import it.

## What the apps pass in

- **The run, for a fight:** `fightKind(encounter, state, { run })` takes a `FightRun`
  (your HP, gadgets and seen tips). Cubed passes its story run; the 2D game passes its own.
- **Settings, for the play screen:** `providePlayPrefs(get)` (`src/ui/prefs.ts`) hands
  over `dimDone` (fade finished clues). Cubed passes its settings in `main.ts`; the 2D game,
  which has no such setting, passes Cubed's saved one. Until then it's on.
- Sound, haptics and the theme read `@picross/shared`'s `providePrefs`, as before.

## Styles and the 2D game

The 2D game imports `voxels.css`, `game.css` and `story.css`. Both games use some of the
same class names, so its `scripts/scopeByBoard.ts` scopes `game.css` and `story.css` (by
their path in this package) to `<html data-board="block">`.

## The rule: nothing here imports from an app

`src/imports.test.ts` fails on any import that isn't the package's own, `@picross/block`,
`@picross/shared` or `three`, and `eslint.config.js` says the same with
`no-restricted-imports`.

## Tests

`npm test` at the root runs this package's tests (`tsc --noEmit && vitest run`);
`npm run test:play-block` runs just these. The view and screens are covered by both games'
browser tests (`npm run e2e`, `npm run e2e:cubed`).
