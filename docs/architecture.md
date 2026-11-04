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
  debug/                   Dev-only tools (#65): panel and hooks; never in production builds
  engine/                  Pure puzzle logic, no DOM
    board.ts               Cell states (Empty/Filled/Marked), Grid/Board/Solution, isSolved
    clues.ts               Clue derivation and per-clue "satisfied" check (clue dimming)
    history.ts             Change/Move types and the undo/redo History
    lines.ts               LineSet: sets of rows/columns (fog, scrambles, weak points)
    solver.ts              Line solver: uniqueness/no-guess check; fog and scramble aware
    swap.ts                Which two lines the Mimic swaps and wipes (#48)
    fakes.ts               The Forger's forged clues: a convincing wrong clue per line (#64)
    ink.ts                 Where ink lands and how completed lines wash it off (#67)
    random.ts              Seeded random numbers and shuffles (endless, daily)
    transform.ts           The eight turns and flips of a grid (daily puzzle, #69)
  puzzles/                 Content and its validation
    format.ts              Puzzle file format, parse/validate, export helpers
    index.ts               Loads pack/*.json and run/*.json; the list sorts by size, then ORDER
    pack/*.json            Free-play puzzles (5×5 to 20×20): the starter set plus themed batches
    sheets/*.txt           The themed batches as drawings; scripts/puzzle-sheet.ts exports them
    run/*.json             Run-only puzzles (the sword, wrench, owl, pocket watch, ...)
    pack.test.ts           Uniqueness check over every puzzle
    runs.ts                Loads encounters/*.json and runs/*.json (jobs)
    chapters.ts            Loads chapters/*.json: jobs grouped into story chapters (#23)
    endless.ts             Endless mode: seeded encounter order, scaling, the run as a RunDef (#68)
    daily.ts               The daily puzzle: date keys and the day's puzzle and turn (#69)
    tutorial.ts            How to play: its picture and steps, and what counts as a wrong move
    murals.ts              Loads murals/*.json and splits each picture into tile puzzles (#24)
    enemies.ts             Validates an enemy; lists its powers (startingPowers, phasePowers, enemyPowers)
    gadgets.ts             Gadget catalog: name, icon, description, effect
    scenes.ts              Loads and validates scenes/*.json (dialogue, #22)
    encounters/*.json      Encounters: name, kind (fight/dig), puzzle, enemy, boss, scene
    runs/*.json            Jobs: HP, encounters, gadgets, intro/outro, order, requires
    chapters/*.json        Chapters: title, order, blurb, jobs, opening scene
    scenes/*.json          Scenes: cast, nodes of lines, choices, and conditions
  game/                    Game state and saves, no DOM
    game.ts                Game: board, history, mode/hearts, hints, clock, wipes
    battle.ts              Enemy and BattleState: chip, finisher, gadgets, phases, armor, call-outs
    run.ts                 RunState and its pure transitions
    dialogue.ts            Scene runner: current line or choices, advance, choose, flags
    progress.ts            Free-play saves, solve stats, totals (localStorage)
    runSave.ts             Current run, seen scenes, job stats (localStorage)
    settings.ts            Mode, mute, high contrast (localStorage)
    daily.ts               Daily streak, best, and today's board (localStorage, #69)
    storage.ts             Safe localStorage JSON read/write
  ui/
    dom.ts                 el(): create an element with props and children
    format.ts              formatTime(), plural(), lineName()
    motion.ts              reducedMotion(), wait(), pause(), playOnce() for animations
    sound.ts               WebAudio-synthesized sound effects
    theme.ts               Applies the high-contrast theme
    screens/
      selectScreen.ts      Puzzle list, mode, settings, stats       (#/)
      gameScreen.ts        Play screen; PlaySession and its hooks  (#/play/<id>)
      freePlaySession.ts   Free-play PlaySession: saves, best times, "Next"
      daily.ts             The daily puzzle: its card on the list and its PlaySession (#/daily)
      mural.ts             Murals: the list section, a mural's tiles, playing a tile (#/mural/…)
      sceneScreen.ts       Plays a scene full screen               (#/scene/<id>)
      howToPlay.ts         Guided solve on a real board, then rules (#/how-to-play)
      editorScreen.ts      Puzzle authoring tool                   (#/editor)
      run/                 Runs                                    (#/run, #/run/play)
        index.ts           Run hub router and the puzzle-list banner
        shared.ts          Hub type, loadRun, mode picker, start buttons
        jobsBoard.ts       Jobs board (#47), grouped into chapters (#23)
        pathMap.ts         Path map, HP, gadget inventory
        results.ts         Results and sign-off
        encounter.ts       Plays the current encounter (a PlaySession)
        fight/             Fight hooks, one module per mechanic:
          index.ts         Wires them into the session hooks (fightHooks)
          context.ts       Shared state: enemy, battle bar, battle, form, saving
          lines.ts         Completed lines: fog, scramble, armor, chip damage
          phases.ts        Phase changes: form, banner, more fog/scramble, swaps
          swaps.ts         The Mimic's swaps (wait for strokes to end)
          callOut.ts       Forged clues: the 🔍 Call out button and accusations
          ink.ts           Ink splashes from phases (#67)
          charge.ts        The ⚡ charge meter and its zaps (#67)
          tips.ts          Power tips: a card the first time you meet a power, and the ⓘ list (#79)
          gadgets.ts       The gadget tray
          hits.ts          Mistakes, shields, knockouts
          finisher.ts      The solved picture flying at the enemy
        dig.ts             Dig hooks: dirt board, header, the reveal
    board/
      boardView.ts         Clues + cells (ARIA grid), dimming, fog/scramble/weak points
      input.ts             Pointer input: click, right-click, drag strokes, touch
      keyboard.ts          Keyboard cursor and actions on a board
      zoom.ts              Pinch/wheel zoom and two-finger pan
      picture.ts           Pixel-art canvas of a solution
    components/
      battleBar.ts         Enemy/player HP, gadgets, armor, 🎭 forgeries, phase banner, hit effects
      dialogue.ts          Scene player: portrait, typed text box, choices, Skip
      endPanels.ts         Solved, out-of-hearts, and generic end panels
      hintMenu.ts          "Hint n/3" dropdown
      muteButton.ts        Sound toggle
      zoomBar.ts           − / level / + zoom buttons
  styles/
    tokens.css             Color tokens for light, dark, and high-contrast themes
    base.css               Page layout, buttons, toggles, segmented controls
    board.css              Board, clues, cells, cursor, fog/scramble/weak-point clues
    game.css               Play screen: toolbar, hint menu, zoom bar, end states
    select.css             Puzzle list
    editor.css             Editor
    run.css                Run banner, jobs board, path map, results
    fight.css              Battle bar, gadgets, phase banner, armor, call-out
    dig.css                The dig's dirt board and reveal
    dialogue.css           Scene player
e2e/                       Playwright browser tests (see docs/development.md)
scripts/
  puzzle-sheet.ts          Check, repair and export puzzle sheets (batches of drawings; see docs/how-to.md)
  script-review.ts         Build the script review site, serve it, and report notes (see docs/how-to.md)
  script-review/           Its page model, renderer, notes store, server, and browser assets
  deploy-azure.sh          Upload a build to the Azure static website
  setup-azure-deploy.sh    One-time Azure + GitHub OIDC setup for the release pipeline
.github/workflows/
  ci.yml                   Lint, test, build; deploy main to GitHub Pages
  deploy-azure.yml         Deploy a published release to Azure
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
| `picross:settings` | `game/settings.ts`           | `mode` (default for new runs), `listFilter`, `muted`, `highContrast` |
| `picross:daily`    | `game/daily.ts`              | Daily streak, best streak, solve count, and today's board            |
| `picross:editor`   | `ui/screens/editorScreen.ts` | The editor's current drawing                                         |

`storage.ts` falls back to defaults if storage is blocked or holds bad JSON, so the game
still works in private browsing. To reset during development, clear the site's local
storage in devtools.

A saved board stores its cells as a digit string (`"0120…"`) plus elapsed time, mode,
hearts, and hints used. A puzzle keeps the mode it was started in. Solving it clears the
saved board, and failing in Hearts mode discards it.

## Routing and screens

`main.ts` routes on the URL hash. Hash routing works on GitHub Pages without server config.

| Hash               | Screen                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `#/`               | `renderSelectScreen` (also the fallback for unknown hashes)         |
| `#/play/<id>`      | `renderGameScreen` for a pack puzzle                                |
| `#/how-to-play`    | `renderHowToPlay`: the interactive tutorial and the rules           |
| `#/editor`         | `renderEditorScreen`                                                |
| `#/run`            | `renderRunScreen`: start panel, path map, or results                |
| `#/scene/<id>`     | `renderSceneScreen`: preview a scene (Replay at the end)            |
| `#/run/play`       | `renderRunEncounter`: the current encounter's puzzle                |
| `#/daily`          | `renderDailyScreen`: today's daily puzzle (#69)                     |
| `#/mural/<id>`     | `renderMuralScreen`: a mural's tiles, or the finished picture (#24) |
| `#/mural/<id>/<n>` | `renderMuralTile`: tile n of a mural                                |

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

Every color, and the font (Rubik, #25), is a CSS custom property in `styles/tokens.css`.
[Art direction](art-direction.md) says what each one is for. The tokens are redefined for
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
times. A run encounter (`screens/run/encounter.ts`) saves the board into the run state and clears the
encounter instead, so run solves never touch free-play stats. Fights (`run/fight/`)
and digs (`run/dig.ts`) plug in through the optional hooks, so the game screen has no
special cases for encounter types.

## The daily puzzle

A card at the top of the puzzle list opens `#/daily` (#69): one puzzle a day, the same
for everyone on the same local date.

- **The pick:** `puzzles/daily.ts` takes every pack puzzle 15×15 or bigger (from
  `packInOrder`, so re-sorting the list doesn't move anyone's daily) in all eight
  turns and flips (`engine/transform.ts`). That's 213 × 8 = 1704 boards, shuffled with a
  fixed seed into a cycle, so nothing repeats until the cycle runs out. Turning or
  flipping keeps a puzzle uniquely solvable, since its clues just move or reverse. The
  tests solve a sample of days to check.
- **Hidden until solved:** the board is named "Daily puzzle". The end panel and the card
  then say which pack puzzle it was and how it was turned.
- **Saves:** the daily keeps its own save (`picross:daily`), apart from free-play stats.
  It holds today's board, the streak, the best streak and the solve count. A streak
  counts while the last solve was today or yesterday, and shows 0 once a day is missed.

## The puzzle list

`selectScreen.ts` groups the pack by size, smallest first. `puzzles` is sorted the same way, so
card numbers run in display order and "Next" walks from simple to hard. Murals sit above the
sizes in one row that scrolls sideways, so they stay easy to find without pushing the first
puzzles down the page.

The All / Not completed / Completed filter is `listFilter` in the settings, so it survives
a visit to a puzzle. A puzzle in progress counts as not completed, and so does a mural until
its last tile is solved. A size with nothing to show disappears; its heading's count always
covers the whole size.

## How to play

`#/how-to-play` teaches on a real board (`createBoardView`, `attachInput` and `Game`, without
the game screen). `puzzles/tutorial.ts` holds the steps. The current step is worked out from
the board each time, so erasing a finished step goes back to it, and a step already done is
skipped. Moves that contradict the picture are turned away with a nudge instead of being
played. The tutorial records no solve, and `BoardView.setFocus` is what highlights the step's
lines.

## Murals (meta-pictures)

A mural (#24, `puzzles/murals/*.json`) is one big picture, 30×30, 45×30 or 45×45 so far, split
into tiles that are each their own puzzle. `parseMural` checks that the picture divides
into `tile`-sized squares and builds a puzzle per tile, row by row, with ids like
`whale-3`. The tests check that every tile is uniquely solvable on its own.

Tiles use the free-play save (`progress.ts`) under their own ids, so they save and keep
best times like pack puzzles. The "Puzzles solved" stat counts pack puzzles only. The
murals section on the puzzle list shows each mural's tiles filling in. A mural's name
stays hidden ("Mural No. 1") until every tile is solved; then its screen shows the whole
picture. After a tile, the end panel offers the next unsolved one.

To make a mural, draw the picture, then fix each tile until it's unique. A tile can be
uniquely solvable even when the whole picture isn't, and the other way round. Flipping a
cell or two inside a tile is usually enough. Keep tiles from being empty.

## Runs

A run (`puzzles/runs/*.json`) is a starting HP plus an ordered list of encounter ids. An
encounter (`puzzles/encounters/*.json`) names a pack puzzle, a kind (`fight` or `dig`),
and a line of flavor text. `RunState` (`game/run.ts`) tracks the current node, HP, max
HP, gadgets, status (`active`, `won`, or `lost`), and the current encounter's board. It
changes only through pure functions: `startRun`, `withBoard`, `damage`, and
`completeEncounter`. Every change is saved immediately, so closing the tab at any point
resumes on the map, or mid-puzzle with the board restored.

## Jobs board

"Pick a job" on the puzzle list opens the jobs board at `#/run` (#47). It lists every run
in `order`, each with its blurb, length, boss, and your best result. A run with `requires`
stays locked until you've won that job once. Results are saved per job in `runSave.ts`
(plays, wins, best HP left), once per finished run: `recordRunResult` marks the run
`recorded`, so a reload doesn't count it twice. The results screen shows every line the
job's outro plays for a win or a loss, which gives room for a tease after the sign-off,
and offers **Run it again** or **Jobs board**.

Jobs are grouped into **chapters** (#23, `puzzles/chapters/*.json`, loaded by
`puzzles/chapters.ts`): a title, an order, a blurb, its jobs, and an optional `opening`
scene. A chapter is open once its first job is unlocked. A locked chapter shows as a
single card saying which job opens it. An open chapter shows its jobs and how many
you've cleared. The first time you reach the board with a chapter open, its opening
plays (`renderRunScreen` checks before drawing the board), and after that a **▶ Chapter
story** button replays it. Every job must be in exactly one chapter, or loading fails.
The chapters so far are 1 · Odd Jobs (First Job), 2 · After Hours (The Night Shift),
3 · Deep Water (The Deep End), 4 · Green Thumbs (The Glasshouse), 5 · Step Right Up (The
Midway), 6 · Cold Snap (Summit Station), 7 · End of the Line (The Night Mail), 8 · Below
Stairs (The Undercroft), 9 · Peer Review (The Annex), and 10 · Wound Up (Closing Time).

Jobs so far: **First Job** (#21), **The Night Shift** (#46), and **The Deep End** (#67). The Night Shift unlocks after
First Job. It's Mimic → Clockwork Owl → the Forger → Dusty Exhibit (a dig that yields a
patch kit) → Armored Beetle → Break room → the Museum Rex, with Curator Ambrose joining Rook and Dee in its scenes. Chapters 4 to 10 are covered under [The later chapters](#the-later-chapters-chapters-4-to-10).

## Endless mode

Endless (#68) is a run that never ends. It opens once First Job is cleared, with a card
below the chapters showing your best depth. Starting one saves
`RunState.endless = { seed, fights, digs }`. The pools are every fight and dig from the
jobs you've played, fixed at the start, so a reload plays the same order.
`puzzles/endless.ts` turns that into encounters:

- **Order:** every fourth node is a dig. Fights come in seeded shuffled cycles, each
  enemy once before any repeats. Story scenes are dropped.
- **Scaling:** `scaleEnemy` adds 15% HP every 3 fights and +1 attack every 4. Phase and
  armor attacks go up too; phase thresholds are fractions, so they scale with HP.
- **The run:** `endlessRun(state)` builds a `RunDef` with `endless: true` covering the
  encounters up to three past the current one. `loadRun` uses it in place of
  `getRun`, so the map, encounter and results screens work unchanged.
  - The encounter screen completes with `length = Infinity`, so an endless run is
    never won.
  - It heals `ENDLESS_HEAL` (2) after each fight.
  - The map shows the last two you cleared and what's ahead.
- **Best depth:** `recordRunResult` keeps `bestDepth` (encounters cleared) for `endless`,
  and the results screen says when it's a new best.

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
it out from the crossing lines, and then it's revealed as the reward (`removeLine` in
`engine/lines.ts`). Fog covers one direction per fight, and validation enforces this: a
fogged row and a fogged column would hide the cell where they cross from both of its
lines, so neither could ever be finished. `solve(width, height, clues, fog)` plays it out
the same way, and a test requires every fogged fight to come out `unique`. The fog bat
fogs rows 4, 6, 7, and 10, including both full-width rows.

### Bosses and phases

An enemy can list `phases`. Each one starts once the enemy's HP falls to its `at` fraction
of max, and can change the enemy's `name`, `sprite`, and `attack`, and show a `taunt`. It
can also fog more lines (`advancePhase` and `currentForm` in `game/battle.ts`). A phase's
`fog` is a pool in priority order: it fogs up to `fogCount` lines from the pool that you
haven't completed and that aren't already fogged. So each wave lands on what you're still
working on, and it clears by solving, like the fog bat's. All of an enemy's fog (starting
fog plus every pool) must be in one direction. A test proves the puzzle is solvable with
all of it applied from the very start, so any wave you can actually get is fair. The
current phase is saved with the battle.

An encounter can also be `"boss": true` (a 👑 node on the map) and name a `scene` that plays
the first time you open it, before any progress is saved. First Job ends with the
**Generator Gremlin**, a 15×15 wrench with 45 HP, tuned to the fog bat's "hard to very
hard". Rows 4, 9, and 11 start fogged. At 90% HP (about 5 lines in) it turns Overcharged,
hits for 3, and fogs 3 more of rows 2, 5, 8, 10, and 15. At 84% (about 8 lines) it turns
Blackout, hits for 4, and fogs 2 more from the same pool. That's up to 8 of 15 rows dark.
Line damage is 1 per line and columns mostly finish late in a solve, so keep phase
thresholds high if you want them to land mid-fight.

### Scrambled clues (the Clockwork Owl)

An enemy can list `scramble: { rows, cols }`, and phases can add more from a `scramble` pool
with `scrambleCount`. A scrambled clue shows its runs in ascending order with a ⚙ and a
dashed outline, so you know which runs the line has but not their order. Its numbers
dim only when the whole line is done, since dimming one would give away its place. Like
fog, it clears when you complete the line. Unlike fog, rows and columns can both be
scrambled, because a scrambled clue still says something about every cell. Validation
rejects lines whose runs have only one order (for example `2 2`).

The solver handles scrambled lines with `solveLineAnyOrder`, which tries every distinct
order (`runOrders`) and keeps only what they all agree on.
`solve(w, h, clues, { fog, scramble })` combines the two, and the fight test checks every
enemy with all of its fog and scramble applied from the start. The solver finds even
heavily scrambled puzzles easy, much easier than people do, so tune how many lines get
scrambled by feel, using the fog bat as the reference.

The Owl (`encounters/clockwork-owl.json`) is a 15×15 owl. Rows 6, 8, 10, and 12 and
columns 4, 7, and 10 start scrambled. At 85% HP it winds up, hits for 3, and scrambles 3
more.

### Armor (the Armored Beetle)

An enemy can have `armor: { weakPoints: { rows, cols }, attack }`. While any weak point is
unsolved, ordinary lines deal no damage (they still count as struck, so they never chip
later), and the enemy hits for the armored `attack`. Weak-point clues are marked 🎯.
Completing one deals `WEAK_POINT_DAMAGE` (3) and cracks the armor, and after the last one
it breaks and normal rules return (`chip` in `game/battle.ts`). Since the finisher always
wins, armor matters through mistakes: in Hits-on runs, cracking it early softens the
beetle's hits (4 → 2). The Beetle is a 15×15 beetle with weak points at rows 9 and 12 and
column 3.

### Swaps (the Mimic)

A phase can set `"swap": true`. When it starts, the Mimic swaps two of your rows or two
of your columns and wipes them clean (#48, #78).

- **Which lines:** `pickSwap` (`engine/swap.ts`) picks the two unfinished rows, or the two
  unfinished columns, holding the most correct marks.
- **What goes:** every mark in them, including cells in crossing lines you'd finished. A
  wipe used to spare those cells, which meant it often took only a few marks and went
  unnoticed. Now each wipe takes about 15–25 cells, measured by simulation. Lines it
  re-opens close again when you refill the two lines; they don't deal chip damage twice.
- **Solvability:** the solution doesn't change, so solvability never does.
- **After the wipe:** `Game.wipe` clears the cells and starts the undo history over. The
  wiped lines are saved in `BattleState.wiped` (`markWiped`), and their clues stay boxed
  in mischief purple with 👄 until you complete them again (`clearWiped`). The
  announcement says how much was lost: "swapped rows 6 and 11 and ate 19 marks!"
- **Timing:** swaps wait until no stroke is in progress. The fight reaches the game
  through the `controls` that `onBoard` receives (`{ game, refresh }`).

The Night Shift run (`runs/night-shift.json`, #46) starts with the Mimic, a 15×15 chest
with teeth that swaps at 85%, 70%, and 55% HP and turns Hungry (attack 3) on the last.

### Forged clues (the Forger)

An enemy can have `fakes: { rows, cols }` and `suspects: { rows, cols }`.

- **Fakes** show a forged clue instead of the real one. `fakeClue` (`engine/fakes.ts`) makes each forgery so it still fits the line, so it can't be ruled out at a glance. It tries, in order: merging two neighboring runs, splitting a long run, lengthening a run, then shortening one.
- **Suspects** are marked 🎭. They hold every fake plus at least one honest line, so you know which clues not to trust, but not which ones lie. The battle bar counts the fakes left (🎭 3). The first version had no suspects, and playtesting showed the only way to find a fake was to trust it and get hit.

**How you find them.** Solve the suspects from the lines crossing them:

- **An honest suspect** shows its real clue, so it completes normally. `clearSuspects` takes its 🎭 off, with the message "Row 3 checks out: honest."
- **A fake** only counts as complete when its _fake_ is satisfied, and the fight ignores that, so it stays dark.

**Calling out.** **🔍 Call out** (`run/fight/callOut.ts`) sits in the gadget tray. Tap it, then a 🎭 clue (`BoardView.pickClue`; clues take Enter too). Tapping a clue that isn't a suspect just says so.

- **A forgery is unmasked:** the real clue comes back, and `callOut` deals `CALL_OUT_DAMAGE` (5, never below 1 HP). If you'd already filled the line, it completes then and chips too.
- **Accusing an honest suspect** settles it (its 🎭 comes off), but it lets the enemy hit you in Hits-on runs, or heals it `FALSE_ACCUSATION_HEAL` (3) in Relaxed runs.
- A suspect can't also be fogged or scrambled.

**Solvability.** The test suite solves each enemy's puzzle with every suspect treated as fog (`allUnreadable`). If that's unique, every suspect can be settled from its crossing lines, and every forgery contradicts the real picture.

**The Forger** (`encounters/forger.json`) is the third Night Shift node: a 15×15 palette. Rows 4, 8 and 14 are forged, and rows 3 and 7 are honest suspects (only two decoy pairs keep the palette solvable). It turns Master Forger (attack 3) at half HP. Its scene (`forger-intro`) and its power tip teach the rule.

### The Curator (Closing Time boss)

A 20×20 pocket watch with 60 HP (40 lines, so the finisher stays big). It combines every
board disruption so far:

- **Start:** rows 4 and 10 fogged.
- **92% HP:** Clockwork Curator, hits for 3, fogs rows 8 and 20.
- **85% HP:** scrambles 3 of columns 9, 10, 12, and 15.
- **78% HP:** Overwound Curator, hits for 4, and swaps and wipes two of your lines.

The thin outlines leave the watch less room than the solid wrench: 4 fogged rows plus 4
scrambled columns was the most the solver could still finish. Its 20×20 size and the swap
carry the rest of the difficulty. A scene (`curator-return`) plays before the fight.

This was the Night Shift's boss until playtesting showed it was the hardest fight in the
game and came before much easier ones. The fight moved to the last chapter unchanged, and the
Night Shift now ends with the **Museum Rex**: a 20×20 skull with 60 HP that scrambles 5
columns in total and swaps twice. The Curator still sets it loose in `rex-reveal` and
gets away, leaving a brass key behind.

### Charge (the Electric Eel)

An enemy with `charge: <lines>` shows a ⚡ meter under its HP and highlights one line's
clues as live (`run/fight/charge.ts`). The meter names the line, since a big board can
scroll it off a phone screen. Finishing the live line grounds the charge: the meter empties.
Finishing any other line adds one to the meter, and when it reaches `charge` the enemy
zaps you for `ZAP_DAMAGE` (2, through `takeHit`, so a patch kit blocks it). Either way the
meter empties and another line goes live. In Relaxed runs the zap fizzles. A phase can
start or change the limit with its own `charge`, and `currentForm` returns the current one.

The meter never moves with time. This used to be a 20 to 40 second timer that a finished
line reset, and playtesting showed that was far too hard at any length: lines can take
minutes to work out, and working them out is the game. Don't add a clock that costs HP.

`pickLiveLine` (`engine/charge.ts`) picks the unfinished line you're furthest through,
then the one with the most cells to fill. It skips lines whose clues you can't read yet
(fogged, scrambled, or 🎭), and moves on if a phase covers the live line. If nothing
qualifies, no line is live and the meter waits. Each line charges only once, so refilling
a wiped line doesn't count. `BattleState.live` and `charged` are saved with the run. A
finishing move ends the fight before the meter is checked, so it can't knock you out.

### Ink (the Cuttlefish and Old Tess)

A phase with `ink: <size>` (and optionally `inkCount`) splashes that many size×size
blocks of ink. `pickInk` (`engine/ink.ts`) puts each block where it hides the most of
your marks, skipping cells already inked and lines you've completed. It's deterministic.
Inked cells (`BattleState.ink`, saved) hide whether they're filled or marked, but you can
still play them, and mistakes still count. Completing a row or column washes the ink out
of it (`clearInk` in `completeLines`). The 🧽 **Sponge** gadget (`effect: { kind: 'wash' }`)
wipes it all. Ink only hides your marks, never clues, so it doesn't affect solvability.

### The Deep End (Chapter 3)

`runs/deep-end.json` (#67) unlocks after the Night Shift, with 16 HP and a patch kit:

- **Electric Eel:** charge 5 lines, 4 from 60% HP.
- **Anglerfish:** 5 fogged columns, 2 more at 80%.
- **Gift Shop:** a dig whose starfish becomes a sponge.
- **Cuttlefish:** three ink phases.
- **Old Tess:** a 20×20 octopus boss. Her phases bring ink at 92%, a double splash at 85%, a charge of 5 lines at 75%, and a final double splash at 60% (attack 4).

Keeper Bo joins Rook and Dee in its scenes.

### The later chapters (Chapters 4 to 10)

From here on, fights pair powers the player already knows rather than adding new ones.
A boss winds up a brass key, which goes in Rook and Dee's jar: that thread leads to the
Curator's return without counting the keys, so chapters can be added before him.

- **The Glasshouse:** Snapjaw (charge, swap) → Spore Puff (fog, ink) → Potting Shed (dig: sponge) → Ironbark (armor, scramble) → Garden bench → **Mother Bramble** (fog, ink, swap).
- **The Midway:** Funhouse Mirror (scramble, swap) → Madame Vesper (fakes, ink) → Prop Wagon (dig: bomb) → The Great Bruno (armor, charge) → Popcorn stand → **The Ringmaster** (fakes, scramble, charge, swap).
- **Summit Station:** Whiteout (fog, ink) → Falling Star (fakes, scramble) → Supply Cache (dig: patch kit) → Ice Mammoth (armor, fog, charge) → Cocoa break → **The Yeti** (fog, scramble, ink, charge).
- **The Night Mail:** Signal Box (fog, scramble) → Ticket Inspector (fakes, charge) → Lost Property (dig: sponge) → Gerald, the Coal Heap (armor, ink) → Station buffet → **The 11:59** (fog, scramble, swap, charge).
- **The Undercroft:** Rusted Sentry (armor, swap) → Cellar Ooze (scramble, ink) → Wine Cellar (dig: bomb) → The Rat King (fakes, swap) → Guard room → **The Old Wyrm** (armor, fakes, scramble, charge, ink).
- **The Annex:** Spark Hound (scramble, charge) → Failed Clone (fog, swap) → Supply Closet (dig: sponge) → Reviewer Two (armor, fakes) → Faculty lounge → **Professor Ostrander** (fakes, scramble, swap, ink).
- **Closing Time:** Tin Soldier (armor, fog, scramble) → Dusty Exhibit → Break room → **The Curator**. The dig and rest stop are the Night Shift's own.

Hollis, Bigsby, Dr. Lund, Stationmaster Pim, Sir Dennis, and Priya join Rook and Dee in their
jobs' scenes. The last three chapters' enemies and new characters use emoji until their art is
made.

### Difficulty

The Curator is the ceiling for now: a playtester took 30 minutes on it with no hints or
mistakes, and thought anything harder should count as "Insane". Tune against the solver,
with every power an enemy can bring applied from the start, by counting two things: how
many passes over the readable clues it takes to finish, and how much of the board the
first pass fills in. More passes and less first-pass progress mean harder.

| Boss              | Chapter | Board | Passes | First pass |
| ----------------- | ------- | ----- | ------ | ---------- |
| Generator Gremlin | 1       | 15×15 | 5      | 33%        |
| Museum Rex        | 2       | 20×20 | 5      | 32%        |
| Old Tess          | 3       | 20×20 | 5      | 44%        |
| Mother Bramble    | 4       | 20×20 | 6      | 21%        |
| The Ringmaster    | 5       | 20×20 | 8      | 25%        |
| The Yeti          | 6       | 20×20 | 9      | 14%        |
| The 11:59         | 7       | 20×20 | 9      | 20%        |
| The Old Wyrm      | 8       | 20×20 | 10     | 31%        |
| Prof. Ostrander   | 9       | 20×20 | 11     | 14%        |
| The Curator       | 10      | 20×20 | 12     | 12%        |

The solver can't see ink, charge, swaps, or armor, so bosses leaning on those play harder
than their numbers (Old Tess and the Old Wyrm especially). To tune a charge, expect about 1 to 3 zaps a
fight from a player ignoring the live line, at 5 or 6 lines to fill the meter. The picture matters more than the powers: dense
drawings stay easy under any number of powers, and thin outlines get hard quickly, so
give a thin drawing some solid areas to start from.

## Power tips

Each enemy power (fog, scramble, armor, fakes, charge, ink, swap) gets a one-line
explanation in `ui/powers.ts` (#79). `puzzles/enemies.ts` works out which powers an
enemy has: `startingPowers` for the start, `phasePowers` for what a phase brings in,
and `enemyPowers` for all of them.

`run/fight/tips.ts` queues a tip card in the battle bar the first time you meet each
power. That happens when the fight opens, or when the phase that brings the power
begins (`createPhases` reports it). "Got it" saves the power as seen (`seenTips` in
`picross:run`), so each tip appears once ever. The ⓘ after the enemy's name swaps the
card for a list of all the enemy's powers. The tests check that every power any enemy
has comes with a tip, so a new power needs an entry in `POWERS`.

## Digs

A dig encounter (`kind: "dig"`) has no enemy and never checks fills, even in a Hits-on
run, so there's no HP pressure. `run/dig.ts` sets the `dig` theme, which turns empty
cells into dirt and filled cells into metal (`styles/dig.css`, with `--dirt`, `--dug`,
and `--metal` tokens for each theme). It also adds a header with a "?" for the buried
find. On solve, the dirt brushes away in a diagonal wave, the part gleams, and the
puzzle's gadget pops into the header before the solved panel appears. The dig in First
Job is a 10×10 bomb casing that becomes the bomb.

## Rest stops

A rest stop (`kind: "rest"`, #77) is how a run gets HP back. It's a small 10×10 puzzle
with `rest: { seconds, heal }`. `run/rest.ts` puts a ☕ header with a countdown over the
board. The countdown follows the game clock, so it pauses when the page is hidden and
picks up after a reload. It turns orange in the last 15 seconds and is struck through
once time's up.

Solving within `seconds` heals `heal` HP (`restHeal` in `puzzles/runs.ts`); finishing
late still heals `REST_LATE_HEAL` (1). Healing never goes past max HP. Like a dig, it never
checks fills. Each job has one right before its boss: the Tea break (thermos), the
Break room (coffee), the Lifeguard chair (life ring), the Garden bench (watering can), the
Popcorn stand (popcorn), and the Cocoa break (cocoa), all for +4. The Tea break gets 120
seconds and the rest get 90. The
tests check that every boss has one in front of it. In Endless, every fourth node is a
break that alternates between a dig and a rest stop.

## Gadgets

A puzzle's JSON can name a `gadget`. Solving that puzzle in a run adds the gadget to
`RunState.gadgets`, and runs can also list starting gadgets (First Job starts with a
patch kit). The catalog in `puzzles/gadgets.ts` describes each gadget's effect as data:

- `{ kind: 'damage', amount }` hits the enemy right away. Chip rules apply, so it can't
  take the enemy below 1 HP and the finisher still lands the win.
- `{ kind: 'shield', hits }` blocks that many enemy hits (`absorbHit` in `battle.ts`).

Held gadgets are listed on the run map and shown as buttons in the fight's battle bar
(`run/fight/`). Using one removes it from the run. Buttons are disabled with a reason
when a gadget can't help: a shield in a Relaxed run, or damage when the enemy is already
at 1 HP. Gadgets act on the fight, never on the grid.

## Scenes (dialogue)

Scenes are JSON in `puzzles/scenes/`, validated at load: unknown speakers, unknown target
nodes, and empty nodes all fail. A scene has a `cast` (name plus a portrait, which is a
file name from `public/art/cast/` or an emoji until the art exists) and `nodes`. Play starts at `start`. A node plays its `lines` in order, then
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
