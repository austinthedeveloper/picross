import { Cell } from '../engine/board';
import { Game, MAX_HEARTS, MAX_HINTS, type HintTarget } from '../game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../game/progress';
import { getSettings } from '../game/settings';
import type { Puzzle } from '../puzzles/format';
import { puzzles } from '../puzzles/index';
import type { Change } from '../engine/history';
import { createBoardView, type Line } from './boardView';
import { el } from './dom';
import { formatTime } from './format';
import { attachInput, type Tool } from './input';
import { createMuteButton } from './muteButton';
import { createPicture } from './picture';
import { playSound } from './sound';

/** Renders the play screen. Returns a cleanup function. */
export function renderGameScreen(app: HTMLElement, puzzle: Puzzle): () => void {
  const game = new Game(puzzle, getSavedBoard(puzzle.id), getSettings().mode);
  const view = createBoardView(puzzle);
  let tool: Tool = Cell.Filled;

  const back = el('a', { className: 'button ghost', href: '#/', textContent: '← Puzzles' });
  const title = el('h1', { textContent: `${puzzle.width}×${puzzle.height}` });
  const hearts = el('span', { className: 'hearts', hidden: game.mode !== 'hearts' });
  const timer = el('span', { className: 'timer', role: 'timer' });
  timer.setAttribute('aria-label', 'Time');

  const fillBtn = el('button', { className: 'tool', textContent: '■ Fill', title: 'Fill' });
  const markBtn = el('button', { className: 'tool', textContent: '✕ Mark', title: 'Mark' });
  fillBtn.setAttribute('aria-pressed', 'true');
  markBtn.setAttribute('aria-pressed', 'false');
  const setTool = (t: Tool) => {
    tool = t;
    fillBtn.setAttribute('aria-pressed', String(t === Cell.Filled));
    markBtn.setAttribute('aria-pressed', String(t === Cell.Marked));
  };
  fillBtn.onclick = () => setTool(Cell.Filled);
  markBtn.onclick = () => setTool(Cell.Marked);

  const undoBtn = el('button', { textContent: 'Undo', title: 'Undo (Ctrl+Z)' });
  const redoBtn = el('button', { textContent: 'Redo', title: 'Redo (Ctrl+Shift+Z)' });
  const resetBtn = el('button', { textContent: 'Reset', title: 'Clear the board' });
  undoBtn.onclick = () => (game.undo(), refresh());
  redoBtn.onclick = () => (game.redo(), refresh());
  resetBtn.onclick = () => (game.reset(), refresh());

  const hintSummary = el('summary', { className: 'button' });
  const hintNote = el('p', { className: 'hint-note' });
  const hintButton = (target: HintTarget, label: string) =>
    el('button', { textContent: label, onclick: () => useHint(target) });
  const hintMenu = el('details', { className: 'hint-menu' }, [
    hintSummary,
    el('div', { className: 'hint-pop' }, [
      hintNote,
      hintButton('cell', 'Reveal cell'),
      hintButton('row', 'Reveal row'),
      hintButton('col', 'Reveal column'),
    ]),
  ]);

  const toolbar = el('div', { className: 'toolbar' }, [
    el('div', { className: 'segmented' }, [fillBtn, markBtn]),
    el('div', { className: 'actions' }, [hintMenu, undoBtn, redoBtn, resetBtn]),
  ]);

  const solvedPanel = el('div', { className: 'solved-panel', hidden: true });
  const failedPanel = el('div', { className: 'solved-panel failed', hidden: true }, [
    el('h2', { textContent: 'Out of hearts' }),
    el('p', { className: 'solved-time', textContent: 'Three wrong fills. Try again?' }),
    el('div', { className: 'solved-actions' }, [
      el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
      el('button', {
        className: 'button primary',
        textContent: 'Retry',
        onclick: () => {
          game.retry();
          refresh();
        },
      }),
    ]),
  ]);
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const announce = (message: string) => {
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = message));
  };
  const help = el('p', {
    className: 'help',
    textContent:
      'Arrows move · Space fill · X mark · Delete clear · Shift+arrows repeat · Ctrl+Z undo',
  });

  const screen = el('main', { className: 'screen game' }, [
    el('header', { className: 'topbar' }, [back, title, hearts, timer, createMuteButton(true)]),
    toolbar,
    el('div', { className: 'board-wrap' }, [view.root]),
    help,
    solvedPanel,
    failedPanel,
    live,
  ]);
  app.replaceChildren(screen);

  const showSolved = () => {
    const prevBest = getPuzzleStats(puzzle.id)?.bestTime;
    const newBest = recordSolve(puzzle.id, game.elapsed);
    const stats = getPuzzleStats(puzzle.id)!;
    title.textContent = puzzle.name;
    const timeNote =
      prevBest === undefined
        ? `Time ${formatTime(game.elapsed)}`
        : newBest
          ? `New best: ${formatTime(game.elapsed)} (was ${formatTime(prevBest)})`
          : `Time ${formatTime(game.elapsed)} · Best ${formatTime(stats.bestTime)}`;
    const hintsNote = game.hintsUsed
      ? ` · ${game.hintsUsed} ${game.hintsUsed === 1 ? 'hint' : 'hints'}`
      : '';
    const next = puzzles[puzzles.indexOf(puzzle) + 1];
    solvedPanel.replaceChildren(
      el('h2', { textContent: 'Solved!' }),
      createPicture(puzzle.solution, Math.max(4, Math.floor(120 / puzzle.width))),
      el('p', { className: 'solved-name', textContent: puzzle.name }),
      el('p', { className: 'solved-time', textContent: timeNote + hintsNote }),
      el('div', { className: 'solved-actions' }, [
        el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
        ...(next
          ? [
              el('a', {
                className: 'button primary',
                href: `#/play/${next.id}`,
                textContent: 'Next →',
              }),
            ]
          : []),
      ]),
    );
    solvedPanel.hidden = false;
    announce(`Solved! ${puzzle.name}. ${timeNote}.`);
    playSound('solve');
  };

  const lineName = (line: Line) => `${line.kind === 'row' ? 'Row' : 'Column'} ${line.index + 1}`;

  /** Redraws the board and reports lines that were just completed. */
  const redraw = () => {
    const completed = view.update(game.board);
    if (completed.length && !game.solved) {
      announce(`${completed.map(lineName).join(', ')} complete`);
      completed.forEach(view.flashLine);
      playSound('line');
    }
  };

  /** Applies changes through the game; returns what happened for the input layer. */
  const play = (changes: Change[]) => {
    const { applied, mistake } = game.preview(changes);
    redraw();
    const last = applied.at(-1);
    if (last && !mistake) {
      playSound(last.to === Cell.Filled ? 'fill' : last.to === Cell.Marked ? 'mark' : 'erase');
    }
    if (mistake) {
      playSound('error');
      view.flashError(mistake.index);
      announce(
        game.failed
          ? 'Wrong. Out of hearts.'
          : `Wrong, that cell is empty. ${game.hearts} ${game.hearts === 1 ? 'heart' : 'hearts'} left.`,
      );
    }
    return { applied, stop: Boolean(mistake) };
  };

  const persist = () => {
    if (game.solved) return;
    if (game.failed) {
      // A failed board can't continue; reopening starts fresh.
      clearSavedBoard(puzzle.id);
      return;
    }
    if (game.started) saveBoard(puzzle.id, game.serialize());
    else clearSavedBoard(puzzle.id);
  };

  // The clock runs while the page is visible and the puzzle is unsolved.
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    if (document.visibilityState === 'visible') game.tick(now - last);
    last = now;
    timer.textContent = formatTime(game.elapsed);
  };
  const clock = window.setInterval(tick, 250);
  const onHide = () => {
    tick();
    if (document.visibilityState === 'hidden') persist();
  };
  document.addEventListener('visibilitychange', onHide);

  function refresh() {
    tick();
    persist();
    redraw();
    undoBtn.disabled = !game.history.canUndo;
    redoBtn.disabled = !game.history.canRedo;
    const solved = game.solved;
    hearts.textContent = '♥'.repeat(game.hearts) + '♡'.repeat(MAX_HEARTS - game.hearts);
    hearts.setAttribute('aria-label', `${game.hearts} of ${MAX_HEARTS} hearts left`);
    screen.classList.toggle('is-solved', solved);
    screen.classList.toggle('is-failed', game.failed);
    toolbar.inert = game.over;
    hintSummary.textContent = `Hint ${game.hintsLeft}/${MAX_HINTS}`;
    hintMenu.classList.toggle('empty', game.hintsLeft === 0);
    updateHintNote();
    failedPanel.hidden = !game.failed;
    if (solved && solvedPanel.hidden) {
      view.highlight(null, null);
      showSolved();
    }
  }

  attachInput(view.root, {
    board: game.board,
    getTool: () => tool,
    enabled: () => !game.over,
    onPreview: play,
    onCommit: (changes) => {
      game.commit(changes);
      refresh();
    },
    onHover: (r, c) => view.highlight(r, c),
  });

  // Keyboard play: a cursor moves over the board and acts on one cell at a time.
  const { width: w, height: h } = puzzle;
  let cursor = { r: 0, c: 0 };
  let lastAction: { match: Cell; target: Cell } | null = null;
  const moveCursor = (r: number, c: number) => {
    cursor = { r: Math.max(0, Math.min(h - 1, r)), c: Math.max(0, Math.min(w - 1, c)) };
    view.setCursor(cursor.r, cursor.c);
    view.highlight(cursor.r, cursor.c);
    updateHintNote();
  };

  function updateHintNote() {
    hintNote.textContent = game.hintsLeft
      ? `Uses the highlighted cell: row ${cursor.r + 1}, column ${cursor.c + 1}.`
      : 'No hints left for this puzzle.';
  }
  hintMenu.addEventListener('toggle', () => {
    screen.classList.toggle('hinting', hintMenu.open);
    if (hintMenu.open) view.highlight(cursor.r, cursor.c);
  });

  function useHint(target: HintTarget) {
    hintMenu.open = false;
    const changes = game.hint(target, cursor.r, cursor.c);
    if (!changes.length) {
      announce(game.hintsLeft ? 'Already correct. No hint used.' : 'No hints left.');
      return;
    }
    refresh();
    view.flashHint(changes.map((c) => c.index));
    if (!game.solved) playSound('hint');
    announce(`Hint used. ${game.hintsLeft} left.`);
  }
  view.root.addEventListener('pointerdown', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell');
    view.root.focus({ preventScroll: true });
    if (cell) {
      const i = Number(cell.dataset.i);
      moveCursor(Math.floor(i / w), i % w);
    }
  });
  view.root.addEventListener('blur', () => view.highlight(null, null));

  const actOnCursor = (match: Cell, target: Cell) => {
    const index = cursor.r * w + cursor.c;
    if (game.board.cells[index] !== match || match === target) return;
    const { applied } = play([{ index, from: match, to: target }]);
    game.commit(applied);
    refresh();
  };
  const toggle = (state: Cell) => {
    const from = game.board.cells[cursor.r * w + cursor.c];
    lastAction = { match: from, target: from === state ? Cell.Empty : state };
    actOnCursor(lastAction.match, lastAction.target);
  };

  const ARROWS: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  view.root.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const arrow = ARROWS[e.key];
    if (arrow) {
      moveCursor(cursor.r + arrow[0], cursor.c + arrow[1]);
      if (e.shiftKey && lastAction && !game.over) actOnCursor(lastAction.match, lastAction.target);
    } else if (game.over) {
      return;
    } else if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'f') {
      toggle(Cell.Filled);
    } else if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'm') {
      toggle(Cell.Marked);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const from = game.board.cells[cursor.r * w + cursor.c];
      lastAction = { match: from, target: Cell.Empty };
      actOnCursor(from, Cell.Empty);
    } else {
      return;
    }
    e.preventDefault();
  });
  view.root.addEventListener('focus', () => moveCursor(cursor.r, cursor.c));

  const onKey = (e: KeyboardEvent) => {
    if (game.over || !(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) game.undo();
    else if ((key === 'z' && e.shiftKey) || key === 'y') game.redo();
    else return;
    e.preventDefault();
    refresh();
  };
  window.addEventListener('keydown', onKey);

  refresh();
  return () => {
    tick();
    persist();
    window.clearInterval(clock);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
  };
}
