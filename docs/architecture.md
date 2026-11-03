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
    solver.ts              Line solver: uniqueness / no-guess check (CI and the editor), fog-aware
    fog.ts                 Fogged clues and the rule for lifting them (#30)
  puzzles/
    format.ts              Puzzle file format, parse/validate, export helpers
    index.ts               Loads pack/*.json and sets play order (ORDER)
    pack/*.json            The free-play puzzles (shown on the puzzle list)
    run/*.json             Run-only puzzles (e.g. the goblin's sword); not on the list
    pack.test.ts           Runs the solver over every pack puzzle
    runs.ts                Loads encounters/*.json and runs/*.json (roguelite runs)
    gadgets.ts             Gadget catalog: name, icon, description, effect (damage/shield)
    encounters/*.json      Encounters: name, kind (fight/dig), puzzle, blurb, enemy (fights)
    runs/*.json            Runs: starting HP and an ordered list of encounter ids
    scenes.ts              Loads and validates scenes/*.json (dialogue, #22)
    scenes/*.json          Scenes: cast, nodes of lines, choices, and conditions
  game/
    game.ts                Game: board + history + mode/hearts + hints + clock
    progress.ts            Saved boards, solve stats, totals (localStorage)
    settings.ts            Mode, mute, high contrast (localStorage)
    run.ts                 RunState and its pure transitions (start, damage, clear encounter)
    dialogue.ts            Scene runner: current line or choices, advance, choose, flags
    battle.ts              Enemy and BattleState: chip damage, finisher, gadget effects, shields
    runSave.ts             Saves the current run (localStorage)
    storage.ts             Safe localStorage JSON read/write
  ui/
    dom.ts                 el(): create an element with props and children
    format.ts              formatTime()
    sound.ts               WebAudio-synthesized sound effects
    theme.ts               Applies the high-contrast theme
    screens/
      selectScreen.ts      Puzzle list, mode, settings, stats       (#/)
      gameScreen.ts        Play screen; wires everything together  (#/play/<id>)
      freePlaySession.ts   Free-play PlaySession: saves, best times, "Next"
      runScreen.ts         Run hub, path map, results; run encounters (#/run, #/run/play)
      sceneScreen.ts       Plays a scene full screen; #/scene/<id> previews one
      fightHooks.ts        Fight rules wired into a run encounter's PlaySession
      digHooks.ts          Dig encounters: dirt board, header, the reveal on solve
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
      endPanels.ts         Solved, out-of-hearts, and generic end panels
      battleBar.ts         Enemy and player HP above the board; hit and defeat effects
      muteButton.ts        Sound toggle
      dialogue.ts          Scene player: portrait, typed text box, choices, Skip
  styles/
    tokens.css             Color tokens for light, dark, and high-contrast themes
    base.css               Page layout, buttons, toggles, segmented controls
    board.css              Board, clues, cells, cursor, cell animations
    game.css               Play screen: toolbar, hint menu, zoom bar, solved/failed states
    select.css             Puzzle list
    editor.css             Editor
    run.css                Run banner, path map, results
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

| Key                | Module                       | Contents                                                             |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- |
| `picross:v1`       | `game/progress.ts`           | In-progress boards, per-puzzle stats, total solving time             |
| `picross:run`      | `game/runSave.ts`            | The current run (with the current encounter's board) and seen scenes |
| `picross:settings` | `game/settings.ts`           | `mode` (also the default for new runs), `muted`, `highContrast`      |
| `picross:editor`   | `ui/screens/editorScreen.ts` | The editor's current drawing                                         |

`storage.ts` falls back to defaults if storage is blocked or holds bad JSON, so the game
still works in private browsing. To reset during development, clear the site's local
storage in devtools.

A saved board stores its cells as a digit string (`"0120…"`) plus elapsed time, mode,
hearts, and hints used. A puzzle keeps the mode it was started in. Solving it clears the
saved board, and failing in Hearts mode discards it.

## Routing and screens

`main.ts` routes on the URL hash. Hash routing works on GitHub Pages without server config.

| Hash           | Screen                                                      |
| -------------- | ----------------------------------------------------------- |
| `#/`           | `renderSelectScreen` (also the fallback for unknown hashes) |
| `#/play/<id>`  | `renderGameScreen` for a pack puzzle                        |
| `#/editor`     | `renderEditorScreen`                                        |
| `#/run`        | `renderRunScreen`: start panel, path map, or results        |
| `#/scene/<id>` | `renderSceneScreen`: preview a scene (Replay at the end)    |
| `#/run/play`   | `renderRunEncounter`: the current encounter's puzzle        |

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

## Play sessions: free play vs. runs

`renderGameScreen(app, puzzle, session)` doesn't know where a puzzle came from. A
`PlaySession` (defined in `gameScreen.ts`) supplies:

- the back link and the title shown before the puzzle is solved
- the mistake mode
- the saved board, and `save(board | null)` to save or clear it
- `complete(game)`, which records the solve and returns the solved panel's note and
  buttons
- optional encounter hooks: a `header` above the board, a `theme` (adds `theme-<name>` to
  the screen for restyling), `onLinesComplete`, `onMistake`,
  `ended()` to stop play early (e.g. knocked out), and `celebrate()` to animate before the
  solved panel appears
- `onBoard(view)`, called once with the board view before play (fights use it to fog
  clues)

`freePlaySession(puzzle)` is the default. It saves to `progress.ts` and records best
times. A run encounter (`runScreen.ts`) saves the board into the run state and clears the
encounter instead, so run solves never touch free-play stats. Fights (`fightHooks.ts`)
and digs (`digHooks.ts`) plug in through the optional hooks, so the game screen has no
special cases for encounter types.

## Runs

A run (`puzzles/runs/*.json`) is a starting HP plus an ordered list of encounter ids. An
encounter (`puzzles/encounters/*.json`) names a pack puzzle, a kind (`fight` or `dig`),
and a line of flavor text. `RunState` (`game/run.ts`) tracks the current node, HP, max
HP, gadgets, status (`active`, `won`, or `lost`), and the current encounter's board. It
changes only through pure functions: `startRun`, `withBoard`, `damage`, and
`completeEncounter`. Every change is saved immediately, so closing the tab at any point
resumes on the map, or mid-puzzle with the board restored.

## Fights

A fight encounter has an `enemy` (`name`, `sprite`, `hp`, `attack`). The rules live in
`game/battle.ts`:

- **Chip damage.** Each newly completed row or column deals `CHIP_DAMAGE` (1). Each line
  counts once, even if it's broken and completed again, and chip damage never takes the
  enemy below 1 HP.
- **Finisher.** Solving the picture deals whatever HP is left, so it always wins the
  fight. A test makes sure every bundled fight leaves at least a third of the enemy's HP
  for the finisher.
- **Mistakes.** A run remembers the mode it started in. In a Hits-on (Hearts) run, the
  game uses `battle` mode: like Hearts, a wrong fill becomes an X and ends the stroke, but
  instead of losing a heart, the enemy hits the player's run HP for `attack`. At 0 HP the
  run is lost and the screen shows "Knocked out." In a Relaxed run, fights don't check
  fills and the enemy never hits.

Battle progress (enemy HP, which lines have struck, any active shield, and the fog still
up) is saved in `RunState.battle`, so a reload resumes mid-fight.

### Fog (the fog bat)

An enemy can list `fog: { rows }` or `fog: { cols }`: clues hidden behind a cloudy "?" when
the fight starts. A fogged clue stays hidden until you complete that line yourself, working
it out from the crossing lines, and then it's revealed as the reward (`liftFog` in
`engine/fog.ts`). Fog covers one direction per fight, and validation enforces this: a
fogged row and a fogged column would hide the cell where they cross from both of its
lines, so neither could ever be finished. `solve(width, height, clues, fog)` plays it out
the same way, and a test requires every fogged fight to come out `unique`. The fog bat
fogs rows 4, 6, 7, and 10, including both full-width rows.

### Bosses and phases

An enemy can list `phases`. Each one starts once the enemy's HP falls to its `at` fraction
of max, and can change the enemy's `name`, `sprite`, and `attack`, show a `taunt`, and
fog more lines (`advancePhase` and `currentForm` in `game/battle.ts`). A phase's fog only
covers lines you haven't completed yet, and it clears by solving, like the fog bat's. All
of an enemy's fog, starting and from every phase, must be in one direction. A test proves
the puzzle is solvable with all of it applied from the very start, so the boss stays fair
however far along you are when it changes. The current phase is saved with the battle.

An encounter can also be `"boss": true` (a 👑 node on the map) and name a `scene` that plays
the first time you open it, before any progress is saved. First Job ends with the
**Generator Gremlin**: a 15×15 wrench with 45 HP. At 70% HP (about halfway through the
lines) it turns Overcharged, attacks for 3 instead of 2, and fogs rows 6, 7, 11, and 15.

## Digs

A dig encounter (`kind: "dig"`) has no enemy and never checks fills, even in a Hits-on
run, so there's no HP pressure. `digHooks.ts` sets the `dig` theme, which turns empty
cells into dirt and filled cells into metal (`styles/run.css`, with `--dirt`, `--dug`,
and `--metal` tokens for each theme). It also adds a header with a "?" for the buried
find. On solve, the dirt brushes away in a diagonal wave, the part gleams, and the
puzzle's gadget pops into the header before the solved panel appears. The dig in First
Job is a 10×10 bomb casing that becomes the bomb.

## Gadgets

A puzzle's JSON can name a `gadget`. Solving that puzzle in a run adds the gadget to
`RunState.gadgets`, and runs can also list starting gadgets (First Job starts with a
patch kit). The catalog in `puzzles/gadgets.ts` describes each gadget's effect as data:

- `{ kind: 'damage', amount }` hits the enemy right away. Chip rules apply, so it can't
  take the enemy below 1 HP and the finisher still lands the win.
- `{ kind: 'shield', hits }` blocks that many enemy hits (`absorbHit` in `battle.ts`).

Held gadgets are listed on the run map and shown as buttons in the fight's battle bar
(`fightHooks.ts`). Using one removes it from the run. Buttons are disabled with a reason
when a gadget can't help: a shield in a Relaxed run, or damage when the enemy is already
at 1 HP. Gadgets act on the fight, never on the grid.

## Scenes (dialogue)

Scenes are JSON in `puzzles/scenes/`, validated at load: unknown speakers, unknown target
nodes, and empty nodes all fail. A scene has a `cast` (name plus an emoji portrait until
#25's art) and `nodes`. Play starts at `start`. A node plays its `lines` in order, then
shows its `choices`, jumps to `next`, or ends the scene.

- Lines and choices can have `"if": "flag"` or `"if": "!flag"`, and they're skipped when
  the condition fails.
- Choices can `"set"` flags. Flags start from whatever the caller passes in, so a run can
  pass `{ "won": true }` for a sign-off.

`game/dialogue.ts` is the pure runner (`startDialogue`, `currentStep`, `advance`,
`choose`). `ui/components/dialogue.ts` draws it:

- **Lines:** each line types out; a tap, Enter, or Space finishes it and then moves on.
- **Choices:** buttons, with the first one focused, and number keys pick them.
- **Skip:** ends the scene.
- **Accessibility:** every line is announced to screen readers, and reduced motion shows
  text instantly.

`renderSceneScreen(app, scene, { flags, onEnd })` plays one full screen.

A run's JSON can name an `intro` scene and an `outro` scene (#31). The intro plays
automatically the first time you start that run. Seen scenes are stored with the run save,
and after that the start screen offers "Watch the intro." The outro is a single-line
sign-off picked by the `won` flag and shown on the results screen with the speaker's
portrait. First Job introduces Rook and Dee in `scenes/first-job-intro.json`.

## The solver

`engine/solver.ts` line-solves a puzzle from its clues alone. For each line it uses dynamic
programming to find which cells every arrangement of the clues agrees on, and it repeats
across rows and columns until nothing changes. If every cell gets decided, the puzzle has
exactly one solution and can be solved without guessing. `pack.test.ts` runs it in CI over
every puzzle, and the editor runs it live to stripe the cells it can't decide.
