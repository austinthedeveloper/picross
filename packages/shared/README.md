# @picross/shared

The code, styles, story and art both games use: the 2D game (`apps/picross`) and Picross
Cubed (`apps/cubed`) import it, so a change here (a token, a sound, a scene) is in both
games at once. It replaced the copies `sync-web.mjs` used to make (#143).

It's plain TypeScript and CSS with no build step: each app's Vite compiles it, as it does
the app's own `src/`.

## What's in it

The paths under `src/` are the ones these files had in both games, so
`apps/picross/src/ui/dom.ts` is now `src/ui/dom.ts` here.

| What       | Files                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look       | `src/styles/tokens.css`, `base.css`; `run.css`, `fight.css`, `dig.css`, `dialogue.css`, `art.css`                                                                               |
| Feel       | `src/ui/sound.ts`, `haptics.ts`, `theme.ts`, `dom.ts`, `motion.ts`; `src/game/prefs.ts` (below)                                                                                 |
| Plumbing   | `src/game/storage.ts`, `src/engine/random.ts`, `src/ui/components/homeLink.ts`, `muteButton.ts`, `gameSwitch.ts`                                                                |
| Story code | `src/puzzles/scenes.ts`, `backdrops.ts`, `gadgets.ts`, `src/game/dialogue.ts`, `src/ui/art.ts`, `src/ui/components/dialogue.ts`, `backdrop.ts`, `src/ui/screens/sceneScreen.ts` |
| Story data | `src/puzzles/{scenes,backdrops,chapters,runs,encounters,run}/*.json`; `src/puzzles/files/` globs the last four for the games' loaders                                           |
| Art        | `public/art/{cast,enemies,gadgets,icons}/`                                                                                                                                      |

The story data and its loaders move to their own package, `packages/story`, in #146.

## Importing it

Each app lists `"@picross/shared": "*"` in its `package.json`; the root workspace links it
into `node_modules`. Import by path, without the extension:

```ts
import { el } from '@picross/shared/ui/dom';
import { getScene } from '@picross/shared/puzzles/scenes';
import '@picross/shared/styles/tokens.css';
```

The `exports` map: `./*` is `./src/*.ts`, `./styles/*` is `./src/styles/*` (the CSS files,
with their extension), and `./vite` is the Vite plugin below. CSS stays CSS: each app
imports the styles it uses, in its `main.ts`.

## The rule: nothing here imports from an app

Both games import this package, so it can only use its own files, with relative imports.
`src/imports.test.ts` fails on any import that leaves the package or names another package
(besides `vitest`), and `eslint.config.js` says the same with `no-restricted-imports`.

## Settings: `providePrefs`

Sound, haptics, the theme and the mute button need three settings (`muted`, `haptics`,
`highContrast`), but each game keeps its own settings, under its own storage key. So shared
code reads them from `src/game/prefs.ts`, and each game hands its settings over first thing
in its `main.ts`:

```ts
providePrefs({ get: getSettings, update: updateSettings });
```

`getPrefs()` and `updatePrefs()` then read and write the game's settings. Until a game
provides them (and in this package's tests), they're the games' defaults in memory: muted,
haptics on, normal contrast.

The 2D game also runs the 3D fight screen (from `packages/play-block`) for the Curator's
block phases. There's one copy of this package in the page, so that screen plays sounds
with the 2D game's settings.

## Art: `sharedPublic()`

Vite gives each app one `public/` folder, so the shared art lives in this package's
`public/` and a plugin adds it to each app's:

```ts
import { sharedPublic } from '@picross/shared/vite';
export default defineConfig({ plugins: [sharedPublic()] });
```

The dev server serves the files at the same URLs (`art/cast/rook.png`), and a build copies
them into the output beside the app's own `public/` files. `art.css` points at
`url('/art/icons/…')`; Vite can't check those at build time any more, so the plugin leaves
them alone (as externals) and rewrites them the way Vite writes public URLs, relative to the
CSS file (`../art/icons/…`). It's `vite.js` with a `vite.d.ts` beside it, because the
config runs in Node and the repo has no Node types.

## Tests

`npm test` at the root runs this package's tests (`tsc --noEmit && vitest run`) before both
games'. `npm run test:shared` runs just these.

## Outside this repo

The SNES demake (`../snes/picross-snes`) imports the pack, art and story with
`make import`. The pack (`pack/`, `murals/`, `index.ts`, `ratings.json`) is in
`packages/grid/src/puzzles/` (#144); the story
(`src/puzzles/{scenes,chapters,runs,encounters,run}/`) and the art (`public/art/`) are
here, so its import scripts read both packages.
