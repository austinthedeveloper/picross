import { clueText, type Clue } from '@picross/block/engine/clues';
import {
  dimsLabel,
  indexOf,
  inside,
  lineIdAt,
  pointOf,
  type Axis,
} from '@picross/block/engine/volume';
import { Clock } from '@picross/block/game/clock';
import {
  BROKEN,
  Game,
  MAX_HEARTS,
  PAINTED,
  SOLID,
  type Outcome,
  type Tool,
  type GameMode,
  type SavedBoard,
} from '@picross/block/game/game';
import type { Puzzle } from '@picross/block/puzzles/format';
import { BlockView, type Peel, type Pick } from '../board/blockView';
import { attachInput } from '../board/input';
import { createHintMenu } from '../components/hintMenu';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { createMuteButton } from '@picross/shared/ui/components/muteButton';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '../format';
import { getPlayPrefs } from '../prefs';
import { haptic } from '@picross/shared/ui/haptics';
import { reducedMotion } from '@picross/shared/ui/motion';
import { playSound } from '@picross/shared/ui/sound';

export type ToolChoice = Tool | 'turn';

const TOOLS: { id: ToolChoice; icon: string; label: string; key: string }[] = [
  { id: 'break', icon: '⛏', label: 'Break', key: 'B' },
  { id: 'paint', icon: '🖌', label: 'Paint', key: 'P' },
  { id: 'turn', icon: '🔄', label: 'Turn', key: 'T' },
];

/** Camera views for the snap buttons and number keys: yaw, pitch. */
export const VIEWS = {
  front: [0, 0.12],
  side: [Math.PI / 2, 0.12],
  top: [0, 1.35],
  start: [-0.6, 0.5],
} as const;

const END_NAMES: Record<Axis, Record<Peel['from'], string>> = {
  x: { low: 'left', high: 'right' },
  y: { low: 'bottom', high: 'top' },
  z: { low: 'back', high: 'front' },
};

/** What changed after a stroke, an undo, a redo or a hint. */
export interface Change {
  outcome: Outcome | 'undo' | 'redo' | 'hint' | 'reset';
  /** Lines with a shown clue that just became finished. */
  newlyDone: number[];
}

/** Ways a mode (the tutorial, a story fight) shapes play. */
export interface PlayHooks {
  /** Whether the player may use `tool` on `cell` now; false refuses it quietly. */
  allow?(tool: Tool, cell: number): boolean;
  /** The clues hints may reason from (a fight's, without fog or forgeries). */
  hintClues?(): (Clue | null)[];
  /** X or Space on the keyboard cursor's cube; true takes it (a call-out by keyboard). */
  keyPick?(cell: number): boolean;
  /** A press on a cube face; true takes it (no stroke). For calling out a forged clue. */
  pick?(pick: Pick): boolean;
  changed?(change: Change): void;
  orbited?(): void;
  peeled?(axis: Axis, layers: number): void;
  /** Solved: the panel's contents (null for no panel). Default: a plain "Solved!". */
  solved?(time: number): Node[] | null;
  /** Out of hearts: the panel's contents. Default: a Retry panel. */
  failed?(): Node[] | null;
}

export interface PlayOptions {
  puzzle: Puzzle;
  /** The heading: the puzzle's name, or its number before it's solved. */
  title: string;
  mode: GameMode;
  saved?: SavedBoard;
  hints?: boolean;
  hooks?: PlayHooks;
  /** Extra buttons for the toolbar's left end. */
  toolbar?: HTMLElement[];
  /** The top bar's back link. Default: Home. */
  back?: HTMLElement;
  /** Where Home and "All puzzles" lead: the game's puzzle list. Default: `#/`. */
  home?: string;
}

export interface Play {
  game: Game;
  view: BlockView;
  clock: Clock;
  screen: HTMLElement;
  title: HTMLElement;
  /** A slot above the block for instructions (the tutorial) or a battle bar. */
  coach: HTMLElement;
  panel: HTMLElement;
  announce(text: string): void;
  /** Redraws everything after something outside changed the game. */
  refresh(): void;
  /** Shows the end panel with these contents. */
  showPanel(content: Node[]): void;
  /** Lines with a shown clue whose leftover cubes match it. */
  doneLines(): Set<number>;
  setTool(tool: ToolChoice): void;
  /** Stops play for good (knocked out): no more moves, the clock stops. */
  lock(): void;
  /** Tears it down. Returns the clock's time (for saving). */
  cleanup(): number;
}

/**
 * The play screen: a block, its tools, and everything around it. Free play, the tutorial
 * and story fights all build on this, shaping it through `hooks`.
 */
export function createPlay(root: HTMLElement, opts: PlayOptions): Play {
  const { puzzle, hooks = {} } = opts;
  const game = new Game(puzzle, opts.mode, opts.saved);
  const clock = new Clock(game.elapsed);
  let tool: ToolChoice = 'break';
  let locked = false;

  const view = new BlockView(puzzle, game.blocks);
  if (import.meta.env.DEV) Object.assign(window, { __game: game, __view: view });

  const title = el('h1', { textContent: opts.title });
  const size = el('span', { className: 'size', textContent: dimsLabel(puzzle.dims) });
  const hearts = el('span', { className: 'hearts', ariaLabel: 'Hearts' });
  const timer = el('span', { className: 'timer', ariaLabel: 'Time' });

  const undo = el('button', { className: 'icon', textContent: '↶', title: 'Undo (Z)' });
  undo.ariaLabel = 'Undo';
  const redo = el('button', { className: 'icon', textContent: '↷', title: 'Redo (Y)' });
  redo.ariaLabel = 'Redo';
  const reset = el('button', { textContent: 'Reset' });
  const hintMenu = createHintMenu({ line: () => useHint(), check: () => useCheck() });
  hintMenu.root.hidden = opts.hints === false;

  const toolButtons = TOOLS.map((t) =>
    el(
      'button',
      { className: 'toggle tool', title: `${t.label} (${t.key})`, onclick: () => setTool(t.id) },
      [el('span', { textContent: t.icon, ariaHidden: 'true' }), t.label],
    ),
  );

  // Views: snap to a side, or back to the start.
  const viewButtons = (
    [
      ['front', 'Front', '1'],
      ['side', 'Side', '2'],
      ['top', 'Top', '3'],
      ['start', '⟲', '0'],
    ] as const
  ).map(([id, label, key]) =>
    el('button', {
      textContent: label,
      title: `${id === 'start' ? 'Reset the view' : `View from the ${id}`} (${key})`,
      onclick: () => snap(id),
    }),
  );
  viewButtons[3].ariaLabel = 'Reset the view';

  // Peel: each axis keeps its own peel; the slider and flip work on the chosen axis.
  let peelAxis: Axis = 'y';
  const axisButtons = (['x', 'y', 'z'] as const).map((axis) =>
    el('button', {
      className: 'toggle',
      textContent: axis.toUpperCase(),
      title: `Peel along ${axis.toUpperCase()}`,
      ariaLabel: `Peel along ${axis.toUpperCase()}`,
      onclick: () => {
        peelAxis = axis;
        renderHud();
      },
    }),
  );
  const peel = el('input', { type: 'range', min: '0', step: '1', value: '0' });
  peel.ariaLabel = 'Layers peeled';
  const flip = el('button', { textContent: '⇄', title: 'Peel from the other end' });
  flip.ariaLabel = 'Peel from the other end';
  const peelLabel = el('span', { className: 'peel-count', ariaLive: 'polite' });
  const peelLess = el('button', { className: 'step', textContent: '−', title: 'One layer fewer' });
  peelLess.ariaLabel = 'Peel one layer fewer';
  const peelMore = el('button', { className: 'step', textContent: '+', title: 'One layer more' });
  peelMore.ariaLabel = 'Peel one layer more';

  const status = el('p', { className: 'sr-only', role: 'status' });
  const coach = el('div', { className: 'coach', hidden: true });
  const panel = el('div', { className: 'end-panel', hidden: true });
  const stage = el('div', { className: 'stage' }, [view.canvas]);
  view.canvas.tabIndex = 0;
  view.canvas.setAttribute('role', 'application');
  view.canvas.ariaLabel = `${dimsLabel(puzzle.dims)} block. Arrow keys move, X breaks, Space paints.`;

  const screen = el('div', { className: 'screen game' }, [
    el('header', { className: 'topbar' }, [
      opts.back ?? homeLink(opts.home),
      title,
      size,
      hearts,
      timer,
    ]),
    el('div', { className: 'toolbar' }, [
      ...(opts.toolbar ?? []),
      el('div', { className: 'actions' }, [undo, redo]),
      hintMenu.root,
      reset,
      createMuteButton(true),
    ]),
    coach,
    stage,
    panel,
    el('div', { className: 'controls' }, [
      el('div', { className: 'segmented tools', role: 'group', ariaLabel: 'Tool' }, toolButtons),
      el('div', { className: 'segmented views', role: 'group', ariaLabel: 'View' }, viewButtons),
      // Two fixed rows, so nothing shifts under your finger as the label changes.
      el('div', { className: 'peel' }, [
        el('div', { className: 'peel-row' }, [
          el('span', { className: 'peel-label', textContent: 'Peel' }),
          el('div', { className: 'segmented', role: 'group', ariaLabel: 'Peel axis' }, axisButtons),
          flip,
        ]),
        el('div', { className: 'peel-row' }, [peelLess, peel, peelMore, peelLabel]),
      ]),
    ]),
    el('p', {
      className: 'help',
      textContent:
        'Hold on a cube to break (or paint) its whole line, straight through. Drag empty space (or use Turn) to turn the block; pinch or scroll to zoom; double-tap empty space to reset the view.',
    }),
    el('p', {
      className: 'help keyboard',
      textContent:
        'Keys: arrows move, PgUp/PgDn change layer, X breaks, Space paints, Shift+X or Shift+Space for the whole line down, A/D/W/S turn, 1/2/3/0 views, Z/Y undo and redo.',
    }),
    status,
  ]);
  root.replaceChildren(screen);

  // --- What's on screen --------------------------------------------------------------

  function renderHud() {
    hearts.hidden = game.mode !== 'hearts';
    const h = Math.max(0, game.hearts);
    hearts.textContent = '♥'.repeat(h) + '♡'.repeat(MAX_HEARTS - h);
    timer.textContent = formatTime(clock.elapsed);
    undo.disabled = locked || !game.canUndo;
    redo.disabled = locked || !game.canRedo;
    hintMenu.render(game.hintsLeft, game.hintsLeft > 0 && !game.over && !locked);
    reset.disabled = locked || game.over;
    toolButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(TOOLS[i].id === tool)));
    axisButtons.forEach((b, i) => b.setAttribute('aria-pressed', String('xyz'[i] === peelAxis)));
    const p = view.peels[peelAxis];
    const max = puzzle.dims[peelAxis] - 1;
    peel.max = String(max);
    peel.value = String(p.layers);
    peelLabel.textContent = p.layers ? `${p.layers} from ${END_NAMES[peelAxis][p.from]}` : 'none';
    flip.disabled = max < 1;
    peelLess.disabled = p.layers <= 0;
    peelMore.disabled = p.layers >= max;
  }

  function setTool(next: ToolChoice) {
    tool = next;
    playSound('tool');
    renderHud();
  }

  function snap(id: keyof typeof VIEWS) {
    const [yaw, pitch] = VIEWS[id];
    view.animateTo(yaw, pitch, id === 'start' ? 1 : view.zoom);
    hooks.orbited?.();
  }

  function setPeelLayers(layers: number) {
    const current = view.peels[peelAxis];
    // Starting a peel takes it from the end facing you.
    const from = current.layers === 0 ? view.facingEnd(peelAxis) : current.from;
    view.setPeel(peelAxis, { from, layers });
    hooks.peeled?.(peelAxis, layers);
    renderHud();
  }
  peel.oninput = () => setPeelLayers(Number(peel.value));
  const step = (by: number) => {
    const max = puzzle.dims[peelAxis] - 1;
    setPeelLayers(Math.max(0, Math.min(max, view.peels[peelAxis].layers + by)));
  };
  peelLess.onclick = () => step(-1);
  peelMore.onclick = () => step(1);
  flip.onclick = () => {
    const current = view.peels[peelAxis];
    view.setPeel(peelAxis, { ...current, from: current.from === 'high' ? 'low' : 'high' });
    hooks.peeled?.(peelAxis, current.layers);
    renderHud();
  };

  // --- Finished lines ------------------------------------------------------------------

  /** The clue a line shows (a fight can fog, scramble or forge it). */
  const shownClue = (id: number) => (view.clueFor ? view.clueFor(id) : puzzle.clues[id]);

  const doneLines = () => {
    const done = new Set<number>();
    for (const line of puzzle.lines) {
      const clue = shownClue(line.id);
      if (!clue) continue;
      let left = 0;
      let painted = 0;
      for (const c of line.cells) {
        if (game.blocks[c] !== BROKEN) left++;
        if (game.blocks[c] === PAINTED) painted++;
      }
      // A line that's all shape has nothing to break: it's done once it's all painted, not
      // before you've touched it.
      const full = clue.count === line.cells.length;
      if (full ? painted === clue.count : left === clue.count) done.add(line.id);
    }
    return done;
  };
  let done = doneLines();
  const showDone = () => {
    view.done = getPlayPrefs().dimDone ? done : new Set();
    // How many clues show faded, for the browser tests (the faces are drawn on the canvas).
    view.canvas.dataset.faded = String(view.done.size);
  };
  showDone();

  // --- Moves ---------------------------------------------------------------------------

  let strokeHit = false;
  function feedback(outcome: Outcome) {
    if (outcome === 'none') return;
    if (outcome === 'strike') {
      strokeHit = true;
      playSound('error');
      haptic('hit');
      screen.classList.remove('shake');
      void screen.offsetWidth;
      screen.classList.add('shake');
      announce(
        game.mode === 'battle'
          ? 'That cube is part of the shape.'
          : game.failed
            ? 'Out of hearts.'
            : `That cube is part of the shape. ${plural(game.hearts, 'heart')} left.`,
      );
    } else {
      playSound(outcome === 'broke' ? 'fill' : outcome === 'painted' ? 'mark' : 'erase');
    }
  }

  /** Set once the end panel's up (solved, out of hearts), so it only happens once. */
  let ended = false;

  function afterChange(outcome: Change['outcome']) {
    if (ended) return;
    const now = doneLines();
    const newlyDone = [...now].filter((id) => !done.has(id));
    done = now;
    showDone();
    view.rebuild();
    if (game.solved) return finish();
    if (game.failed) return fail();
    if (newlyDone.length && !strokeHit && outcome !== 'undo') {
      playSound('line', 0.05);
      haptic('line');
    }
    hooks.changed?.({ outcome, newlyDone });
    renderHud();
  }

  let lastOutcome: Outcome = 'none';
  /** Whether the current press started a stroke (a call-out tap doesn't). */
  let stroked = false;
  const act = (pickTool: Tool, cell: number, axis: Axis) => {
    strokeHit = false;
    lastOutcome = 'none';
    stroked = false;
    if (locked || ended || game.over) return;
    if (hooks.allow && !hooks.allow(pickTool, cell)) return;
    haptic('tap');
    stroked = true;
    lastOutcome = game.begin(pickTool, cell, axis);
    feedback(lastOutcome);
  };
  /** Whether a whole-line stroke may touch a cube (the tutorial's rules). */
  const allowCell = (cell: number) => !hooks.allow || hooks.allow(tool as Tool, cell);
  const lineOutcome = (outcomes: Outcome[]) => {
    // One sound per kind, not one per cube.
    for (const o of new Set(outcomes)) feedback(o);
    if (outcomes.length) lastOutcome = outcomes.includes('strike') ? 'strike' : outcomes[0];
  };

  const detachInput = attachInput(view, {
    acting: () => tool !== 'turn' && !game.over && !locked,
    begin: (pick) => {
      lastOutcome = 'none';
      stroked = false;
      if (hooks.pick?.(pick)) return;
      view.setCursor(pick.cell);
      act(tool as Tool, pick.cell, pick.axis);
      view.rebuild();
      if (game.over) afterChange(lastOutcome);
    },
    extend: (pick) => {
      if (locked) return;
      if (hooks.allow && !hooks.allow(tool as Tool, pick.cell)) return;
      const outcome = game.extend(pick.cell);
      if (outcome !== 'none') {
        lastOutcome = outcome;
        feedback(outcome);
        view.rebuild();
        if (game.over) afterChange(outcome);
      }
    },
    end: () => {
      game.end();
      if (stroked) afterChange(lastOutcome);
      stroked = false;
    },
    hover: (pick) => {
      if (!keyboardCursor) view.setCursor(pick?.cell ?? null);
    },
    orbited: () => hooks.orbited?.(),
    reset: () => snap('start'),
    hold: () => {
      if (!stroked || locked) return;
      const outcomes = game.extendLine(allowCell);
      if (!outcomes.length) return;
      haptic('line');
      lineOutcome(outcomes);
      view.rebuild();
      if (game.over) afterChange(lastOutcome);
    },
  });

  undo.onclick = () => {
    if (!locked && game.undo()) {
      playSound('erase');
      afterChange('undo');
    }
  };
  redo.onclick = () => {
    if (!locked && game.redo()) {
      playSound('fill');
      afterChange('redo');
    }
  };
  reset.onclick = () => {
    if (locked) return;
    game.reset();
    playSound('erase');
    afterChange('reset');
  };

  let litTimer = 0;
  function useHint() {
    if (locked) return;
    const used = game.hint(hooks.hintClues?.());
    if (!used) return;
    playSound('hint');
    window.clearTimeout(litTimer);
    view.lit.clear();
    if (used.line) {
      view.lit.add(used.line.id);
      litTimer = window.setTimeout(() => {
        view.lit.clear();
        view.rebuild();
      }, 1600);
    }
    announce(`Hint: ${plural(used.move.length, 'cube')} worked out.`);
    afterChange('hint');
  }

  function useCheck() {
    if (locked) return;
    const wrong = game.check();
    if (!wrong) return;
    playSound(wrong.length ? 'error' : 'hint');
    const text = wrong.length
      ? `${plural(wrong.length, 'cube')} of the shape had been broken. Put back, painted.`
      : 'No mistakes so far.';
    announce(text);
    coachNote(text);
    afterChange('hint');
  }

  /** A short note in the coach slot, for a few seconds (unless a mode is using it). */
  let noteTimer = 0;
  function coachNote(text: string) {
    if (coach.dataset.owned) return;
    coach.replaceChildren(el('p', { textContent: text }));
    coach.hidden = false;
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => (coach.hidden = true), 3500);
  }

  // --- Keyboard ------------------------------------------------------------------------

  let keyboardCursor = false;
  let cursor = indexOf(puzzle.dims, { x: 0, y: puzzle.dims.y - 1, z: puzzle.dims.z - 1 });
  let lastKeyTool: Tool | null = null;

  function describe(cell: number) {
    const p = pointOf(puzzle.dims, cell);
    const state = { [SOLID]: 'solid', [PAINTED]: 'painted', [BROKEN]: 'broken' }[game.blocks[cell]];
    const clues = (['x', 'y', 'z'] as const)
      .map((a) => {
        const line = lineIdAt(puzzle.dims, a, p);
        const clue = shownClue(line);
        const text = clue ? clueText(clue) : 'hidden';
        return `${a} ${text}${done.has(line) ? ' done' : ''}`;
      })
      .join(', ');
    return `Cube ${p.x + 1}, ${p.y + 1}, ${p.z + 1}: ${state}. Clues ${clues}.`;
  }

  function moveCursor(axis: Axis, by: number) {
    const p = pointOf(puzzle.dims, cursor);
    const q = { ...p, [axis]: p[axis] + by };
    if (!inside(puzzle.dims, q)) return false;
    cursor = indexOf(puzzle.dims, q);
    view.setCursor(cursor);
    announce(describe(cursor));
    return true;
  }

  /** The cursor cube, or with `line` its whole vertical line. */
  const keyAct = (t: Tool, line = false) => {
    if (game.over || locked || ended) return;
    // A fight's call-out takes the key instead (X or Space on a suspect line).
    if (hooks.keyPick?.(cursor)) return;
    if (view.isPeeled(cursor)) {
      announce('That cube is peeled away. Lower the peel to reach it.');
      return;
    }
    act(t, cursor, 'y');
    if (!stroked) return;
    if (line) lineOutcome(game.extendLine((c) => !hooks.allow || hooks.allow(t, c)));
    game.end();
    afterChange(lastOutcome);
  };

  const keydown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (mod && key === 'z') {
      e.preventDefault();
      (e.shiftKey ? redo : undo).click();
      return;
    }
    if (mod) return;
    const onBlock = document.activeElement === view.canvas;
    const { right, away } = view.screenAxes();
    const arrows: Record<string, [Axis, number]> = {
      ArrowRight: [right[0], right[1]],
      ArrowLeft: [right[0], -right[1]],
      ArrowUp: [away[0], away[1]],
      ArrowDown: [away[0], -away[1]],
      PageUp: ['y', 1],
      PageDown: ['y', -1],
    };
    if (onBlock && arrows[key]) {
      e.preventDefault();
      keyboardCursor = true;
      if (view.cursor === null) view.setCursor(cursor);
      else if (moveCursor(...arrows[key]) && e.shiftKey && lastKeyTool) keyAct(lastKeyTool);
      return;
    }
    const breakKeys = ['x', 'Delete', 'Backspace'];
    const paintKeys = [' ', 'Enter', 'f'];
    if (onBlock && (breakKeys.includes(key) || paintKeys.includes(key))) {
      e.preventDefault();
      keyboardCursor = true;
      lastKeyTool = paintKeys.includes(key) ? 'paint' : 'break';
      view.setCursor(cursor);
      keyAct(lastKeyTool, e.shiftKey);
      announce(describe(cursor));
      return;
    }
    const turns: Record<string, [number, number]> = {
      a: [0.2, 0],
      d: [-0.2, 0],
      w: [0, 0.15],
      s: [0, -0.15],
    };
    const views: Record<string, keyof typeof VIEWS> = {
      '1': 'front',
      '2': 'side',
      '3': 'top',
      '0': 'start',
    };
    if (turns[key]) {
      view.orbit(...turns[key]);
      hooks.orbited?.();
    } else if (views[key]) snap(views[key]);
    else if (key === 'y') redo.click();
    else if (key === 'z') undo.click();
    else if (key === 'b') setTool('break');
    else if (key === 'p') setTool('paint');
    else if (key === 't') setTool('turn');
  };
  window.addEventListener('keydown', keydown);

  // --- Theme ---------------------------------------------------------------------------

  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const rethemed = () => view.applyTheme();
  scheme.addEventListener('change', rethemed);

  // --- The end -------------------------------------------------------------------------

  function announce(text: string) {
    status.textContent = text;
  }

  function showPanel(content: Node[]) {
    panel.replaceChildren(...content);
    panel.hidden = false;
    // On a phone it lands below the block: bring it into view.
    panel.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  function finish() {
    if (ended) return;
    ended = true;
    clock.pause();
    game.elapsed = clock.elapsed;
    title.textContent = puzzle.name;
    view.setCursor(null);
    view.reveal();
    playSound('solve', 0.1);
    haptic('line');
    const content = hooks.solved
      ? hooks.solved(game.elapsed)
      : [
          el('h2', { textContent: 'Solved!' }),
          el('p', { className: 'end-name', textContent: puzzle.name }),
        ];
    if (content) showPanel(content);
    announce(`Solved! It's ${puzzle.name}.`);
    renderHud();
  }

  function retry() {
    ended = false;
    game.retry();
    clock.reset();
    panel.hidden = true;
    done = doneLines();
    showDone();
    view.rebuild();
    renderHud();
  }

  function fail() {
    if (ended) return;
    ended = true;
    clock.pause();
    view.setCursor(null);
    playSound('strike', 0.2);
    const content = hooks.failed
      ? hooks.failed()
      : [
          el('h2', { textContent: 'Out of hearts' }),
          el('p', {
            className: 'end-note',
            textContent: 'Three cubes of the shape broken. Try again?',
          }),
          el('div', { className: 'end-actions' }, [
            el('a', {
              className: 'button ghost',
              href: opts.home ?? '#/',
              textContent: 'All puzzles',
            }),
            el('button', { className: 'button primary', textContent: 'Retry', onclick: retry }),
          ]),
        ];
    if (content) showPanel(content);
    renderHud();
  }

  const tick = window.setInterval(() => {
    if (!game.over && !document.hidden) timer.textContent = formatTime(clock.elapsed);
  }, 500);

  const visibility = () => {
    if (game.over || locked) return;
    if (document.hidden) clock.pause();
    else clock.resume();
  };
  document.addEventListener('visibilitychange', visibility);

  renderHud();

  return {
    game,
    view,
    clock,
    screen,
    title,
    coach,
    panel,
    announce,
    refresh: () => afterChange('reset'),
    showPanel,
    doneLines,
    setTool,
    lock() {
      locked = true;
      clock.pause();
      view.setCursor(null);
      undo.disabled = redo.disabled = reset.disabled = true;
      hintMenu.render(game.hintsLeft, false);
    },
    cleanup() {
      window.clearInterval(tick);
      window.clearTimeout(litTimer);
      window.clearTimeout(noteTimer);
      window.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', visibility);
      scheme.removeEventListener('change', rethemed);
      hintMenu.dispose();
      detachInput();
      view.dispose();
      return clock.elapsed;
    },
  };
}
