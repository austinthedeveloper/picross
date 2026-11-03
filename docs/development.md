# Development

## Setup

Requires Node 20+ (CI uses Node 20).

```bash
npm install
npm run dev        # http://localhost:5173, hot reload
```

`.claude/launch.json` starts the same dev server from Claude Code's preview pane.

## Scripts

| Command                 | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Vite dev server                                             |
| `npm test`              | All unit tests once (Vitest, jsdom)                         |
| `npm run test:watch`    | Tests in watch mode                                         |
| `npm run check:puzzles` | Only the pack uniqueness check (`src/puzzles/pack.test.ts`) |
| `npm run lint`          | ESLint, then `prettier --check`                             |
| `npm run format`        | `prettier --write .`                                        |
| `npm run build`         | `tsc --noEmit` type-check, then `vite build` to `dist/`     |
| `npm run preview`       | Serve `dist/` locally                                       |

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

### Checking in a browser

There are no automated browser tests yet. Before pushing UI changes, run `npm run dev` and
check:

- **Mouse:** click to fill, right-click to mark, drag across a row, and drag from a filled
  cell to erase.
- **Keyboard:** Tab to the board, then arrows, Space, X, Shift+arrow, and Ctrl+Z.
- **Touch:** use devtools' device mode for taps and the zoom bar. Pinch needs a real device
  or Chrome's touch emulation.
- **Win and lose:** solve a 5×5 puzzle, and run out of hearts in Hearts mode.
- **Themes:** light, dark (OS setting), and High contrast.
- **Persistence:** reload mid-puzzle and confirm the board, timer, and hearts come back.
- **Editor:** draw, check the solver status, then export and re-import.

To start from a clean slate, clear the site's local storage in devtools (Application →
Local Storage).

## CI and deploys

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm test`, which includes the uniqueness check for every pack puzzle
4. `npm run build`

Pushes to `main` then deploy `dist/` to GitHub Pages at
https://austinthedeveloper.github.io/picross/. Vite builds with `base: './'`, so the site
works under the `/picross/` path.

## Branches and stacked PRs

`main` is always deployable. Each story from the GitHub issues gets a `story/<issue>-<slug>`
branch. Stories that depend on another story branch off that story's branch, so their PRs
stack:

```
main
└── story/21-hook-slice                      #21 tinkerer roguelite: first playable run
    ├── story/26-run-structure               #26 3-encounter run, path map, mid-run save
    │   └── story/27-battle-encounter        #27 HP, chip damage, finisher, mistake hits
    │       ├── story/28-gadgets             #28 solved pictures become run items
    │       │   └── story/29-dig-encounter   #29 calm dig that yields a gadget
    │       └── story/30-fog-bat             #30 enemy that fogs clues
    ├── story/22-dialogue-system             #22 portraits, text box, choices
    │   ├── story/31-crew-intro-scene        #31 crew intro and run sign-off
    │   └── story/23-chapter-structure       #23 later: story chapters (not in the slice)
    ├── story/24-meta-picture-puzzles        #24 later: big pictures from smaller grids
    └── story/25-art-direction               #25 palette, font, mood board
```

`story/21-hook-slice` is the integration branch for the slice. #21 is an umbrella for
sub-issues #26–#31, so their PRs stack up and merge into it. When the whole slice
works, `story/21-hook-slice` merges into `main` as one PR.

Why it's shaped this way:

- **#26 → #27:** fights need the run, because mistakes cost run HP and losing a fight
  ends the run.
- **#27 → #28 → #29:** gadgets go into the run inventory and change the next fight. The
  dig exists to hand over a gadget.
- **#27 → #30:** the fog bat uses the battle rules but doesn't need gadgets, so it's a
  sibling of #28.
- **#22 → #31:** the crew intro is built on the dialogue system. Its win and loss
  sign-offs hook into the run's end screen when both land in `story/21-hook-slice`.
- **#23 and #24:** both are outside the slice (no story chapters or bosses yet). Their
  branches are parked for later.
- **#25:** independent. The slice works with placeholder art until it lands.

Working a stack:

- Open each PR against its parent branch. For example, #27's PR targets
  `story/26-run-structure`, so its diff shows only battle work.
- When the parent changes, rebase the child onto it:
  `git rebase story/26-run-structure` from `story/27-battle-encounter`, then
  `git push --force-with-lease`.
- Merge from the bottom up. After a parent merges into its base (`story/21-hook-slice` for
  the slice), retarget the child PR to that base. GitHub does this automatically if the
  parent branch is deleted on merge. If the parent was squash-merged, run
  `git rebase --onto <base> <old-parent-tip> <child>` to drop the parent's original
  commits from the child.

Put `Closes #<issue>` in the PR description or the final commit so the issue closes on
merge.

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
