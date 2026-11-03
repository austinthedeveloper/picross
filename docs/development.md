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
└── story/21-decide-hook                 #21 pick and prototype the concept
    ├── story/22-dialogue-system         #22 portraits, text box, choices
    │   └── story/23-chapter-structure   #23 puzzles with story beats between them
    ├── story/24-meta-picture-puzzles    #24 big pictures made of smaller grids
    └── story/25-art-direction           #25 palette, font, mood board
```

Why it's shaped this way: #21 decides the concept, which shapes everything else. Chapters
(#23) need the dialogue system (#22) for the story beats between puzzles. Meta-pictures
(#24) and art direction (#25) depend on the concept but not on each other or on dialogue.

Working a stack:

- Open each PR against its parent branch. For example, #23's PR targets
  `story/22-dialogue-system`, so its diff shows only chapter work.
- When the parent changes, rebase the child onto it:
  `git rebase story/22-dialogue-system` from `story/23-chapter-structure`, then
  `git push --force-with-lease`.
- Merge from the bottom up. After a parent merges into `main`, retarget the child PR to
  `main`. GitHub does this automatically if the parent branch is deleted on merge. If the
  parent was squash-merged, run `git rebase --onto main <old-parent-tip> <child>` to drop
  the parent's original commits from the child.

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
