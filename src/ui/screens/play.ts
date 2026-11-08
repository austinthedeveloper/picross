import { clueText } from '../../engine/clues';
import { dimsLabel, indexOf, inside, lineIdAt, pointOf, type Axis } from '../../engine/volume';
import { Clock } from '../../game/clock';
import {
  BROKEN,
  Game,
  MAX_HEARTS,
  PAINTED,
  SOLID,
  type Outcome,
  type Tool,
  type GameMode,
} from '../../game/game';
import type { SavedBoard } from '../../game/progress';
import { getSettings } from '../../game/settings';
import type { Puzzle } from '../../puzzles/format';
import { BlockView, type Peel } from '../board/blockView';
import { attachInput } from '../board/input';
import { createHintMenu } from '../components/hintMenu';
import { homeLink } from '../components/homeLink';
import { createMuteButton } from '../components/muteButton';
import { el } from '../dom';
import { formatTime, plural } from '../format';
import { haptic } from '../haptics';
import { playSound } from '../sound';

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
  const peelLabel = el('span', { className: 'peel-count' });

  const status = el('p', { className: 'sr-only', role: 'status' });
  const coach = el('div', { className: 'coach', hidden: true });
  const panel = el('div', { className: 'end-panel', hidden: true });
  const stage = el('div', { className: 'stage' }, [view.canvas]);
  view.canvas.tabIndex = 0;
  view.canvas.setAttribute('role', 'application');
  view.canvas.ariaLabel = `${dimsLabel(puzzle.dims)} block. Arrow keys move, X breaks, Space paints.`;

  const screen = el('div', { className: 'screen game' }, [
    el('header', { className: 'topbar' }, [opts.back ?? homeLink(), title, size, hearts, timer]),
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
      el('div', { className: 'peel' }, [
        el('span', { className: 'peel-label', textContent: 'Peel' }),
        el('div', { className: 'segmented', role: 'group', ariaLabel: 'Peel axis' }, axisButtons),
        peel,
        flip,
        peelLabel,
      ]),
    ]),
    el('p', {
      className: 'help',
      textContent:
        'Drag empty space (or use Turn) to turn the block. Pinch or scroll to zoom. Double-tap empty space to reset the view.',
    }),
    el('p', {
      className: 'help keyboard',
      textContent:
        'Keys: arrows move, PgUp/PgDn change layer, X breaks, Space paints, A/D/W/S turn, 1/2/3/0 views, Z/Y undo and redo.',
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
    undo.disabled = !game.canUndo;
    redo.disabled = !game.canRedo;
    hintMenu.render(game.hintsLeft, game.hintsLeft > 0 && !game.over);
    reset.disabled = game.over;
    toolButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(TOOLS[i].id === tool)));
    axisButtons.forEach((b, i) => b.setAttribute('aria-pressed', String('xyz'[i] === peelAxis)));
    const p = view.peels[peelAxis];
    const max = puzzle.dims[peelAxis] - 1;
    peel.max = String(max);
    peel.value = String(p.layers);
    peelLabel.textContent = p.layers ? `${p.layers} from ${END_NAMES[peelAxis][p.from]}` : 'none';
    flip.disabled = max < 1;
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

  peel.oninput = () => {
    const layers = Number(peel.value);
    const current = view.peels[peelAxis];
    // Starting a peel takes it from the end facing you.
    const from = current.layers === 0 ? view.facingEnd(peelAxis) : current.from;
    view.setPeel(peelAxis, { from, layers });
    hooks.peeled?.(peelAxis, layers);
    renderHud();
  };
  flip.onclick = () => {
    const current = view.peels[peelAxis];
    view.setPeel(peelAxis, { ...current, from: current.from === 'high' ? 'low' : 'high' });
    hooks.peeled?.(peelAxis, current.layers);
    renderHud();
  };

  // --- Finished lines ------------------------------------------------------------------

  const doneLines = () => {
    const done = new Set<number>();
    for (const line of puzzle.lines) {
      const clue = puzzle.clues[line.id];
      if (!clue) continue;
      let left = 0;
      for (const c of line.cells) if (game.blocks[c] !== BROKEN) left++;
      if (left === clue.count) done.add(line.id);
    }
    return done;
  };
  let done = doneLines();
  const showDone = () => {
    view.done = getSettings().dimDone ? done : new Set();
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
        game.failed
          ? 'Out of hearts.'
          : `That cube is part of the shape. ${plural(game.hearts, 'heart')} left.`,
      );
    } else {
      playSound(outcome === 'broke' ? 'fill' : outcome === 'painted' ? 'mark' : 'erase');
    }
  }

  function afterChange(outcome: Change['outcome']) {
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
  const act = (pickTool: Tool, cell: number, axis: Axis) => {
    strokeHit = false;
    if (hooks.allow && !hooks.allow(pickTool, cell)) return;
    haptic('tap');
    lastOutcome = game.begin(pickTool, cell, axis);
    feedback(lastOutcome);
  };

  const detachInput = attachInput(view, {
    acting: () => tool !== 'turn' && !game.over,
    begin: (pick) => {
      view.setCursor(pick.cell);
      act(tool as Tool, pick.cell, pick.axis);
      view.rebuild();
      if (game.over) afterChange(lastOutcome);
    },
    extend: (pick) => {
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
      afterChange(lastOutcome);
    },
    hover: (pick) => {
      if (!keyboardCursor) view.setCursor(pick?.cell ?? null);
    },
    orbited: () => hooks.orbited?.(),
    reset: () => snap('start'),
  });

  undo.onclick = () => {
    if (game.undo()) {
      playSound('erase');
      afterChange('undo');
    }
  };
  redo.onclick = () => {
    if (game.redo()) {
      playSound('fill');
      afterChange('redo');
    }
  };
  reset.onclick = () => {
    game.reset();
    playSound('erase');
    afterChange('reset');
  };

  let litTimer = 0;
  function useHint() {
    const used = game.hint();
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
        const clue = puzzle.clues[line];
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

  const keyAct = (t: Tool) => {
    act(t, cursor, 'y');
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
      keyAct(lastKeyTool);
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
  }

  function finish() {
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
    game.retry();
    clock.reset();
    panel.hidden = true;
    done = doneLines();
    showDone();
    view.rebuild();
    renderHud();
  }

  function fail() {
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
            el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
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
    if (game.over) return;
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
