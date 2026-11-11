# @picross/shared

The code, styles and art both games use: the 2D game and Picross Cubed (both in
`apps/picross`) import it, so a change here (a token, a sound, a portrait) is in both games
at once. It replaced the copies `sync-web.mjs` used to make (#143). The story is in its own
package, `@picross/story` (`packages/story`, #146), which imports this one.

It's plain TypeScript and CSS with no build step: each app's Vite compiles it, as it does
the app's own `src/`.

## What's in it

The paths under `src/` are the ones these files had in both games, so
`apps/picross/src/ui/dom.ts` is now `src/ui/dom.ts` here.

| What     | Files                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Look     | `src/styles/tokens.css`, `base.css`; `run.css`, `fight.css`, `dig.css`, `dialogue.css`, `art.css`                                     |
| Feel     | `src/ui/sound.ts`, `haptics.ts`, `theme.ts`, `dom.ts`, `motion.ts`, `format.ts` (`formatTime`, `plural`); `src/game/prefs.ts` (below) |
| Plumbing | `src/game/storage.ts`, `src/engine/random.ts`, `src/ui/components/homeLink.ts`, `muteButton.ts`, `gameSwitch.ts`                      |
| Ids      | `src/puzzles/ids.ts`: `qualify` and `parseId`, puzzle ids with a dimension (below)                                                    |
| Art      | `src/ui/art.ts` (portraits, sprites, gadgets and power glyphs, with emoji stand-ins); `public/art/{cast,enemies,gadgets,icons}/`      |

The story's data, loaders, dialogue and scene player moved to `packages/story` (#146).
The art and the story's styles stayed here: they don't read the story, and every screen
uses them.

## Importing it

Each app lists `"@picross/shared": "*"` in its `package.json`; the root workspace links it
into `node_modules`. Import by path, without the extension:

```ts
import { el } from '@picross/shared/ui/dom';
import { portraitArt } from '@picross/shared/ui/art';
import '@picross/shared/styles/tokens.css';
```

The `exports` map: `./*` is `./src/*.ts`, `./styles/*` is `./src/styles/*` (the CSS files,
with their extension), and `./vite` is the Vite plugin below. CSS stays CSS: each app
imports the styles it uses, in its `main.ts`.

## The rule: nothing here imports from an app or another package

Both games and every package import this one (the story included), so it can only use its
own files, with relative imports.
`src/imports.test.ts` fails on any import that leaves the package or names another package
(besides `vitest`), and `eslint.config.js` says the same with `no-restricted-imports`.

## Settings: `providePrefs`

Sound, haptics, the theme and the mute button need three settings (`muted`, `haptics`,
`highContrast`), but each game keeps its own settings, under its own storage key. So shared
code reads them from `src/game/prefs.ts`, and each game hands its settings over before it
draws: the 2D game in `main.ts`, Cubed in its `routes.ts` whenever one of its routes opens
(and `main.ts` hands the 2D game's back after):

```ts
providePrefs({ get: getSettings, update: updateSettings });
```

`getPrefs()` and `updatePrefs()` then read and write the game's settings. Until a game
provides them (and in this package's tests), they're the games' defaults in memory: muted,
haptics on, normal contrast.

The 2D game also runs the 3D fight screen (from `packages/play-block`) for the Curator's
block phases. There's one copy of this package in the page, so that screen plays sounds
with the 2D game's settings.

## Puzzle ids with a dimension: `qualify`, `parseId`

Both packs have a `mug` (and 45 more ids besides). Where the two games meet (one list, one
save, one daily), an id says which game it's from, with `src/puzzles/ids.ts` (#147):

```ts
import { parseId, qualify, type Dimension } from '@picross/shared/puzzles/ids';
qualify('grid', 'mug'); // 'grid:mug': the 2D puzzle
qualify('block', 'mug'); // 'block:mug': the 3D one
parseId('block:mug'); // { dimension: 'block', id: 'mug' }
```

`Dimension` is `'grid' | 'block'`, and `QualifiedId` the `grid:…` or `block:…` string.
`parseId` throws on a bare id (`mug`): where code reads qualified ids, a missing prefix is the
bug, so it doesn't guess. Code holding a bare id knows its game and calls `qualify`. It also
throws on an unknown dimension or an empty id, and both functions refuse an id with a `:` in
it, so every id round-trips.

Content files don't change: a puzzle file keeps `"id": "mug"`, so the sheets, the SNES import
and share links keep working, and the prefix is added where a pack meets the other. Saves keep
bare ids until the save merge (#155). `apps/picross/src/puzzles/ids.test.ts` round-trips every
id in both packs and lists the ids they share, so a new clash shows up in review. The 3D
story puzzles share their 2D run puzzles' ids on purpose, and four of them (`anglerfish`,
`bat`, `octopus`, `rex-skull`) are also in the 3D free-play pack, so `block:bat` alone
doesn't yet say which.

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
`make import`. The art is here, in `public/art/`; the pack (`pack/`, `murals/`, `index.ts`,
`ratings.json`) is in `packages/grid/src/puzzles/` (#144), and the story
(`src/puzzles/{scenes,backdrops,chapters,runs,encounters,run}/`) in `packages/story` (#146).
