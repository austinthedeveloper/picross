# Development

## Setup

Requires Node 20+ (CI uses Node 20).

```bash
npm install
npm run dev        # http://localhost:5173, hot reload
```

`.claude/launch.json` starts the same dev server from Claude Code's preview pane.

The repo root is an npm workspace with two apps and six packages: the 2D game is
`apps/picross/` (workspace `picross`), Picross Cubed is `apps/cubed/` (`picross-3d`), and
the code they share is in `packages/` (`@picross/shared`, `story`, `grid`, `play-grid`,
`block` and `play-block`). [The package map](architecture.md#package-map) says what each
owns and may import. One `npm install` at the root sets up everything. Run the scripts below
from the root: the app ones delegate with `npm -w apps/picross run …` or
`npm -w apps/cubed run …`, and the trailing `--` passes arguments on
(`npm run dev -- --port 5173`). Paths like `src/` and `e2e/` on this page are in
`apps/picross/`; `scripts/` and `dist/` are at the root unless the page says otherwise.

## Scripts

| Command                        | What it does                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `npm run dev`                  | The 2D game's Vite dev server (http://localhost:5173)                        |
| `npm run dev:prod`             | The same, without the debug tools                                            |
| `npm run dev:cubed`            | Cubed's dev server (http://localhost:5174)                                   |
| `npm test`                     | Every unit test once: the six packages, then both games (see below)          |
| `npm run test:shared`          | Only `packages/shared`'s tests                                               |
| `npm run test:story`           | Only `packages/story`'s, with the story gate                                 |
| `npm run test:grid`            | Only `packages/grid`'s                                                       |
| `npm run test:play-grid`       | Only `packages/play-grid`'s                                                  |
| `npm run test:block`           | Only `packages/block`'s, with Cubed's pack check                             |
| `npm run test:play-block`      | Only `packages/play-block`'s                                                 |
| `npm run test:flat`            | Only the 2D game's (`apps/picross`)                                          |
| `npm run test:cubed`           | Only Cubed's (`apps/cubed`)                                                  |
| `npm run test:watch`           | The 2D game's tests in watch mode                                            |
| `npm run check:puzzles`        | Only the 2D pack uniqueness check (`packages/grid/src/puzzles/pack.test.ts`) |
| `npm run rate:puzzles`         | Re-rate puzzle difficulty after adding or changing puzzles                   |
| `npm run script-review`        | Generate the script review site and serve it at http://localhost:4177        |
| `npm run script-review:notes`  | Print your open script review notes                                          |
| `npm run script-review:export` | Export the whole script and open notes as JSON for rewriting                 |
| `npm run lint`                 | ESLint (with the import rules), then `prettier --check`                      |
| `npm run format`               | `prettier --write .`                                                         |
| `npm run build`                | Type-check and build both games: Flat to `dist/`, Cubed to `dist/3d/`        |
| `npm run build:dev`            | The same, with the debug tools, to `dist-dev/` (what GitHub Pages serves)    |
| `npm run check:bundle`         | Fails if debug code reached `dist/`                                          |
| `npm run check:budget`         | Fails if three.js is in either first download, or it grew past the budget    |
| `npm run preview`              | Serve `dist/` locally                                                        |
| `npm run e2e`                  | The 2D game's browser tests                                                  |
| `npm run e2e:cubed`            | Cubed's browser tests                                                        |

Cubed has two scripts of its own, run with `npm -w apps/cubed run …`: `puzzles` (check the
pack and pick which clues new puzzles hide) and `screenshot` (see
[cubed/how-to.md](cubed/how-to.md)).

## Testing

### Unit tests

Tests live next to their code as `*.test.ts`. Each workspace runs its own with Vitest (the
packages first type-check with `tsc --noEmit`), and `npm test` runs them all in the order
below. Most run in jsdom, so `localStorage` and basic DOM work; `packages/grid`'s run in
Node, with no DOM at all.

| Suite (run alone)         | Where                     | Covers                                                                                                      |
| ------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run test:shared`     | `packages/shared/src`     | Prefs, puzzle ids, haptics, art, the import rule                                                            |
| `npm run test:story`      | `packages/story/src`      | Scenes, backdrops, dialogue, runs and chapters; the whole story loads (`story.test.ts`); the gate           |
| `npm run test:grid`       | `packages/grid/src`       | The 2D engine (grids, clues, history, solver, powers), format, murals, ratings, `Game`, pack uniqueness     |
| `npm run test:play-grid`  | `packages/play-grid/src`  | The board view, time formatting                                                                             |
| `npm run test:block`      | `packages/block/src`      | The 3D engine and solver, `Game`, `Battle`, the clock, puzzles, the editor's checks, the story on blocks    |
| `npm run test:play-block` | `packages/play-block/src` | Formatting                                                                                                  |
| `npm run test:flat`       | `apps/picross`            | Saves, settings, badges, rank, runs, fights, enemies, Endless, the daily, the ids both packs share, scripts |
| `npm run test:cubed`      | `apps/cubed/src`          | Saves, the run, the daily, badges                                                                           |

Every package also has `src/imports.test.ts`, which fails on an import its rule doesn't
allow (see the package map). The story's gate (`packages/story/src/boards.test.ts`) prints
which boards can play each encounter and power, and fails only on broken data.

Put new rules in `engine/` or `game/` and test them there. The UI modules are thin and are
checked in the browser instead.

`progress.ts` and `settings.ts` read storage once at import. Their tests call
`vi.resetModules()` and re-import to simulate a reload (see `game/progress.test.ts`).

### Browser tests

Each game has its own Playwright suite in its `e2e/`: `npm run e2e` for the 2D game
(`apps/picross/e2e/`) and `npm run e2e:cubed` for Cubed (`apps/cubed/e2e/`). Both run the
production build (`vite preview`) on a phone-sized touch screen with reduced motion, so
animations don't slow them down:

```bash
npm run e2e                                  # all of them
npm run e2e -- e2e/fights.spec.ts            # one file
npm run e2e -- --ui                          # watch them run
```

Locally they use your installed Chrome. CI installs Playwright's Chromium and uploads an
HTML report (`apps/picross/playwright-report`) when something fails. To debug a failure, run
`npx playwright show-trace apps/picross/test-results/<test>/trace.zip`.

| File                     | Covers                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `free-play.spec.ts`      | Sizes smallest first, the list filter, "Next", sound off by default, solving and the end screen, drag, undo, Hearts and Retry, hints, keyboard play   |
| `how-to-play.spec.ts`    | The tutorial from the first step to Solved: nudges, going back a step, the tool prompt, and that it records nothing                                   |
| `runs.spec.ts`           | Jobs board and chapters, the full First Job (intro once, sign-off, stats), knockouts, rest stops in time and late                                     |
| `fights.spec.ts`         | One test per mechanic: fog, gremlin waves, Mimic swaps, Owl scramble, Forger call-outs, Beetle armor, gadgets, Eel charge, Cuttlefish ink, power tips |
| `night-shift.spec.ts`    | The whole Night Shift from the jobs board to the Museum Rex                                                                                           |
| `later-chapters.spec.ts` | Every job from the Glasshouse to Closing Time, each from its chapter opening to its boss                                                              |
| `deep-end.spec.ts`       | The whole Deep End from the chapter 3 opening to Old Tess                                                                                             |
| `endless.spec.ts`        | Endless mode: unlocking, healing after a fight, the map moving on, best depth                                                                         |
| `daily.spec.ts`          | The daily puzzle and its streak across days (fixed clock; solved from the clues on screen)                                                            |
| `murals.spec.ts`         | A mural filling in tile by tile, the last tile, and the finished picture                                                                              |
| `debug.spec.ts`          | The debug tools, against a dev build (project `dev`, port 4174)                                                                                       |
| `editor-zoom.spec.ts`    | Editor uniqueness check and export, pinch zoom                                                                                                        |
| `overtime.spec.ts`       | Overtime: hidden until its job is cleared, always Hits on, and every job's can be finished                                                            |
| `boss-fights.spec.ts`    | Standalone boss fights: the Weathervane waits for Summit Station, then plays from its card                                                            |
| `badges.spec.ts`         | Rank and badges: the ladder, rank-ups, and job badges by tier                                                                                         |
| `switching-boss.spec.ts` | The Curator unfolding into a block and folding back flat                                                                                              |
| `games.spec.ts`          | The Flat \| Cubed switch, and a 3D puzzle on the combined site                                                                                        |

`e2e/helpers.ts` has the building blocks:

- `seed()` puts saved runs or settings in place before the app loads.
- `runAt()` starts straight at one encounter.
- `solution()` and `encounterSolution()` read answers from the content JSON.
- `solve()` sets every cell to the answer, repeating while enemies move rows around.
- `press()` taps a button or link by its accessible name.

When you add an enemy mechanic, add a test to `fights.spec.ts`.

Still worth a manual look before a release: light and dark themes, high contrast, and pinch
on a real phone.

To start from a clean slate, clear the site's local storage in devtools (Application →
Local Storage).

Cubed's suite (`apps/cubed/e2e/`) covers free play, the tutorial, the editor, the daily and
badges, the story (`story.spec.ts`, `fights.spec.ts`, `chapters.spec.ts`; see
[cubed/story.md](cubed/story.md)), and offline play. Its timing test (`perf.spec.ts`) runs
alone after the others, so they don't share its CPU; to run just it,
`npm run e2e:cubed -- perf.spec.ts --no-deps`. The block helpers both games' tests use are
in `packages/play-block/e2e/helpers.ts`.

## Both games

`npm run build` puts Cubed in `dist/3d` (and `build:dev` in `dist-dev/3d`), where the Flat |
Cubed switch links to it. In dev, the switch links between the two dev servers
(`npm run dev` and `npm run dev:cubed`). A change in a package is in both games at once,
so run both games' tests after one.

## CI and deploys

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm test`: every package, then both games, including the uniqueness check for every
   puzzle
4. `npm run build`, then `npm run check:bundle` (no debug code in production) and
   `npm run check:budget` (the first download's budget, below)
5. A separate `e2e` job runs both games' Playwright tests (`npm run e2e`, then
   `npm run e2e:cubed`).

**The bundle budget** (#148). `npm run check:budget` (`scripts/check-bundle-budget.mjs`)
reads each game's Vite manifest (`dist/.vite/manifest.json`, `dist/3d/.vite/manifest.json`)
and takes the entry chunk with everything it imports statically: what a player downloads
before the home screen. It fails if any of it contains three.js (it looks for `__THREE__`
and `THREE.WebGLRenderer`, strings only three.js has, and checks it still finds them in the
lazy chunk), or if its gzipped JS or CSS is more than 10% over `scripts/bundle-budget.json`.
Only the block screens use three.js, and they're loaded with `import()`: the 2D game's
`blockFight` and Cubed's play screen. A static import of `@picross/play-block` anywhere on
the way to the home screen puts about 140 kB (gzipped) of three.js in front of every player,
and the check names the chunk and the import path. To raise a budget, change its number in
`scripts/bundle-budget.json` and say why in the commit. It runs in CI and before each Azure
deploy, after `check:bundle`.

The budgets, measured when the check went in (gzipped, each file on its own):

| Game          | Entry JS | Entry CSS | Lazy three.js chunk                    |
| ------------- | -------- | --------- | -------------------------------------- |
| Picross (2D)  | 159.0 kB | 10.0 kB   | `blockFight`: 177.0 kB (three + fight) |
| Picross Cubed | 87.0 kB  | 7.2 kB    | `input`: 136.7 kB (three)              |

There are two sites, one per environment:

| Site                                                          | Environment    | Deploys from         | Build               | Debug tools |
| ------------------------------------------------------------- | -------------- | -------------------- | ------------------- | ----------- |
| [GitHub Pages](https://austinthedeveloper.github.io/picross/) | **Dev**        | Every push to `main` | `npm run build:dev` | Yes         |
| [Azure](https://picross.z13.web.core.windows.net/)            | **Production** | Release tags         | `npm run build`     | None        |

Azure is covered below. The dev site is public, so anyone with its URL gets the tools.
That's fine for now, because nothing links to it and nothing it does can affect production. Vite builds with `base: './'`, so the same build works under GitHub Pages'
`/picross/` path and at the Azure site's root.

## Debug tools (dev builds)

Dev builds have a **🐞 DEV** button in the bottom corner and "DEV" in the page title
(#65). It opens a drawer for exploring the game without being locked:

- **Player:** infinite health (HP and hearts).
- **This board:** solve it, take 10 HP off the enemy, or force its next phase.
- **Jump:** go to any job and node, or win or lose the current run.
- **Gadgets:** grant any gadget.
- **Scenes:** play any scene.
- **Saves:** unlock everything, or reset everything.

**How it stays out of production.** `apps/picross/.env.development` sets `VITE_DEBUG=1`, so
`npm run dev` and `npm run build:dev` get the tools, and `npm run build` doesn't. Everything
lives in `src/debug/`. The panel is a dynamic import behind that flag in `main.ts`, and the
few places the game exposes something for it (`src/debug/hooks.ts`) sit behind
`import.meta.env.VITE_DEBUG === '1'`, so Vite drops all of it from a production build.
`npm run check:bundle` greps `dist/` to prove it, in CI and before each Azure deploy.

**To add a tool,** add a button in `src/debug/panel.ts`. If it needs something inside the
game, add it to `debug` in `hooks.ts` and set it behind the same check. Keep that exact
check at each spot: a shared constant may not get dropped from the build. Anything that
navigates should go through `go()`, which leaves the game screen first so its save on
the way out can't land on the new run.

## Azure deployment (releases)

Releases deploy to an Azure Storage static website:
**https://picross.z13.web.core.windows.net/**

| Piece          | Where                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| Resource group | `picross` (eastus)                                                                      |
| Storage        | Account `picross`, static website on, `index.html` as index and 404 page                |
| Upload script  | `scripts/deploy-azure.sh`: hashed `assets/` cached a year, then `no-cache` `index.html` |
| Pipeline       | `.github/workflows/deploy-azure.yml`                                                    |
| Identity       | App registration `picross-github-deploy`, signed in through GitHub OIDC                 |

**To release:** create a GitHub release with a new `v*` tag, for example
`gh release create v0.2.0 --generate-notes`. Publishing it runs **Deploy to Azure**,
which checks out the tag, lints, tests, builds, and uploads. Pre-releases don't deploy.
To redeploy without a new release, use **Run workflow** on the Actions tab, picking a
tag or `main`.

**Manual deploy** from your machine (Azure CLI logged in):

```bash
npm run build
AZ_AUTH_MODE=key ./scripts/deploy-azure.sh picross
```

`AZ_AUTH_MODE=key` uses the storage account key, which your account can read as an
owner. Without it, the script signs in with your Azure AD user, which needs the
"Storage Blob Data Contributor" role on the account.

**One-time pipeline setup** (run once, and again if anything is recreated): `scripts/setup-azure-deploy.sh`. It creates the app registration and a
federated credential that trusts only this repo's `production` environment. It
grants the app Storage Blob Data Contributor and Reader on the storage account only,
creates the GitHub `production` environment (deployable from `v*` tags and `main`
only), and stores the client, tenant, and subscription IDs and the account name as
environment variables. No Azure secret is stored in GitHub.

Old hashed assets stay in the container after a deploy, so anyone mid-session keeps
working. They're small. Clear them out occasionally if you like.

## Branches and stacked PRs

`main` is always deployable. Each story from the GitHub issues gets a `story/<issue>-<slug>`
branch, cut from `main` when work starts. A story that depends on another unmerged story
branches off that story's branch, so the PRs stack. A larger feature can use an
integration branch: sub-story PRs merge into it, and it merges into `main` as one PR.
Delete story branches once they're in `main`.

The first roguelite slice (#21) worked this way. `story/21-hook-slice` was the integration
branch, with #26 → #27 → #28 → #29 and #27 → #30 stacked on it, and #22 → #31 alongside.
It merged in #40 and shipped as v0.2.0.

Still open, each to branch from `main` when started: #23 (chapter structure), #24
(meta-picture puzzles), and #25 (art direction).

Working a stack:

- Open each PR against its parent branch, so its diff shows only that story's work.
- When the parent changes, merge it into the child (`git merge story/<parent>`) and push.
  Or rebase and `git push --force-with-lease` if nobody else uses the branch.
- Merge from the bottom up. After a parent merges into its base (`main` or the integration
  branch), retarget the child PR to that base. GitHub does this automatically if the
  parent branch is deleted on merge. If the parent was squash-merged, run
  `git rebase --onto <base> <old-parent-tip> <child>` to drop the parent's original
  commits from the child.

Put `Closes #<issue>` in the PR description or the final commit so the issue closes on
merge. GitHub only does this when the PR merges into `main`. PRs into an integration
branch leave their issues open, so list those issues in the integration branch's PR to
`main`, as #40 did.

## Conventions

- **Formatting:** Prettier (single quotes, 100-column lines). Run `npm run format` before
  committing, since CI fails on unformatted files.
- **TypeScript:** strict mode with no unused locals or params. Prefer small modules with
  one job each.
- **DOM:** build elements with `el(tag, props, children)` from `ui/dom.ts`. Don't use
  `innerHTML`.
- **Accessibility:** interactive elements are real `<button>`s or links. Toggles set
  `aria-pressed`. Announce game events through the game screen's `announce()` live region.
- **Colors:** use tokens from `styles/tokens.css` so dark and high-contrast themes keep
  working.
- **Motion:** new animations are automatically shortened under `prefers-reduced-motion` by
  the rule in `base.css`. Don't override it.
- **Commits:** an imperative summary line, a body explaining what changed and why, and
  `Closes #n` when a commit finishes a story.
