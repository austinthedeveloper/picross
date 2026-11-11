# Moving puzzles out of the repo

Paths here are in the 2D game's folder, `apps/picross/`.

The pack is bundled: `src/puzzles/index.ts` globs `pack/*.json` at build time, so every
puzzle ships in the JavaScript bundle and adding one means a commit and a deploy. That
was right for 22 puzzles. With a few hundred, and more to come, the content should live
outside the code. This is the plan, in steps that each stand on their own.

## Where things stand

- A puzzle is a small JSON file: `id`, `name`, `width`, `height`, `solution`, optional
  `gadget`. `parsePuzzle` validates it, and `pack.test.ts` proves every one is uniquely
  solvable.
- Saves, best times and stats are keyed by puzzle `id` (`game/progress.ts`). Ids are the
  contract: once a puzzle has shipped, its id never changes and its picture never changes.
- The daily puzzle draws from every pack puzzle 15×15 or bigger (`puzzles/daily.ts`), so
  the pool's size and order decide which puzzle lands on which day.
- `scripts/puzzle-sheet.ts` turns a text sheet of drawings into pack JSON and checks them.
  That tool is the start of a content pipeline that doesn't need the app's build.

## Step 1: one manifest, loaded at runtime (no new infrastructure)

Move the pack out of the bundle but keep it in the repo:

- A build step (`scripts/build-pack.ts`) reads `src/puzzles/pack/*.json`, runs the
  uniqueness check, and writes `public/puzzles/pack.json`: a single file with a `version`
  and the puzzle list in play order. One file, not hundreds, so it's one request.
- `puzzles/index.ts` fetches it on startup instead of globbing. The list screen shows a
  loading state for the half second it takes. Everything downstream (`puzzles`,
  `getPuzzle`, the daily, free play) stays the same shape, but async at the top.
- Run-only puzzles, encounters, runs, chapters and scenes stay bundled: they're code-adjacent
  content that changes with the mechanics.

What it buys: the bundle shrinks, and the loader is already written for step 2.

## Step 2: host the manifest outside the repo

Point the fetch at a URL per environment instead of `public/`:

- **Production:** Azure Blob Storage next to the site (`picross.z13.web.core.windows.net`
  already serves from a storage account), under `puzzles/<version>/pack.json`. Versioned
  paths make the files immutable, so they can be cached forever and a bad upload never
  overwrites a good one.
- **Dev (GitHub Pages):** the same, from a `dev` container, or the repo's `public/` copy.
- `pack.json` gets a short `Cache-Control` and points at the versioned file; the app reads
  the pointer, then the content.
- Publishing is a script (`npm run publish:pack`) that runs the checks, bumps the version,
  uploads, and flips the pointer. It runs from CI on a tag, like the site deploy.

Offline and resilience: keep the last good manifest in `localStorage` (or IndexedDB once
it's bigger than a few hundred KB) and fall back to it when the fetch fails. The bundle
keeps a small starter set so a first visit with no network still has puzzles.

## Step 3: a content repo and an authoring loop

Once hosting is settled, the drawings can leave this repo:

- A separate `picross-puzzles` repo holds sheets (`sheets/*.txt`) and the exported JSON,
  with the sheet tool and the uniqueness test as its CI. Artists work there without
  touching the game.
- Its release publishes the manifest (step 2). The game repo pins nothing; it reads
  whatever the pointer says, so new puzzles go live without a game deploy.
- The in-game editor's "Download" already produces the JSON. A later "Submit" could post
  to the content repo as a pull request.

## Rules that hold at every step

- **Ids are forever.** A published id is never reused or renamed. Removing a puzzle means
  hiding it from the list, not deleting its id, so saves and stats keep resolving.
- **Pictures are frozen.** Fixing a published puzzle (a stray pixel) must keep its clues
  solvable from any in-progress save. Prefer a new id for anything that changes the grid.
- **The daily pool is pinned.** The manifest lists `dailyPool` (ids) and a `dailySeed`
  explicitly, so adding puzzles doesn't reshuffle everyone's daily. Today the pool is
  "every big pack puzzle", and growing the pack moves the cycle.
- **Every published puzzle passed the solver.** The check runs wherever the content is
  built, never only in the game's CI.
- **Themes are metadata.** Add an optional `theme` (and `tags`) to the puzzle file so the
  list can group by theme once there's a manifest; the play order in `index.ts` goes away
  in favor of the manifest's order.

## Sizes, for scale

A 15×15 puzzle is about 500 bytes of JSON; 1,000 of them are half a megabyte uncompressed
and about 80 KB gzipped. One manifest is fine to well past a thousand puzzles. Past that,
split by theme or size and load sections on demand.
