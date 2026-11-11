import { Cell, column, row } from '@picross/grid/engine/board';
import { satisfiedClues } from '@picross/grid/engine/clues';
import { fakeClues } from '@picross/grid/engine/fakes';
import { keyToLine, lineCount, lineKey, type Line, type LineSet } from '@picross/grid/engine/lines';
import { turnClue, turnLines } from '@picross/grid/engine/transform';
import { Game } from '@picross/grid/game/game';
import { getGadget } from '@picross/story/puzzles/gadgets';
import type { Encounter } from '../puzzles/runs';
import { currentForm, finish, startBattle, turnedPuzzle, type BattleState } from './battle';
import { gridStep, type FightEvent, type FightInput } from './fight';

/**
 * A 2D fight played headless through `gridStep` (#163), for the golden traces
 * (`fightTraces.test.ts`) and the fight screen's harness (`fightHooks.test.ts`), which
 * holds the screen's saved battle against this one step for step. Only tests import it,
 * so none of it is in the app's download.
 *
 * The board is a real `Game`, and the lines it reports are the board view's: a line whose
 * shown clue (its forgery, while it stands) just became satisfied. What waits (`Later`)
 * runs in order once the step's strokes are over, as the screen's timers do.
 *
 * The script: each step finishes the next unfinished line, fewest filled cells first and
 * rows before columns, in one stroke that fills its cells and marks the rest. A line a
 * swap wiped comes back round. Every 10th step a wrong fill comes first (Hits on). After
 * step 1 a clue that isn't a suspect is accused, then each suspect while forgeries are
 * left. Gadgets are used after the steps the script says (a bomb's blast seeded). A boss
 * that switches board plays on flat, as Endless does. Each step records its events and
 * the enemy's HP, and the rest of the battle when it changes.
 */

/** How a fight is played: Hits on unless `relaxed`, with gadgets used after some steps. */
export interface Script {
  relaxed?: boolean;
  use?: Record<number, string>;
}

/** The traces' script: Hits on, a patch kit after step 2 and a bomb after step 6. */
export const SCRIPT: Script = { use: { 2: 'patch-kit', 6: 'bomb' } };

const key = (l: Line) => lineKey(l.kind, l.index);
const keys = (lines: readonly Line[]) => lines.map(key).join(' ');
const size = (set?: LineSet) => (set ? lineCount(set) : 0);

function event(e: FightEvent): string {
  switch (e.kind) {
    case 'phase': {
      const board = [...e.entered].reverse().find((p) => p.board)?.board;
      return `phase ${e.phase}${board ? ` to ${board}` : ''}`;
    }
    case 'later':
      return `later ${e.do}${e.do === 'swap' ? ` ${e.count}` : ''}${e.do === 'ink' ? ` ${e.splashes.map((s) => `${s.count ?? 1}×${s.size}`).join(' ')}` : ''}`;
    case 'cracked':
      return `cracked ${keys(e.lines)}${e.broke ? ' broke' : ''}`;
    case 'fog-lifted':
    case 'refilled':
    case 'honest':
    case 'unscrambled':
      return `${e.kind} ${keys(e.lines)}`;
    case 'washed':
      return `washed ${e.cells.length}`;
    case 'chip':
      return `chip ${e.dealt}${e.lines ? '' : ' (none counted)'}`;
    case 'armor-meter':
      return `armor ${e.lines}${e.hits ? ` hits ${e.hits}` : ''}`;
    case 'turn-meter':
      return `turning ${e.turning}/${e.limit}`;
    case 'charge':
      if (!e.limit) return '';
      if (e.warmUp) return `warm ${e.warmUp}`;
      return `charge ${e.charged}/${e.limit} live ${e.live ? key(e.live) : '-'}${e.fresh ? ' new' : ''}`;
    case 'hit':
      return `hit ${e.amount} ${e.cause}`;
    case 'blocked':
      return `blocked ${e.cause}`;
    case 'fizzled':
      return `fizzled ${e.cause}`;
    case 'not-suspect':
    case 'accused':
      return `${e.kind} ${key(e.line)}`;
    case 'caught':
      return `caught ${key(e.line)} ${e.dealt}`;
    case 'healed':
      return `healed ${key(e.line)} ${e.amount}`;
    case 'gadget':
      if (e.effect === 'wash') return `washed ${e.washed.length}`;
      return e.effect === 'blast' ? `blast ${e.dealt}` : 'shielded';
    case 'damaged':
      return `damaged ${e.dealt}`;
    case 'turned':
      return `turned ${e.turns}`;
    case 'swapped':
      return `swapped ${e.swap.kind}s ${e.swap.lines.join(' ')} wiped ${e.swap.cells.length}`;
    case 'inked':
      return `inked ${e.added}`;
    case 'blasted':
      return `blasted r${e.blast.row} c${e.blast.col}${e.washed.length ? ` washed ${e.washed.length}` : ''}`;
    case 'grounded':
    case 'zapped':
      return e.kind;
  }
}

/** The rest of the battle in a line (besides HP): what a step can change. */
function summary(f: Fight): string {
  const s = f.state;
  const form = currentForm(f.enemy, s);
  const parts = [`phase ${s.phase ?? 0}`, `attack ${form.attack}`];
  if (size(s.fog)) parts.push(`fog ${size(s.fog)}`);
  if (size(s.scramble)) parts.push(`scramble ${size(s.scramble)}`);
  if (s.armor) parts.push(`armor ${size(s.armor)} lines ${s.armorLines ?? 0}`);
  if (s.fakes || s.suspects) parts.push(`suspects ${size(s.suspects)} fakes ${size(s.fakes)}`);
  if (size(s.wiped)) parts.push(`wiped ${size(s.wiped)}`);
  if (s.ink?.length) parts.push(`ink ${s.ink.length}`);
  if (form.charge) {
    const live = s.live ? key(s.live) : '-';
    parts.push(`charge ${s.charged ?? 0}/${form.charge} live ${live} warm ${s.warmUp ?? '-'}`);
  }
  if (form.rotate) parts.push(`turns ${s.turns ?? 0} turning ${s.turning ?? 0}/${form.rotate}`);
  if (s.shield) parts.push(`shield ${s.shield}`);
  return parts.join(' ');
}

/** A fight on a headless board, run the way the fight screen runs it. */
class Fight {
  state: BattleState;
  puzzle: Encounter['puzzle'];
  readonly game: Game;
  readonly events: string[] = [];
  finished = false;
  private strokes = 0;
  private swaps = 0;
  private readonly queue: (() => void)[] = [];
  /** Whether each line's shown clue was satisfied at the last look (rows, then columns). */
  private complete: boolean[] = [];
  /** Set when the clues change under the board (a turn): the next look reports nothing. */
  private first = true;
  /** Where each bomb lands, the same every time. */
  private seed = 1;

  constructor(
    readonly enemy: NonNullable<Encounter['enemy']>,
    readonly drawn: Encounter['puzzle'],
    readonly hitsOn: boolean,
  ) {
    this.state = startBattle(enemy);
    this.puzzle = drawn;
    this.game = new Game(drawn, undefined, hitsOn ? 'battle' : 'relaxed');
    // The board appears: the charge aims, the turn's meter shows, the board is looked at.
    this.step({ kind: 'aim', board: this.game.board });
    this.later(() => this.turn());
    this.refresh();
  }

  rand = () => {
    this.seed = (Math.imul(this.seed, 48271) >>> 0) % 0x7fffffff;
    return this.seed / 0x7fffffff;
  };

  /** Runs one step and queues what it says waits. */
  step(input: FightInput): FightEvent[] {
    const { state, events } = gridStep(this.enemy, this.puzzle, this.state, input);
    this.state = state;
    // A fight without a charge aims at nothing; that's not worth a word.
    this.events.push(...events.map(event).filter(Boolean));
    for (const e of events) {
      if (e.kind !== 'later') continue;
      if (e.do === 'aim') this.later(() => this.step({ kind: 'aim', board: this.game.board }));
      else if (e.do === 'sync-turn') this.later(() => this.later(() => this.turn()));
      else if (e.do === 'turn') this.later(() => this.turn());
      else if (e.do === 'swap') {
        this.swaps += e.count;
        this.later(() => this.swap());
      } else if (e.do === 'ink') {
        const { splashes } = e;
        this.later(() => {
          for (const s of splashes) this.step({ kind: 'ink', ...s, board: this.game.board });
        });
      } else if (e.do === 'zap' || e.do === 'hit-back') {
        const kind = e.do;
        this.later(() => {
          if (this.finished) return;
          this.step({ kind, hitsOn: this.hitsOn });
          this.refresh();
        });
      } else if (e.do === 'blast') {
        this.later(() => {
          const events = this.step({ kind: 'blast', board: this.game.board, rand: this.rand });
          const blasted = events.find((x) => x.kind === 'blasted');
          if (!blasted) return;
          // The board shows the truth where it went off.
          this.game.reveal(blasted.blast.cells);
          this.refresh();
        });
      }
    }
    return events;
  }

  private later(task: () => void) {
    this.queue.push(task);
  }

  /** Runs everything waiting, in order, as the screen's timers do. */
  flush() {
    for (let task = this.queue.shift(); task; task = this.queue.shift()) task();
  }

  /** The lines whose shown clue just became satisfied, as the board view reports them. */
  private look(): Line[] {
    const { width: w, height: h } = this.puzzle;
    const forged = this.forgeries();
    const lines: Line[] = [
      ...Array.from({ length: h }, (_, index) => ({ kind: 'row' as const, index })),
      ...Array.from({ length: w }, (_, index) => ({ kind: 'col' as const, index })),
    ];
    const completed: Line[] = [];
    lines.forEach((line, i) => {
      const cells =
        line.kind === 'row'
          ? row(this.game.board, line.index)
          : column(this.game.board, line.index);
      const clue =
        forged.get(key(line)) ??
        (line.kind === 'row' ? this.puzzle.clues.rows : this.puzzle.clues.cols)[line.index];
      const done = clue.length
        ? satisfiedClues(cells, clue).every(Boolean)
        : !cells.includes(Cell.Filled);
      if (done && !this.complete[i] && !this.first) completed.push(line);
      this.complete[i] = done;
    });
    this.first = false;
    return completed;
  }

  /** The forgeries on show: forged from the clues as drawn, then turned with the board. */
  private forgeries(): Map<string, number[]> {
    const { width, height, clues } = this.drawn;
    const turns = this.state.turns ?? 0;
    const set = this.state.fakes ?? { rows: [], cols: [] };
    const drawn = fakeClues(width, height, clues, turnLines(set, width, -turns));
    return new Map(
      [...drawn].map(([k, clue]) => {
        const turned = turnClue(keyToLine(k), clue, width, turns);
        return [key(turned.line), turned.clue] as const;
      }),
    );
  }

  /** The game screen's redraw: lines the board reports count, unless the picture's done. */
  private redraw() {
    const completed = this.look();
    if (completed.length && !this.game.solved) {
      this.step({ kind: 'lines', lines: completed, board: this.game.board });
    }
  }

  /** The game screen's refresh: redraw, and the finisher once the picture's solved. */
  refresh() {
    this.redraw();
    if (this.game.solved && !this.finished) {
      this.finished = true;
      this.events.push(`finisher ${finish(this.state).dealt}`);
    }
  }

  /** One stroke, as a drag does it: preview, the stroke ends, commit, refresh. */
  stroke(changes: { index: number; from: Cell; to: Cell }[]) {
    this.strokes++;
    const { applied, mistake } = this.game.preview(changes);
    this.redraw();
    if (mistake) this.step({ kind: 'mistake' });
    this.strokes--;
    if (this.swaps) this.later(() => this.swap());
    this.later(() => this.turn());
    this.game.commit(applied);
    this.refresh();
  }

  private swap() {
    if (this.strokes > 0) return;
    for (; this.swaps > 0; this.swaps--) {
      const events = this.step({ kind: 'swap', board: this.game.board });
      const swapped = events.find((e) => e.kind === 'swapped');
      if (!swapped) continue;
      this.game.wipe(swapped.swap.cells);
      this.refresh();
    }
  }

  private turn() {
    if (this.strokes > 0 || this.finished || this.game.over) return;
    const events = this.step({ kind: 'turn' });
    if (!events.length) return;
    this.puzzle = turnedPuzzle(this.drawn, this.state.turns);
    this.game.turn(this.puzzle);
    this.first = true;
    this.step({ kind: 'aim', board: this.game.board });
    this.refresh();
  }

  /** Accuses `line`; the board shows a line a forgery hid, if it's filled. */
  accuse(line: Line) {
    this.step({ kind: 'call-out', line, hitsOn: this.hitsOn });
    this.refresh();
  }

  /** Uses a gadget, if the screen would let you (its button is disabled otherwise). */
  use(id: string) {
    const { effect } = getGadget(id)!;
    if (this.finished) return;
    if (effect.kind === 'shield' && !this.hitsOn) return;
    if (effect.kind === 'wash' && !this.state.ink?.length) return;
    this.events.push(`use ${id}`);
    this.step({ kind: 'gadget', effect });
  }
}

/**
 * Plays a fight and returns its trace. `onStep` sees the battle after every step, so a
 * test can hold it against the screen's (the jsdom harness).
 */
export function trace(
  e: Encounter,
  script = SCRIPT,
  onStep?: (step: number, state: BattleState) => void,
): string {
  const f = new Fight(e.enemy!, e.puzzle, !script.relaxed);
  f.flush();
  const s = () => f.state;
  const out = [
    `start hp ${e.enemy!.hp} ${summary(f)}${f.events.length ? ` | ${f.events.join(', ')}` : ''}`,
  ];
  f.events.length = 0;
  let last = summary(f);
  const limit = (e.puzzle.width + e.puzzle.height) * 3;
  let step = 1;
  for (; step <= limit && !f.finished; step++) {
    const { game } = f;
    const { solution } = game.puzzle;
    const { width: w, height: h } = solution;
    const lines = [
      ...Array.from({ length: h }, (_, r) => ({
        kind: 'row' as const,
        index: r,
        cells: Array.from({ length: w }, (_, k) => r * w + k),
      })),
      ...Array.from({ length: w }, (_, c) => ({
        kind: 'col' as const,
        index: c,
        cells: Array.from({ length: h }, (_, k) => k * w + c),
      })),
    ];
    const filled = (l: { cells: number[] }) => l.cells.filter((i) => solution.cells[i]).length;
    const done = (l: { cells: number[] }) =>
      l.cells.every((i) => (game.board.cells[i] === Cell.Filled) === solution.cells[i]);
    const line = lines
      .map((l, order) => ({ l, order }))
      .sort((a, b) => filled(a.l) - filled(b.l) || a.order - b.order)
      .map(({ l }) => l)
      .find((l) => !done(l));
    if (!line) break;
    if (step % 10 === 0 && !script.relaxed) {
      const wrong = solution.cells.findIndex((x, i) => !x && game.board.cells[i] === Cell.Empty);
      if (wrong >= 0) {
        f.events.push('mistake');
        f.stroke([{ index: wrong, from: Cell.Empty, to: Cell.Filled }]);
      }
    }
    f.stroke(
      line.cells.flatMap((index) => {
        const to = solution.cells[index] ? Cell.Filled : Cell.Marked;
        const from = game.board.cells[index];
        return from === to ? [] : [{ index, from, to }];
      }),
    );
    const forging = () => size(s().fakes) > 0 && !f.finished;
    if (step === 1 && forging()) {
      const suspects = s().suspects ?? { rows: [], cols: [] };
      const accused: Line[] = [
        ...suspects.rows.map((index) => ({ kind: 'row' as const, index })),
        ...suspects.cols.map((index) => ({ kind: 'col' as const, index })),
      ];
      if (accused.length) {
        const honest = lines.find(
          (l) => !accused.some((a) => a.kind === l.kind && a.index === l.index),
        );
        if (honest) f.accuse({ kind: honest.kind, index: honest.index });
        f.accuse(accused[0]);
        f.flush();
        for (const suspect of accused.slice(1)) {
          if (!forging()) break;
          f.accuse(suspect);
          f.flush();
        }
      }
    }
    const gadget = script.use?.[step];
    if (gadget && !f.finished) {
      f.flush();
      f.use(gadget);
    }
    f.flush();
    onStep?.(step, f.state);
    const now = summary(f);
    const changed = now === last ? '' : ` | ${now}`;
    last = now;
    out.push(`${step} ${key(line)}: ${f.events.join(', ') || '-'} | hp ${s().enemyHp}${changed}`);
    f.events.length = 0;
  }
  if (!f.finished) out.push('stopped: the script never finished the picture');
  out.push(`counts ${JSON.stringify(s().counts ?? {})}`);
  return out.join('\n');
}
