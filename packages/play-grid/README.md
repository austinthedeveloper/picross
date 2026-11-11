# @picross/play-grid

The 2D game's play screen: the board view, pointer, keyboard and zoom input, and the screen
that plays one puzzle through a `PlaySession`, with their styles. It's the DOM side of
`@picross/grid`. The 2D game (`apps/picross`) imports it. It came out of
`apps/picross/src` in #144.

It's plain TypeScript and CSS with no build step: each app's Vite compiles it.

## What's in it

The paths under `src/` are the ones these files had in the 2D game, so
`apps/picross/src/ui/board/boardView.ts` is now `src/ui/board/boardView.ts` here.

| What        | Files                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Board       | `src/ui/board/`: `boardView` (clues and cells, dimming, fog and the rest), `input`, `keyboard`, `zoom`, `picture`          |
| Play screen | `src/ui/screens/gameScreen.ts`: `renderGameScreen` and the `PlaySession` hooks (`BoardControls`, `EndState`)               |
| Its parts   | `src/ui/components/endPanels.ts`, `hintMenu.ts`, `zoomBar.ts`; `src/ui/format.ts` (`formatTime`, `plural`, `lineName`)     |
| Styles      | `src/styles/board.css` (board, clues, cells, cursor, fog and scramble), `game.css` (toolbar, hint menu, tools, end panels) |

## Importing it

The 2D game lists `"@picross/play-grid": "*"` in its `package.json`. Import by path,
without the extension; CSS keeps its extension:

```ts
import { renderGameScreen, type PlaySession } from '@picross/play-grid/ui/screens/gameScreen';
import { createBoardView } from '@picross/play-grid/ui/board/boardView';
import '@picross/play-grid/styles/board.css';
```

The `exports` map: `./styles/*` is `./src/styles/*` and `./*` is `./src/*.ts`. The app
imports the styles in its `main.ts`, in the same place in the cascade as before. Its
`scripts/scopeByBoard.ts` scopes `board.css` and `game.css` to the flat board, as it does
the app's own screen styles.

## The rule: never the app

It imports its own files (with relative imports), `@picross/grid` and `@picross/shared`.
`src/imports.test.ts` fails on anything else, and `eslint.config.js` says the same with
`no-restricted-imports`.

What the screen needs from the app comes in through the `PlaySession` the app passes to
`renderGameScreen(app, puzzle, session)`: where the board is saved, what solving it does,
and a fight's or a dig's hooks. Free play's session (`freePlaySession`, with its saves,
best times, ranks and "Next") stays in the app, and the app's `main.ts` passes it in; it
used to be the screen's default.

Two things it still assumes about the app: the end panels' "All puzzles" link goes to
`#/` (as the shared Home button does), and the debug panel reaches the board through
`@picross/grid/debug/hooks`.

## Tests

`npm test` at the root runs this package's tests (`tsc --noEmit && vitest run`, in jsdom)
after grid's. `npm run test:play-grid` runs just these. The screen itself is tested in the
browser, by the 2D game's Playwright tests (`npm run e2e`).
