# How-to guides

Recipes for common changes. See [architecture.md](architecture.md) for how the pieces fit.

## Add a puzzle

1. Open the editor: run `npm run dev` and go to http://localhost:5173/#/editor, or use
   "Make your own puzzle" on the puzzle list.
2. Set the size, name it, and draw. The status line should say **"Unique and solvable without
   guessing."** If cells are striped, the clues can't pin them down, so change the picture
   near them. Common fixes are breaking up symmetric shapes or 2×2 checkerboards, or adding
   a cell to a long empty stretch.
3. Click **Download** (or **Copy JSON**) and save the file as `src/puzzles/pack/<id>.json`.
4. Add the id to `ORDER` in `src/puzzles/index.ts`, at the position where it should appear.
   Ids not listed in `ORDER` still load, but they go at the end.
5. Run `npm run check:puzzles`. CI runs the same check and fails on ambiguous puzzles.

You can also write the JSON by hand: `id`, `name`, `width`, `height`, and `solution` (one
string per row, `#` filled and `.` empty). `parsePuzzle` validates it at startup. The
starter-pack test expects 5×5 to 15×15 and at most 15 puzzles, so update
`src/puzzles/format.test.ts` if the pack grows past that.

## Add an encounter or a run

1. Add the encounter's puzzle. Run-only puzzles go in `src/puzzles/run/`, so they stay off
   the puzzle list but still get the uniqueness check. You can also reuse a pack puzzle.
2. Add `src/puzzles/encounters/<id>.json`:
   ```json
   { "id": "goblin", "name": "Goblin", "kind": "fight", "puzzle": "sword", "blurb": "..." }
   ```
   `kind` is `fight` or `dig`, and `blurb` is optional. Fights also need an enemy:
   ```json
   "enemy": { "name": "Goblin", "sprite": "👺", "hp": 30, "attack": 2 }
   ```
   Keep `hp` at least 1.5 × (width + height) so the finisher stays the big hit. A test
   enforces this. `attack` is the run HP lost per wrong fill in Hits-on runs.
   To fog clues, add `"fog": { "rows": [3, 5] }` (or `"cols"`, never both) to the enemy,
   using 0-based line indexes. Fogged lines must be solvable from their crossing lines, and
   the test suite checks this. If it fails, fog fewer lines or lines the crossing clues pin
   down.
3. Reference the encounter id from a run in `src/puzzles/runs/<id>.json`:
   ```json
   { "id": "first-job", "name": "First Job", "hp": 10, "encounters": ["goblin", "..."] }
   ```
4. Run `npm test`. Loading fails with a clear error if a run names an unknown encounter
   or an encounter names an unknown puzzle.

"Start a run" always begins `DEFAULT_RUN_ID` in `src/puzzles/runs.ts`.

## Add a gadget

1. Add an entry to the catalog in `src/puzzles/gadgets.ts` with an id, name, icon (an
   emoji until there's art), one-line description, and effect.
2. If the effect is a new kind, add it to the `GadgetEffect` union, handle it in
   `useGadget` in `src/game/battle.ts` (with a test in `battle.test.ts`), and give it
   feedback in `use()` in `src/ui/screens/fightHooks.ts`.
3. Hand it out: set `"gadget": "<id>"` on the puzzle JSON whose picture becomes it, or
   list it in a run's `"gadgets"` to start with it. Unknown ids fail at load.

## Write a scene

1. Add `src/puzzles/scenes/<id>.json`:
   ```json
   {
     "id": "intro",
     "cast": { "pip": { "name": "Pip", "portrait": "🧑‍🔧" } },
     "nodes": {
       "start": {
         "lines": [
           { "text": "Narration has no speaker." },
           { "who": "pip", "text": "Only shown after a win.", "if": "won" }
         ],
         "choices": [{ "text": "Let's go", "next": "after", "set": { "eager": true } }]
       },
       "after": { "lines": [{ "who": "pip", "text": "That's the spirit." }] }
     }
   }
   ```
2. Preview it at http://localhost:5173/#/scene/<id>. `first-job-intro.json` shows a branch,
   and `first-job-outro.json` shows win/loss conditions.
3. To play it with a run, set `"intro": "<id>"` (before the first run) or `"outro": "<id>"`
   (one-line sign-off; use `"if": "won"` / `"!won"`) in the run's JSON.
4. Run `npm test`. Bad references fail at load.

Keep lines short (phone screens), and each scene under a minute to read.

## Add a screen

1. Create `src/ui/screens/<name>Screen.ts` exporting
   `render<Name>Screen(app: HTMLElement)`. Build the screen with `el()` from `ui/dom.ts` and
   finish with `app.replaceChildren(...)`.
2. If it adds window or document listeners, intervals, or other global state, return a
   cleanup function, as `renderGameScreen` does.
3. Add a route in `route()` in `src/main.ts`, for example
   `else if (location.hash === '#/stats') renderStatsScreen(app);`. If it returns a cleanup
   function, assign it to `cleanup`.
4. Add `src/styles/<name>.css` and import it in `main.ts` after the other styles.
5. Link to it with a normal `<a href="#/<name>">`.

## Add a setting

1. Add the field and its default to `Settings` and the `readStore` fallback in
   `src/game/settings.ts`. Players' existing saved settings are merged over the defaults,
   so a new field just takes its default.
2. Read it with `getSettings().<field>` and change it with `updateSettings({ <field> })`.
3. Add a control. The select screen's `toggle()` helper in `ui/screens/selectScreen.ts`
   makes an `aria-pressed` toggle button that re-renders the screen.
4. If the setting affects styling, set a `data-*` attribute on `<html>` the way
   `ui/theme.ts` does for high contrast, and style it in CSS.

## Add or change a sound

Sounds are synthesized in `src/ui/sound.ts`, so there are no audio files.

1. Add a name to the `Sound` type.
2. Add its notes to `SOUNDS`: each note has a `freq` in Hz, a `duration` in seconds, and
   optionally a start offset `at`, a waveform `type`, and a peak `gain`. Keep gains around
   0.1 to 0.2.
3. Call `playSound('<name>')` at the right moment, usually in `gameScreen.ts`. Muting is
   handled for you.

## Add a board effect or animation

- **Effects that live as long as a state:** style the state class in `styles/board.css`.
  For example, `.cell.filled` plays `fill-pop` whenever the class is added.
- **One-shot flashes:** follow `flashError` in `ui/board/boardView.ts`. Add a method that
  calls `restartAnimation(node, '<class>')`, add it to the `BoardView` interface, and style
  `.cell.<class>::after` with `--flash` and the `overlay-flash` keyframes. Animating the
  overlay rather than the cell keeps it from restarting the cell's own animation.
- **Solved-state effects** go in `styles/game.css` under `.is-solved`. Each cell has a
  `--d` delay set from its diagonal position for wave effects.

`prefers-reduced-motion` shortens every animation automatically.

## Add a game rule or mechanic

Rules belong in `Game` (`src/game/game.ts`) so they're testable without a browser.

1. Add the state and logic to `Game`. If the change edits the board, apply it and push it
   to `this.history` as one `Move`, so it can be undone. Call `this.checkSolved()`
   afterwards.
2. If the state should survive a reload, add an optional field to `SavedBoard` in
   `game/progress.ts`, write it in `serialize()`, and read it in the constructor with a
   default, so older saves still load.
3. Write tests in `src/game/game.test.ts`.
4. Wire it into `ui/screens/gameScreen.ts`. Changes from the board go through `play()`,
   and anything else ends with `refresh()`. Add an `announce()` message for screen readers
   when the player should know something happened.

Hints (`Game.hint` and `ui/components/hintMenu.ts`) are a good model for a feature with
its own menu, cost, and announcement.

## Add a color or change the theme

1. Add or change the token in `src/styles/tokens.css`, in all three blocks: light
   (`:root`), dark (`prefers-color-scheme: dark`), and high contrast
   (`:root[data-contrast='high']`).
2. Use it as `var(--token)` in CSS. Canvas drawing reads tokens with `getComputedStyle`,
   as `ui/board/picture.ts` does with `--ink`.
3. Check all three themes. For dark mode, switch your OS setting or use devtools'
   "Emulate CSS prefers-color-scheme".

## Change what gets saved

Saved data lives under the storage keys listed in
[architecture.md](architecture.md#state-and-persistence). The modules merge saved JSON over
defaults, so adding a field is backward compatible. Renaming or removing one isn't: old
saves would still hold the old field. To make a breaking change, change the storage key
(for example, `picross:v1` to `picross:v2`) and accept that existing progress resets, or
migrate the old data when it's read.
