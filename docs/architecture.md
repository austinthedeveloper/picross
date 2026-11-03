# Architecture

The game is a single-page app in plain TypeScript with no UI framework. Screens build DOM
nodes with a small `el()` helper, and the code is split into four layers. Each layer only
imports from the layers above it in this list:

| Layer   | Folder         | Knows about the DOM? | Job                                                             |
| ------- | -------------- | -------------------- | --------------------------------------------------------------- |
| Engine  | `src/engine/`  | No                   | Pure puzzle logic: grids, clues, undo history, the line solver  |
| Puzzles | `src/puzzles/` | No                   | The puzzle file format and the built-in pack                    |
| Game    | `src/game/`    | No (uses storage)    | A puzzle in play (rules, hearts, hints, clock), saves, settings |
| UI      | `src/ui/`      | Yes                  | Screens, the board view, input, sound, and components           |

Keep rules and state in `engine/` and `game/`, where they can be unit tested without a
browser. The UI should only translate events into `Game` calls and redraw.

## Directory map

```
index.html                 Page shell; loads src/main.ts
public/favicon.svg
src/
  main.ts                  Entry point: imports styles, applies theme, hash router
  engine/
    board.ts               Cell states (Empty/Filled/Marked), Grid/Board/Solution, isSolved
    clues.ts               Clue derivation and per-clue "satisfied" check (clue dimming)
    history.ts             Change/Move types and the undo/redo History
    solver.ts              Line solver: uniqueness / no-guess check (CI and the editor)
  puzzles/
    format.ts              Puzzle file format, parse/validate, export helpers
    index.ts               Loads pack/*.json and sets play order (ORDER)
    pack/*.json            The built-in puzzles
    pack.test.ts           Runs the solver over every pack puzzle
  game/
    game.ts                Game: board + history + mode/hearts + hints + clock
    progress.ts            Saved boards, solve stats, totals (localStorage)
    settings.ts            Mode, mute, high contrast (localStorage)
    storage.ts             Safe localStorage JSON read/write
  ui/
    dom.ts                 el(): create an element with props and children
    format.ts              formatTime()
    sound.ts               WebAudio-synthesized sound effects
    theme.ts               Applies the high-contrast theme
    screens/
      selectScreen.ts      Puzzle list, mode, settings, stats       (#/)
      gameScreen.ts        Play screen; wires everything together  (#/play/<id>)
      editorScreen.ts      Puzzle authoring tool                   (#/editor)
    board/
      boardView.ts         Renders clues + cells (ARIA grid), clue dimming, flashes
      input.ts             Pointer input: click, right-click, drag strokes, touch
      keyboard.ts          Keyboard cursor and actions on a board
      zoom.ts              Pinch/wheel zoom and two-finger pan
      picture.ts           Pixel-art canvas of a solution
    components/
      hintMenu.ts          "Hint n/3" dropdown
      zoomBar.ts           − / level / + zoom buttons
      endPanels.ts         Solved and out-of-hearts panels
      muteButton.ts        Sound toggle
  styles/
    tokens.css             Color tokens for light, dark, and high-contrast themes
    base.css               Page layout, buttons, toggles, segmented controls
    board.css              Board, clues, cells, cursor, cell animations
    game.css               Play screen: toolbar, hint menu, zoom bar, solved/failed states
    select.css             Puzzle list
    editor.css             Editor
.github/workflows/ci.yml   Lint, test, build; deploy main to GitHub Pages
.claude/launch.json        Dev server config for Claude Code's preview
```

Tests sit next to the code they cover as `*.test.ts`.

## Core data model

- **`Cell`** (`engine/board.ts`) is `Empty = 0`, `Filled = 1`, or `Marked = 2`.
- **`Grid<T>`** is `{ width, height, cells: T[] }`, stored row-major (`index = r * width + c`).
  A `Board` is a `Grid<Cell>` (the player's marks) and a `Solution` is a `Grid<boolean>`.
- **`Puzzle`** (`puzzles/format.ts`) bundles `id`, `name`, size, `solution`, and its derived
  `clues` (`{ rows: number[][], cols: number[][] }`). An empty line has `[]` as its clue, and
  the board shows it as `0`.
- **`Change`** is `{ index, from, to }`, and a **`Move`** is `Change[]`. A drag stroke, a
  reset, or a hint is one move, so it undoes in one step.

## How a move flows

```
pointer/touch ─▶ ui/board/input.ts ──┐
keyboard ──────▶ ui/board/keyboard.ts ┼─▶ gameScreen play() ─▶ Game.preview()  (applies, checks hearts)
hint menu ─────▶ gameScreen useHint() ┘                    └─▶ view.update()   (redraw, clue dimming)
                                         stroke ends ──────▶ Game.commit()     (history + solved check)
                                                           └─▶ refresh()       (save, toolbar, panels)
```

1. `input.ts` turns a pointer down into a **stroke**. A stroke only changes cells in the
   same state as the cell it started on, and its first move locks it to a row or column. As
   the pointer moves, it calls `onPreview` with the newly covered cells.
2. `gameScreen.play()` passes them to `Game.preview()`. That applies them right away (live
   drag feedback) and, in Hearts mode, turns a wrong fill into an X, costs a heart, and tells
   the input layer to end the stroke. Sounds, error flashes, and line-complete effects
   happen here too.
3. When the stroke ends, `Game.commit()` records the changes as one undoable move and
   rechecks whether the puzzle is solved.
4. `refresh()` saves progress, updates the toolbar and hearts, and shows the solved or
   failed panel when needed.

Keyboard actions and hints go through the same `play` → `commit` → `refresh` path, so the
rules stay identical across input methods.

## State and persistence

All saved data lives in `localStorage`, read once at startup and written on change:

| Key                | Module                       | Contents                                                 |
| ------------------ | ---------------------------- | -------------------------------------------------------- |
| `picross:v1`       | `game/progress.ts`           | In-progress boards, per-puzzle stats, total solving time |
| `picross:settings` | `game/settings.ts`           | `mode`, `muted`, `highContrast`                          |
| `picross:editor`   | `ui/screens/editorScreen.ts` | The editor's current drawing                             |

`storage.ts` falls back to defaults if storage is blocked or holds bad JSON, so the game
still works in private browsing. To reset during development, clear the site's local
storage in devtools.

A saved board stores its cells as a digit string (`"0120…"`) plus elapsed time, mode,
hearts, and hints used. A puzzle keeps the mode it was started in. Solving it clears the
saved board, and failing in Hearts mode discards it.

## Routing and screens

`main.ts` routes on the URL hash. Hash routing works on GitHub Pages without server config.

| Hash          | Screen                                                      |
| ------------- | ----------------------------------------------------------- |
| `#/`          | `renderSelectScreen` (also the fallback for unknown hashes) |
| `#/play/<id>` | `renderGameScreen` for a pack puzzle                        |
| `#/editor`    | `renderEditorScreen`                                        |

Each screen replaces `#app`'s children. A screen that adds global listeners or timers
returns a cleanup function, which the router calls before rendering the next screen. The
game screen does this for its clock and its Ctrl+Z handler.

## Board rendering

`boardView.ts` builds one CSS grid: a corner, a header row of column clues, then one row
per board row (row clues, then cells). The rows are `role="row"` wrappers with
`display: contents`, so screen readers see a proper ARIA grid without changing the layout.
Cell size is a single CSS formula (`--cell` in `styles/board.css`) that fits the board to
the viewport and multiplies by `--zoom`.

`view.update(board)` redraws cell classes and clue dimming, and returns any lines that just
became complete. One-shot effects (`flashLine`, `flashError`, `flashHint`) add a class for
about a second. They animate a `::after` overlay so they never restart the cell's own fill
animation.

## Styling and themes

Every color is a CSS custom property in `styles/tokens.css`. The tokens are redefined for
dark mode (`prefers-color-scheme`) and for high contrast (`:root[data-contrast='high']`,
set by `ui/theme.ts`). Use tokens rather than hard-coded colors so all three themes keep
working. Shared button styles live in `base.css`: `.button`, `.ghost`, `.primary`, a
`.toggle` that shows `aria-pressed`, and `.segmented` button groups.

## The solver

`engine/solver.ts` line-solves a puzzle from its clues alone. For each line it uses dynamic
programming to find which cells every arrangement of the clues agrees on, and it repeats
across rows and columns until nothing changes. If every cell gets decided, the puzzle has
exactly one solution and can be solved without guessing. `pack.test.ts` runs it in CI over
every puzzle, and the editor runs it live to stripe the cells it can't decide.
