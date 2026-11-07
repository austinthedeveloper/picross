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
4. Add the id to `ORDER` in `src/puzzles/index.ts`, at the position where it should appear
   among puzzles of its size. Ids not listed in `ORDER` still load, but they go at the end
   of their size. Adding a 15×15 or bigger changes the daily cycle, which shuffles this list.
5. Run `npm run check:puzzles`. CI runs the same check and fails on ambiguous puzzles.
6. Run `npm run rate:puzzles` to rate the new puzzle's difficulty. A test fails until you do.

You can also write the JSON by hand: `id`, `name`, `width`, `height`, and `solution` (one
string per row, `#` filled and `.` empty). `parsePuzzle` validates it at startup. The pack test expects square
puzzles from 5×5 to 20×20, with at least half of them 15×15 or larger. The puzzle list
groups puzzles by size, smallest first, so a new size gets its own section automatically.

### Add many at once with a sheet

For a batch, write them in one text file instead of one JSON each. The themed batches
live in `src/puzzles/sheets/` and are the source for their JSON; edit a drawing there and
re-export. A sheet is puzzles separated by blank lines: the name on the first line (optionally `| id=<id>`), then the
rows of `#` and `.`:

```
Wizard Hat
.......#.......
......###......
...
```

Then:

```bash
npx vite-node scripts/puzzle-sheet.ts check src/puzzles/sheets/dungeon.txt
```

prints ✓ per puzzle, or the picture with `?` on the cells the solver can't decide, and
flags ids that already exist and pictures outside 25–70% fill. `fix` flips a few cells to
make an ambiguous puzzle unique (look at the result; redraw by hand if it spoils the
picture), and `export <outdir> <sheets...>` writes the JSON files. Then add the new ids to
`ORDER` in `src/puzzles/index.ts`. Draw the silhouette first, fill 35–60% of the grid, and
avoid checkerboards, lone pixels and sparse symmetric detail, which are what make a
picture ambiguous.

## Add a mural

Add `src/puzzles/murals/<id>.json` with `id`, `name`, `order`, `tile` (usually 15) and
`solution` rows whose width and height are multiples of `tile`. It shows up in the murals
section. `npm test` checks each tile is uniquely solvable on its own. While drawing, this
renders the picture and shows `?` on the cells a tile can't decide:

```bash
npx vite-node scripts/puzzle-sheet.ts mural src/puzzles/murals/whale.json
```

If a tile fails, change a detail inside it, or run `mural-fix` in place of `mural` to flip
cells for you and then look for warts. Sparse tiles fail most: give empty sky a moon, a
cloud band or chunky stars rather than single pixels.

## Change the How to play tutorial

The steps are data in `src/puzzles/tutorial.ts`: a title, the text, the lines to highlight,
and the cells to fill or mark. `tutorial.test.ts` checks that each step's cells really follow
from its lines and the steps before it, so the lesson can't teach a guess. Text that names a
row or column counts from 1, as players do; the code counts from 0.

## Add an encounter or a run

1. Add the encounter's puzzle. Run-only puzzles go in `src/puzzles/run/`, so they stay off
   the puzzle list but still get the uniqueness check. You can also reuse a pack puzzle.
2. Add `src/puzzles/encounters/<id>.json`:
   ```json
   { "id": "goblin", "name": "Goblin", "kind": "fight", "puzzle": "sword", "blurb": "..." }
   ```
   `kind` is `fight`, `dig`, or `rest`, and `blurb` is optional. A rest stop needs
   `"rest": { "seconds": 90, "heal": 4 }` and a small puzzle. Fights also need an enemy:
   ```json
   "enemy": { "name": "Goblin", "sprite": "👺", "hp": 30, "attack": 2 }
   ```
   Keep `hp` at least 1.5 × (width + height) so the finisher stays the big hit. A test
   enforces this. `attack` is the run HP lost per wrong fill in Hits-on runs. `sprite` is a
   file name from `public/art/enemies/` without the `.png`, or an emoji until the art exists.
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
   For a boss, add `"boss": true`, an optional `"scene": "<scene id>"` that plays before the
   fight, and `phases` on the enemy:
   ```json
   "phases": [
     { "at": 0.9, "name": "Overcharged Gremlin", "sprite": "😈", "attack": 3,
       "taunt": "Lights out!", "fog": { "rows": [1, 7, 14, 4, 9] }, "fogCount": 3 }
   ]
   ```
   A phase can also set `"swap": true` to swap and wipe two of the player's rows or columns (the Mimic); the wiped lines stay marked until refilled. To
   scramble clue order (the Owl), add `"scramble": { "rows": [...], "cols": [...] }` to the
   enemy, or a `scramble` pool with `scrambleCount` to a phase. Only lines with at least
   two different run lengths can be scrambled. For armor (the Beetle), add
   `"armor": { "weakPoints": { "rows": [8], "cols": [2] }, "attack": 4 }`; pick weak points
   that take some work, not lines solved in the first pass. For forged clues (the
   Forger), add `"fakes": { "rows": [3, 7, 13] }` and `"suspects"`: the lines marked 🎭,
   holding every fake plus at least one honest line. The forgeries are generated for you;
   the suite checks the puzzle is still solvable with every suspect unread. Sets of rows
   only or columns only work best. For a charge meter (the Eel), add `"charge": 5`
   (lines to fill it, 2 or more) to the enemy or a phase. For ink (the Cuttlefish), give a phase
   `"ink": 4` (block size) and optionally `"inkCount": 2`. To turn the board (the
   Weathervane), add `"rotate": 6` (lines per quarter turn, 2 or more) to the enemy or a
   phase. Only square puzzles can turn, and a lopsided picture shows it best. Write every
   line index as drawn: phase pools turn with the board.
   Phases trigger in order at decreasing `at` values. A phase's `fog` is a pool, and it fogs
   up to `fogCount` unsolved lines from it. Line damage is 1 per line and columns mostly
   finish late, so set `at` high (0.8–0.9) for a phase to land mid-solve. To find a fog
   pool that stays solvable, try sets with the solver; the test suite checks the starting
   fog plus every pool together.

A new job also needs a chapter: add its id to a chapter's `jobs` in
`src/puzzles/chapters/`, or start a new chapter (below). Load fails if a job is in no
chapter or in two.

## Add a chapter

Chapters (#23) group jobs on the jobs board. Add `src/puzzles/chapters/<id>.json`:

```json
{
  "id": "after-hours",
  "title": "After Hours",
  "order": 2,
  "blurb": "Word gets around.",
  "jobs": ["night-shift"],
  "opening": "after-hours-opening"
}
```

`order` sets the chapter number. A chapter opens when its first job unlocks, so give
that job `requires` from the chapter before. `opening` is an optional scene that plays
the first time the chapter opens and can be replayed from the board.

A chapter's number comes from its `order`, and each opening's first line usually repeats
it ("Chapter 3: Deep Water"), so renumbering means editing that line too. To add chapters
before an existing one, change the later chapter's `order` and point its first job's
`requires` at the new job before it, and set the job's own `order` to match. **Wound Up**
(the Curator's return) leaves the number out of its opening and doesn't refer to any
particular chapter, so moving it needs only those `order` and `requires` changes.

Run-only puzzle ids can't match any pack puzzle. `puzzle-sheet.ts check` doesn't catch
that, but `npm test` does. For how hard to make a new fight, see Difficulty in
[architecture.md](architecture.md).

## Add a gadget

1. Add an entry to the catalog in `src/puzzles/gadgets.ts` with an id, name, icon (the
   emoji that stands for it in text), one-line description, and effect. Its art goes in
   `public/art/gadgets/<id>.png`, and a test checks that it's there.
2. If the effect is a new kind, add it to the `GadgetEffect` union, handle it in
   `useGadget` in `src/game/battle.ts` (with a test in `battle.test.ts`), and give it
   feedback in `use()` in `src/ui/screens/run/fight/gadgets.ts`.
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
4. Add `"backdrop": "<id>"` next to the scene's `id` to show where it happens, using a file
   from `src/puzzles/backdrops/`. A test fails if a scene that plays doesn't have one. Only a
   run's outro goes without, because it's text on the results screen.
5. Run `npm test`. Bad references fail at load.

Keep lines short (phone screens), and each scene under a minute to read.

The stage holds three portraits. Characters walk on when they first speak, and a fourth
replaces whoever has been quiet longest.

## Add a backdrop

Add `src/puzzles/backdrops/<id>.json` with an `id` and `rows` of `#` and `.`, like a puzzle's
solution, and point a scene at it. See [art direction](art-direction.md#backdrops) for how to
draw one. A test fails if no scene uses it.

## Review the script

To read every line in the game and leave notes on them:

```bash
npm run script-review
```

Then open http://localhost:4177. It regenerates the site each time it starts, so restart it
to pick up new writing. There's one chat page per chapter in play order (scenes, map blurbs,
and enemy taunts with their sprites), plus a page for power tips, gadgets, and the tutorial.
Scenes come from the game's own modules, so a new scene appears without any setup, even
before it's hooked up to a job.

Choose **+ Note** on a line or heading, pick Change, Question, or Love it, and save. Notes go to
`.script-review/notes.json` in the main checkout, even when run from a worktree, so they outlive
the worktree and every session sees the same ones. The file is ignored by git.

To act on the notes, ask Claude to read them, or run:

```bash
npm run script-review:notes
```

This prints the open notes as Markdown, with counts by kind and speaker, and the file to edit
for each line. Add `-- --all` to include resolved notes, or `-- --json` for the raw data. Close
one with what was done, which then shows under the note on the site:

```bash
npx vite-node scripts/script-review.ts resolve <id> "Shortened the line."
```

Notes survive rewrites. A line that moved is found again by its wording. A reworded line keeps
its note and shows what it used to say. A deleted line's note moves to the Notes page.

### Rewrite the script with another AI

The home page has **Export everything**, and each chapter has **Export JSON**. Either downloads
the writing in play order with your open notes beside the lines, plus instructions for whoever
rewrites it. Scenes come with their structure, so a rewrite can add, cut, and reorder lines,
branches, and choices. Names, labels, and backdrops stay as they are, and text worked out from
other data, like rank thresholds and `Clear <job>.` badges, is left out.

Choose **Import JSON** on the site to bring the result back, in the same format whether it holds
one page or all of them. The import is checked against the game's scene rules and saved as a named
version in `.script-review/versions/`, without changing the game. Open the version from the home
page to read it, with **Show what the game says now** under each changed section.

To put a version in the game, then check it with `git diff` and `npm test`:

```bash
npx vite-node scripts/script-review.ts apply <version>
```

Applying stops if a line was edited after the export, unless you add `--force`. Restart the site
afterwards to see the new script. Anything in code it can't safely replace is printed for you to
change by hand. Notes aren't closed for you, so a rewritten line's note shows what it used to say.

The same steps work from the terminal:

```bash
npm run script-review:export
```

```bash
npx vite-node scripts/script-review.ts export 1 --out chapter-1.json
```

```bash
npx vite-node scripts/script-review.ts import chapter-1.json --as bolder-draft
```

Without `--out`, exports go to `.script-review/exports/`. Add `--apply` to `import` to apply it
in one step. `versions` lists what's saved, and `delete-version <version>` removes one.

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
   handled for you. To follow another sound from the same moment rather than land on top
   of it, pass a delay in seconds: `playSound('live', 0.5)`.
4. If the moment should buzz the phone too, call `haptic('<kind>')` from `ui/haptics.ts`
   (`tap`, `line`, `hit`, or `zap`). It has its own setting, separate from mute.

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

If it's a new enemy power, add it to `Power` and the power lists in `puzzles/enemies.ts`,
then give it an icon, name and one-line tip in `ui/powers.ts`. The suite fails until every
power has a tip.

## Add a color or change the theme

Start from [Art direction](art-direction.md): it says which color is for what and the
rules for adding one (a light, dark, and high-contrast value, and no raw hex outside
`tokens.css`).

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
