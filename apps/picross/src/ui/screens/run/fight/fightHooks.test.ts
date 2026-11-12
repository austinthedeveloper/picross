import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Cell } from '@picross/grid/engine/board';
import { lineKey, type Line, type LineSet } from '@picross/grid/engine/lines';
import { Game } from '@picross/grid/game/game';
import { createBoardView, type BoardView } from '@picross/play-grid/ui/board/boardView';
import type { BoardControls } from '@picross/play-grid/ui/screens/gameScreen';
import { catalog } from '@picross/story/puzzles/gadgets';
import { trace } from '../../../../game/fightTrace';
import { startRun } from '../../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../../game/runSave';
import { getEncounter } from '../../../../puzzles/runs';
import { fightHooks } from './index';

/**
 * The fight screen's hooks, played in jsdom (#163). Every call they make on the battle
 * bar, the board view, the game, sound and haptics is logged in order, with the saved
 * battle, the run's HP and a digest of the bar's and board's DOM after every step. So any
 * change to what a fight shows, says, plays or saves shows up as a diff in
 * `__snapshots__/fightHooks.test.ts.snap`. It was recorded on the hooks as they were
 * before the fight rules moved into `game/fight.ts`, to prove the move changed nothing.
 * And the saved battle after every step must be the one the headless traces play
 * (`game/fightTrace.ts`, the same script), so those traces are what the screen does.
 *
 * The script: a fixed line order from the solution (fewest filled cells first, rows
 * before columns), each line one stroke that fills its cells and marks the rest. Every
 * 10th step a wrong fill comes first (Hits on). After step 1 a clue that isn't a suspect
 * is accused, then every suspect. Some cases use gadgets at set steps, and some play
 * Relaxed. A switching boss stops at the switch.
 */

const { log, fmt } = vi.hoisted(() => {
  const log: string[] = [];
  const isLineSet = (v: object): v is { rows: number[]; cols: number[] } =>
    'rows' in v && 'cols' in v && Object.keys(v).length === 2;
  const fmt = (v: unknown): string => {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'function') return 'fn';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (typeof HTMLElement !== 'undefined' && v instanceof HTMLElement) {
      const attrs = ['aria-label', 'aria-pressed', 'aria-expanded', 'title', 'disabled', 'role']
        .filter((a) => v.hasAttribute(a))
        .map((a) => `${a}=${JSON.stringify(v.getAttribute(a))}`);
      const cls = v.className ? `.${String(v.className).split(' ').join('.')}` : '';
      return `<${v.tagName.toLowerCase()}${cls}${attrs.length ? ` ${attrs.join(' ')}` : ''}>${JSON.stringify(v.textContent)}`;
    }
    if (v instanceof Map) return `Map{${[...v].map(([k, x]) => `${k}:${fmt(x)}`).join(' ')}}`;
    if (Array.isArray(v)) return `[${v.map(fmt).join(' ')}]`;
    if ('kind' in v && 'index' in v && Object.keys(v).length === 2) {
      const { kind, index } = v as { kind: string; index: number };
      return `${kind === 'row' ? 'r' : 'c'}${index}`;
    }
    if (isLineSet(v)) return `{r${v.rows.join(',')} c${v.cols.join(',')}}`;
    return JSON.stringify(v);
  };
  return { log, fmt };
});

/** Wraps an object so each method call is logged as `name.method(args)`. */
function logged<T extends object>(target: T, name: string): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        log.push(`${name}.${String(key)}(${args.map(fmt).join(', ')})`);
        return value.apply(obj, args);
      };
    },
  });
}

vi.mock('@picross/shared/ui/sound', async (actual) => ({
  ...(await actual<object>()),
  playSound: (sound: string, delay = 0) => log.push(`sound ${sound}${delay ? ` +${delay}` : ''}`),
}));

vi.mock('@picross/shared/ui/haptics', async (actual) => ({
  ...(await actual<object>()),
  haptic: (kind: string) => log.push(`haptic ${kind}`),
}));

vi.mock('@picross/story/ui/components/battleBar', async (actual) => {
  const real = await actual<typeof import('@picross/story/ui/components/battleBar')>();
  return {
    ...real,
    createBattleBar: (...args: Parameters<typeof real.createBattleBar>) => {
      const bar = real.createBattleBar(...args);
      return new Proxy(bar, {
        get(obj, key, receiver) {
          const value = Reflect.get(obj, key, receiver);
          if (typeof value !== 'function') return value;
          return (...a: unknown[]) => {
            log.push(`bar.${String(key)}(${a.map(fmt).join(', ')})`);
            return (value as (...x: unknown[]) => unknown).apply(obj, a);
          };
        },
      });
    },
  };
});

/** A short, stable digest of some DOM, so a step can say "nothing else changed" cheaply. */
function digest(...nodes: HTMLElement[]): string {
  let h = 0x811c9dc5;
  for (const node of nodes) {
    // Without the board's id, which counts boards made so far.
    const s = node.outerHTML.replace(/board\d+/g, 'board');
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

interface Case {
  /** The encounter to fight. */
  id: string;
  relaxed?: boolean;
  /** Gadgets the run holds. */
  gadgets?: string[];
  /** Gadget names to use after a step (`Use <name>` buttons). */
  use?: Record<number, string>;
}

const cases: Case[] = [
  { id: 'gremlin', gadgets: ['patch-kit', 'bomb'], use: { 2: 'Patch kit', 6: 'Bomb' } },
  { id: 'clockwork-owl' },
  { id: 'armored-beetle' },
  { id: 'armored-beetle', relaxed: true },
  { id: 'mimic' },
  { id: 'forger' },
  { id: 'forger', relaxed: true },
  { id: 'electric-eel', gadgets: ['patch-kit'], use: { 1: 'Patch kit' } },
  { id: 'electric-eel', relaxed: true },
  { id: 'cuttlefish', gadgets: ['sponge', 'bomb'], use: { 12: 'Sponge', 14: 'Bomb' } },
  { id: 'weathervane' },
  { id: 'curator' },
  { id: 'old-wyrm', gadgets: ['bomb', 'bomb'], use: { 3: 'Bomb', 25: 'Bomb' } },
  { id: 'ostrander' },
];

const lineName = (l: Line) => lineKey(l.kind, l.index);

function play(c: Case): { text: string; battles: Map<number, string> } {
  const encounter = getEncounter(c.id);
  if (!encounter?.enemy) throw new Error(`${c.id}: not a fight`);
  saveCurrentRun(startRun('harness', 999, c.relaxed ? 'relaxed' : 'hearts', c.gadgets ?? []));
  log.length = 0;
  const out: string[] = [];
  const battles = new Map<number, string>();
  let blocked = false;
  const fight = fightHooks(encounter.enemy, encounter.puzzle, () => {
    log.push('onBlock');
    blocked = true;
  });
  const { hooks } = fight;
  const game = new Game(fight.puzzle, undefined, c.relaxed ? 'relaxed' : 'battle');
  const raw = createBoardView(fight.puzzle);
  // What tapping a clue does while calling out (`BoardView.pickClue`).
  const clue: { pick: ((line: Line) => void) | null } = { pick: null };
  const view = new Proxy(raw, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver);
      if (typeof value !== 'function') return value;
      return (...a: unknown[]) => {
        if (key === 'pickClue') clue.pick = a[0] as typeof clue.pick;
        log.push(`view.${String(key)}(${a.map(fmt).join(', ')})`);
        return (value as (...x: unknown[]) => unknown).apply(obj, a);
      };
    },
  }) as BoardView;
  let solvedShown = false;
  let endedShown = false;

  // The game screen's redraw and refresh, as far as the hooks can tell.
  const redraw = () => {
    const completed = raw.update(game.board);
    if (completed.length && !game.solved) {
      const extra = hooks.onLinesComplete?.(completed);
      log.push(`complete ${completed.map(fmt).join(' ')}: ${fmt(extra)}`);
    }
  };
  const refresh = () => {
    redraw();
    const ended = hooks.ended?.();
    if (ended && !endedShown) {
      endedShown = true;
      log.push(`ended ${ended.title}: ${ended.note}`);
    }
    if (game.solved && !solvedShown) {
      solvedShown = true;
      log.push(`land ${fight.land()} as ${fight.name()}`);
    }
  };
  const controls: BoardControls = {
    game: logged(game, 'game'),
    refresh: () => {
      log.push('controls.refresh()');
      refresh();
    },
  };
  hooks.onBoard?.(view, controls);
  refresh();

  /** One stroke, as a drag does it: pointer down, preview, pointer up, commit, refresh. */
  const stroke = (changes: { index: number; from: Cell; to: Cell }[]) => {
    raw.root.dispatchEvent(new Event('pointerdown'));
    const { applied, mistake } = game.preview(changes);
    redraw();
    if (mistake) log.push(`mistake: ${fmt(hooks.onMistake?.())}`);
    raw.root.dispatchEvent(new Event('pointerup'));
    game.commit(applied);
    refresh();
  };

  const gadgetButton = (name: string): HTMLButtonElement | undefined => {
    const shown = fight.hooks.header!.querySelectorAll<HTMLButtonElement>('button.gadget');
    return [...shown].find((b) => b.ariaLabel?.startsWith(`Use ${name}`));
  };
  const callOutButton = () =>
    fight.hooks.header!.querySelector<HTMLButtonElement>('button.call-out') ?? undefined;

  let lastBattle: Record<string, unknown> = {};
  let lastKeys = '';
  const record = (label: string, step = 0) => {
    vi.runAllTimers();
    const run = getCurrentRun()!;
    if (step) battles.set(step, JSON.stringify(run.battle));
    // The saved battle as it's written (key order too), as what changed since the last step.
    const battle = JSON.parse(JSON.stringify(run.battle ?? {})) as Record<string, unknown>;
    const parts = [label, ...log.splice(0)];
    const keys = Object.keys(battle).join(',');
    if (keys !== lastKeys) parts.push(`keys ${keys}`);
    lastKeys = keys;
    const changed = [...new Set([...Object.keys(lastBattle), ...Object.keys(battle)])].flatMap(
      (key) => {
        const [was, now] = [JSON.stringify(lastBattle[key]), JSON.stringify(battle[key])];
        if (was === now) return [];
        const before = lastBattle[key];
        const after = battle[key];
        if (
          Array.isArray(before) &&
          Array.isArray(after) &&
          was.slice(0, -1) === now.slice(0, was.length - 1)
        ) {
          return [`${key}+=${JSON.stringify(after.slice(before.length))}`];
        }
        return [`${key}=${now ?? 'undefined'}`];
      },
    );
    if (changed.length) parts.push(`battle ${changed.join(' ')}`);
    lastBattle = battle;
    parts.push(
      `run hp ${run.hp} ${run.status} gadgets ${fmt(run.gadgets)} dom ${digest(fight.hooks.header!, raw.root)}`,
    );
    out.push(parts.join('\n  '));
  };
  record('start');

  const limit = (game.puzzle.width + game.puzzle.height) * 3;
  for (let step = 1; step <= limit && !game.solved && !blocked && !endedShown; step++) {
    const { solution } = game.puzzle;
    const { width: w, height: h } = solution;
    const lines: (Line & { cells: number[] })[] = [
      ...Array.from({ length: h }, (_, r) => ({
        kind: 'row' as const,
        index: r,
        cells: Array.from({ length: w }, (_, k) => r * w + k),
      })),
      ...Array.from({ length: w }, (_, col) => ({
        kind: 'col' as const,
        index: col,
        cells: Array.from({ length: h }, (_, k) => k * w + col),
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
    if (step % 10 === 0 && !c.relaxed) {
      const wrong = solution.cells.findIndex((s, i) => !s && game.board.cells[i] === Cell.Empty);
      if (wrong >= 0) stroke([{ index: wrong, from: Cell.Empty, to: Cell.Filled }]);
    }
    const changes = line.cells.flatMap((index) => {
      const to = solution.cells[index] ? Cell.Filled : Cell.Marked;
      const from = game.board.cells[index];
      return from === to ? [] : [{ index, from, to }];
    });
    stroke(changes);
    if (step === 1 && !game.solved) {
      const suspects: LineSet = getCurrentRun()!.battle?.suspects ?? { rows: [], cols: [] };
      const accused = [
        ...suspects.rows.map((index) => ({ kind: 'row' as const, index })),
        ...suspects.cols.map((index) => ({ kind: 'col' as const, index })),
      ];
      if (accused.length) {
        // A clue that isn't a suspect first: it only says so and keeps picking.
        const honest = lines.find(
          (l) => !accused.some((a) => a.kind === l.kind && a.index === l.index),
        );
        callOutButton()?.click();
        if (honest) clue.pick?.({ kind: honest.kind, index: honest.index });
        clue.pick?.(accused[0]);
        vi.runAllTimers();
        for (const suspect of accused.slice(1)) {
          const button = callOutButton();
          if (!button) break;
          button.click();
          clue.pick?.(suspect);
          vi.runAllTimers();
        }
      }
    }
    const gadget = c.use?.[step];
    if (gadget && !game.solved) {
      vi.runAllTimers();
      const button = gadgetButton(gadget);
      log.push(
        `use ${gadget}${button ? '' : ' (no button)'}${button?.disabled ? ' (disabled)' : ''}`,
      );
      button?.click();
    }
    record(`${step} ${lineName(line)}`, step);
  }
  if (!game.solved && !blocked && !endedShown) out.push('stopped: the script never finished');
  out.push(`saved ${JSON.stringify(getCurrentRun())}`);
  return { text: out.join('\n'), battles };
}

describe('fight hooks in jsdom (#163)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    // A bomb lands where Math.random says; the same every time here.
    let seed = 1;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (Math.imul(seed, 48271) >>> 0) % 0x7fffffff;
      return seed / 0x7fffffff;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it.each(cases.map((c) => [`${c.id}${c.relaxed ? ' relaxed' : ''}`, c] as const))('%s', (_, c) => {
    const { text, battles } = play(c);
    expect(text).toMatchSnapshot();
    // The headless trace saves the same battle, byte for byte, after every step.
    const ids = Object.fromEntries(
      Object.entries(c.use ?? {}).map(([step, name]) => [
        step,
        catalog.find((g) => g.name === name)!.id,
      ]),
    );
    const headless = new Map<number, string>();
    trace(getEncounter(c.id)!, { relaxed: c.relaxed, use: ids }, (step, state) =>
      headless.set(step, JSON.stringify(state)),
    );
    for (const [step, battle] of battles) expect(headless.get(step), `step ${step}`).toBe(battle);
  });
});
