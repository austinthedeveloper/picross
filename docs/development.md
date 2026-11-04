# Development

## Setup

Requires Node 20+ (CI uses Node 20).

```bash
npm install
npm run dev        # http://localhost:5173, hot reload
```

`.claude/launch.json` starts the same dev server from Claude Code's preview pane.

## Scripts

| Command                 | What it does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server                                                           |
| `npm run dev:prod`      | Vite dev server without the debug tools                                   |
| `npm test`              | All unit tests once (Vitest, jsdom)                                       |
| `npm run test:watch`    | Tests in watch mode                                                       |
| `npm run check:puzzles` | Only the pack uniqueness check (`src/puzzles/pack.test.ts`)               |
| `npm run lint`          | ESLint, then `prettier --check`                                           |
| `npm run format`        | `prettier --write .`                                                      |
| `npm run build`         | `tsc --noEmit` type-check, then `vite build` to `dist/`                   |
| `npm run build:dev`     | The same, with the debug tools, to `dist-dev/` (what GitHub Pages serves) |
| `npm run check:bundle`  | Fails if debug code reached `dist/`                                       |
| `npm run preview`       | Serve `dist/` locally                                                     |

## Testing

### Unit tests

Tests live next to their code as `*.test.ts` and run in jsdom, so `localStorage` and basic
DOM work.

| Area                | Tests                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| `engine/`           | Grids and win check, clue derivation and dimming, undo history, solver        |
| `puzzles/`          | File parsing and validation, export, pack size, pack uniqueness               |
| `game/`             | Strokes, undo, reset, save/restore, clock, Hearts mode, hints, progress store |
| `ui/format.test.ts` | Time formatting                                                               |

Put new rules in `engine/` or `game/` and test them there. The UI modules are thin and are
checked in the browser instead.

`progress.ts` and `settings.ts` read storage once at import. Their tests call
`vi.resetModules()` and re-import to simulate a reload (see `game/progress.test.ts`).

### Browser tests (`e2e/`)

Playwright tests run the production build (`vite preview`) on a phone-sized touch screen
with reduced motion, so animations don't slow them down:

```bash
npm run e2e                                  # all of them
npx playwright test e2e/fights.spec.ts       # one file
npx playwright test --ui                     # watch them run
```

Locally they use your installed Chrome. CI installs Playwright's Chromium and uploads an
HTML report (`playwright-report`) when something fails. To debug a failure, run
`npx playwright show-trace test-results/<test>/trace.zip`.

| File                     | Covers                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `free-play.spec.ts`      | Sizes smallest first, the list filter, "Next", sound off by default, solving and the end screen, drag, undo, Hearts and Retry, hints, keyboard play   |
| `how-to-play.spec.ts`    | The tutorial from the first step to Solved: nudges, going back a step, the tool prompt, and that it records nothing                                   |
| `runs.spec.ts`           | Jobs board and chapters, the full First Job (intro once, sign-off, stats), knockouts, rest stops in time and late                                     |
| `fights.spec.ts`         | One test per mechanic: fog, gremlin waves, Mimic swaps, Owl scramble, Forger call-outs, Beetle armor, gadgets, Eel charge, Cuttlefish ink, power tips |
| `night-shift.spec.ts`    | The whole Night Shift from the jobs board to the Museum Rex                                                                                           |
| `later-chapters.spec.ts` | The Glasshouse, the Midway, Summit Station, and Closing Time, each from its chapter opening to its boss                                               |
| `deep-end.spec.ts`       | The whole Deep End from the chapter 3 opening to Old Tess                                                                                             |
| `endless.spec.ts`        | Endless mode: unlocking, healing after a fight, the map moving on, best depth                                                                         |
| `daily.spec.ts`          | The daily puzzle and its streak across days (fixed clock; solved from the clues on screen)                                                            |
| `murals.spec.ts`         | A mural filling in tile by tile, the last tile, and the finished picture                                                                              |
| `debug.spec.ts`          | The debug tools, against a dev build (project `dev`, port 4174)                                                                                       |
| `editor-zoom.spec.ts`    | Editor uniqueness check and export, pinch zoom                                                                                                        |

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

## CI and deploys

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm test`, which includes the uniqueness check for every puzzle
4. `npm run build`, then `npm run check:bundle` (no debug code in production)
5. A separate `e2e` job runs the Playwright tests.

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

**How it stays out of production.** `.env.development` sets `VITE_DEBUG=1`, so
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
