import { clueText } from '../../engine/clues';
import { indexOf, inside, lineIdAt, pointOf, type Axis, dimsLabel } from '../../engine/volume';
import { BROKEN, Game, MAX_HEARTS, PAINTED, SOLID, type Outcome, type Tool } from '../../game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { Clock } from '../../game/clock';
import { getSettings } from '../../game/settings';
import type { Puzzle } from '../../puzzles/format';
import { nextPuzzle, PUZZLES } from '../../puzzles/index';
import { BlockView } from '../board/blockView';
import { attachInput } from '../board/input';
import { shapePicture } from '../board/thumbnail';
import { homeLink } from '../components/homeLink';
import { createMuteButton } from '../components/muteButton';
import { el } from '../dom';
import { formatTime, plural, puzzleNumber } from '../format';
import { haptic } from '../haptics';
import { playSound } from '../sound';

type ToolChoice = Tool | 'turn';

const TOOLS: { id: ToolChoice; icon: string; label: string; key: string }[] = [
  { id: 'break', icon: '⛏', label: 'Break', key: 'B' },
  { id: 'paint', icon: '🖌', label: 'Paint', key: 'P' },
  { id: 'turn', icon: '🔄', label: 'Turn', key: 'T' },
];

/** The play screen (#/play/<id>). Returns a cleanup that saves and tears it down. */
export function renderGameScreen(root: HTMLElement, puzzle: Puzzle): () => void {
  const game = new Game(puzzle, getSettings().mode, getSavedBoard(puzzle.id));
  const number = puzzleNumber(PUZZLES.indexOf(puzzle));
  const solvedBefore = Boolean(getPuzzleStats(puzzle.id));
  let tool: ToolChoice = 'break';
  const clock = new Clock(game.elapsed);
  let changed = false;

  const view = new BlockView(puzzle, game.blocks);
  if (import.meta.env.DEV) Object.assign(window, { __game: game, __view: view });

  // Header
  const title = el('h1', {
    textContent: solvedBefore ? puzzle.name : `${number}`,
  });
  const size = el('span', { className: 'size', textContent: dimsLabel(puzzle.dims) });
  const hearts = el('span', { className: 'hearts', ariaLabel: 'Hearts' });
  const timer = el('span', { className: 'timer', ariaLabel: 'Time' });

  // Toolbar
  const undo = el('button', {
    className: 'icon',
    textContent: '↶',
    title: 'Undo (Z)',
    ariaLabel: 'Undo',
  });
  const redo = el('button', {
    className: 'icon',
    textContent: '↷',
    title: 'Redo (Y)',
    ariaLabel: 'Redo',
  });
  const hint = el('button', { className: 'hint' });
  const reset = el('button', { textContent: 'Reset' });

  // Tools
  const toolButtons = TOOLS.map((t) =>
    el(
      'button',
      {
        className: 'toggle tool',
        title: `${t.label} (${t.key})`,
        onclick: () => setTool(t.id),
      },
      [el('span', { textContent: t.icon, ariaHidden: 'true' }), t.label],
    ),
  );

  // Peel: hide layers from the side facing you.
  let peelAxis: Axis = 'y';
  const axisButtons = (['x', 'y', 'z'] as const).map((axis) =>
    el('button', {
      className: 'toggle',
      textContent: axis.toUpperCase(),
      title: { x: 'Peel from the side', y: 'Peel from the top', z: 'Peel from the front' }[axis],
      onclick: () => setPeelAxis(axis),
    }),
  );
  const peel = el('input', {
    type: 'range',
    min: '0',
    step: '1',
    value: '0',
    ariaLabel: 'Layers peeled',
  });
  const peelCount = el('span', { className: 'peel-count' });

  const status = el('p', { className: 'sr-only', role: 'status' });
  const panel = el('div', { className: 'end-panel', hidden: true });
  const stage = el('div', { className: 'stage' }, [view.canvas]);
  view.canvas.tabIndex = 0;
  view.canvas.setAttribute('role', 'application');
  view.canvas.ariaLabel = `${dimsLabel(puzzle.dims)} block. Arrow keys move, X breaks, Space paints.`;

  const screen = el('div', { className: 'screen game' }, [
    el('header', { className: 'topbar' }, [homeLink(), title, size, hearts, timer]),
    el('div', { className: 'toolbar' }, [
      el('div', { className: 'actions' }, [undo, redo]),
      hint,
      reset,
      createMuteButton(true),
    ]),
    stage,
    panel,
    el('div', { className: 'controls' }, [
      el('div', { className: 'segmented tools', role: 'group', ariaLabel: 'Tool' }, toolButtons),
      el('div', { className: 'peel' }, [
        el('span', { className: 'peel-label', textContent: 'Peel' }),
        el('div', { className: 'segmented', role: 'group', ariaLabel: 'Peel axis' }, axisButtons),
        peel,
        peelCount,
      ]),
    ]),
    el('p', {
      className: 'help',
      textContent: 'Drag empty space (or use Turn) to turn the block. Pinch or scroll to zoom.',
    }),
    el('p', {
      className: 'help keyboard',
      textContent:
        'Keys: arrows move, PgUp/PgDn change layer, X breaks, Space paints, A/D/W/S turn, Z/Y undo and redo.',
    }),
    status,
  ]);
  root.replaceChildren(screen);

  // --- State shown on screen -------------------------------------------------------

  const elapsed = () => clock.elapsed;

  function renderHud() {
    hearts.hidden = game.mode !== 'hearts';
    hearts.textContent =
      '♥'.repeat(Math.max(0, game.hearts)) + '♡'.repeat(MAX_HEARTS - Math.max(0, game.hearts));
    timer.textContent = formatTime(elapsed());
    undo.disabled = !game.canUndo;
    redo.disabled = !game.canRedo;
    hint.textContent = `💡 Hint ${game.hintsLeft}`;
    hint.disabled = game.hintsLeft <= 0 || game.over;
    reset.disabled = game.over;
    toolButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(TOOLS[i].id === tool)));
    axisButtons.forEach((b, i) => b.setAttribute('aria-pressed', String('xyz'[i] === peelAxis)));
    const max = puzzle.dims[peelAxis] - 1;
    peel.max = String(max);
    peelCount.textContent = `${peel.value}/${max}`;
  }

  function setTool(next: ToolChoice) {
    tool = next;
    playSound('tool');
    renderHud();
  }

  function setPeelAxis(axis: Axis) {
    peelAxis = axis;
    peel.value = '0';
    view.setCut({ axis, layers: 0 });
    renderHud();
  }
  peel.oninput = () => {
    view.setCut({ axis: peelAxis, layers: Number(peel.value) });
    renderHud();
  };

  // --- Lines: a "done" chime when a line's leftover cubes match its clue ------------

  const doneLines = () => {
    const done = new Set<number>();
    puzzle.lines.forEach((line) => {
      const clue = puzzle.clues[line.id];
      if (!clue) return;
      const left = line.cells.filter((c) => game.blocks[c] !== BROKEN).length;
      if (left === clue.count) done.add(line.id);
    });
    return done;
  };
  let done = doneLines();

  // --- Moves ------------------------------------------------------------------------

  let strokeHit = false;
  function feedback(outcome: Outcome) {
    if (outcome === 'none') return;
    changed = true;
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

  function afterChange() {
    const now = doneLines();
    const fresh = [...now].some((id) => !done.has(id));
    done = now;
    view.rebuild();
    if (game.solved) return finish();
    if (game.failed) return fail();
    if (fresh && !strokeHit) {
      playSound('line', 0.05);
      haptic('line');
    }
    renderHud();
  }

  const act = (pickTool: Tool, cell: number, axis: Axis) => {
    strokeHit = false;
    haptic('tap');
    feedback(game.begin(pickTool, cell, axis));
  };

  const detachInput = attachInput(view, {
    acting: () => tool !== 'turn' && !game.over,
    begin: (pick) => {
      view.setCursor(pick.cell);
      act(tool as Tool, pick.cell, pick.axis);
      view.rebuild();
      if (game.over) afterChange();
    },
    extend: (pick) => {
      const outcome = game.extend(pick.cell);
      if (outcome !== 'none') {
        feedback(outcome);
        view.rebuild();
        if (game.over) afterChange();
      }
    },
    end: () => {
      game.end();
      afterChange();
    },
    hover: (pick) => {
      if (!keyboardCursor) view.setCursor(pick?.cell ?? null);
    },
  });

  undo.onclick = () => {
    if (game.undo()) {
      playSound('erase');
      afterChange();
    }
  };
  redo.onclick = () => {
    if (game.redo()) {
      playSound('fill');
      afterChange();
    }
  };
  reset.onclick = () => {
    game.reset();
    playSound('erase');
    afterChange();
  };

  let litTimer = 0;
  hint.onclick = () => {
    const used = game.hint();
    if (!used) return;
    changed = true;
    playSound('hint');
    window.clearTimeout(litTimer);
    view.lit.clear();
    if (used.line) {
      view.lit.add(used.line.id);
      litTimer = window.setTimeout(() => {
        view.lit.clear();
        view.rebuild();
      }, 1600);
      announce(`Hint: ${used.move.length} cubes in one line worked out.`);
    } else {
      announce('Hint: a cube you broke was part of the shape. It is back, painted.');
    }
    afterChange();
  };

  // --- Keyboard ---------------------------------------------------------------------

  let keyboardCursor = false;
  let cursor = indexOf(puzzle.dims, {
    x: 0,
    y: puzzle.dims.y - 1,
    z: puzzle.dims.z - 1,
  });
  let lastKeyTool: Tool | null = null;

  function describe(cell: number) {
    const p = pointOf(puzzle.dims, cell);
    const state = { [SOLID]: 'solid', [PAINTED]: 'painted', [BROKEN]: 'broken' }[game.blocks[cell]];
    const clues = (['x', 'y', 'z'] as const)
      .map((a) => {
        const clue = puzzle.clues[lineIdAt(puzzle.dims, a, p)];
        return `${a} ${clue ? clueText(clue) : 'hidden'}`;
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

  const keydown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
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
      else if (moveCursor(...arrows[key]) && e.shiftKey && lastKeyTool) {
        act(lastKeyTool, cursor, 'y');
        game.end();
        afterChange();
      }
      return;
    }
    if (
      onBlock &&
      (key === 'x' ||
        key === 'Delete' ||
        key === 'Backspace' ||
        key === ' ' ||
        key === 'Enter' ||
        key === 'f')
    ) {
      e.preventDefault();
      keyboardCursor = true;
      lastKeyTool = key === ' ' || key === 'Enter' || key === 'f' ? 'paint' : 'break';
      view.setCursor(cursor);
      act(lastKeyTool, cursor, 'y');
      game.end();
      afterChange();
      announce(describe(cursor));
      return;
    }
    const turns: Record<string, [number, number]> = {
      a: [0.2, 0],
      d: [-0.2, 0],
      w: [0, 0.15],
      s: [0, -0.15],
    };
    if (turns[key]) {
      view.orbit(...turns[key]);
      return;
    }
    if (key === 'y') redo.click();
    else if (key === 'z') undo.click();
    else if (key === 'b') setTool('break');
    else if (key === 'p') setTool('paint');
    else if (key === 't') setTool('turn');
  };
  window.addEventListener('keydown', keydown);

  // --- Theme: the block's colors come from the page --------------------------------

  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const rethemed = () => view.applyTheme();
  scheme.addEventListener('change', rethemed);

  // --- End of the game --------------------------------------------------------------

  function announce(text: string) {
    status.textContent = text;
  }

  function finish() {
    clock.pause();
    const time = clock.elapsed;
    game.elapsed = time;
    const best = recordSolve(puzzle.id, time);
    const stats = getPuzzleStats(puzzle.id)!;
    title.textContent = puzzle.name;
    view.setCursor(null);
    view.reveal();
    playSound('solve', 0.1);
    haptic('line');
    const next = nextPuzzle(puzzle.id);
    panel.replaceChildren(
      el('h2', { textContent: 'Solved!' }),
      shapePicture(puzzle, 120),
      el('p', { className: 'end-name', textContent: puzzle.name }),
      el('p', {
        className: 'end-note',
        textContent: best
          ? `${formatTime(time)}, a new best!`
          : `${formatTime(time)}${stats.solves > 1 ? ` (best ${formatTime(stats.bestTime)})` : ''}${
              game.hintsUsed ? `, ${plural(game.hintsUsed, 'hint')}` : ''
            }`,
      }),
      el('div', { className: 'end-actions' }, [
        el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
        ...(next
          ? [
              el('a', {
                className: 'button primary',
                href: `#/play/${next.id}`,
                textContent: 'Next',
              }),
            ]
          : []),
      ]),
    );
    panel.hidden = false;
    announce(`Solved! It's ${puzzle.name}.`);
    renderHud();
  }

  function fail() {
    clock.pause();
    view.setCursor(null);
    playSound('strike', 0.2);
    panel.replaceChildren(
      el('h2', { textContent: 'Out of hearts' }),
      el('p', {
        className: 'end-note',
        textContent: 'Three cubes of the shape broken. Try again?',
      }),
      el('div', { className: 'end-actions' }, [
        el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
        el('button', {
          className: 'button primary',
          textContent: 'Retry',
          onclick: () => {
            game.retry();
            clock.reset();
            panel.hidden = true;
            clearSavedBoard(puzzle.id);
            done = doneLines();
            view.rebuild();
            renderHud();
          },
        }),
      ]),
    );
    panel.hidden = false;
    renderHud();
  }

  const tick = window.setInterval(() => {
    if (!game.over && !document.hidden) timer.textContent = formatTime(elapsed());
  }, 500);

  // Pause the clock while the page is hidden.
  const visibility = () => {
    if (game.over) return;
    if (document.hidden) clock.pause();
    else clock.resume();
  };
  document.addEventListener('visibilitychange', visibility);

  renderHud();
  if (game.solved) finish();

  return () => {
    window.clearInterval(tick);
    window.clearTimeout(litTimer);
    window.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', visibility);
    scheme.removeEventListener('change', rethemed);
    detachInput();
    if (!game.over && (changed || getSavedBoard(puzzle.id))) {
      game.elapsed = elapsed();
      if (game.blocks.some((b) => b !== SOLID) || game.elapsed > 5000)
        saveBoard(puzzle.id, game.save());
    }
    view.dispose();
  };
}
