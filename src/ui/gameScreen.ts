import { Cell } from '../engine/board';
import { Game } from '../game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../game/progress';
import type { Puzzle } from '../puzzles/format';
import { puzzles } from '../puzzles/index';
import { createBoardView } from './boardView';
import { el } from './dom';
import { formatTime } from './format';
import { attachInput, type Tool } from './input';
import { createPicture } from './picture';

/** Renders the play screen. Returns a cleanup function. */
export function renderGameScreen(app: HTMLElement, puzzle: Puzzle): () => void {
  const game = new Game(puzzle, getSavedBoard(puzzle.id));
  const view = createBoardView(puzzle);
  let tool: Tool = Cell.Filled;

  const back = el('a', { className: 'button ghost', href: '#/', textContent: '← Puzzles' });
  const title = el('h1', { textContent: `${puzzle.width}×${puzzle.height}` });
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

  const toolbar = el('div', { className: 'toolbar' }, [
    el('div', { className: 'segmented' }, [fillBtn, markBtn]),
    el('div', { className: 'actions' }, [undoBtn, redoBtn, resetBtn]),
  ]);

  const solvedPanel = el('div', { className: 'solved-panel', hidden: true });
  const screen = el('main', { className: 'screen game' }, [
    el('header', { className: 'topbar' }, [back, title, timer]),
    toolbar,
    el('div', { className: 'board-wrap' }, [view.root]),
    solvedPanel,
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
    const next = puzzles[puzzles.indexOf(puzzle) + 1];
    solvedPanel.replaceChildren(
      el('h2', { textContent: 'Solved!' }),
      createPicture(puzzle.solution, Math.max(4, Math.floor(120 / puzzle.width))),
      el('p', { className: 'solved-name', textContent: puzzle.name }),
      el('p', { className: 'solved-time', textContent: timeNote }),
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
  };

  const persist = () => {
    if (game.solved) return;
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
    view.update(game.board);
    undoBtn.disabled = !game.history.canUndo;
    redoBtn.disabled = !game.history.canRedo;
    const solved = game.solved;
    screen.classList.toggle('is-solved', solved);
    toolbar.inert = solved;
    if (solved && solvedPanel.hidden) {
      view.highlight(null, null);
      showSolved();
    }
  }

  attachInput(view.root, {
    board: game.board,
    getTool: () => tool,
    enabled: () => !game.solved,
    onPreview: (changes) => {
      game.preview(changes);
      view.update(game.board);
    },
    onCommit: (changes) => {
      game.commit(changes);
      refresh();
    },
    onHover: (r, c) => view.highlight(r, c),
  });

  const onKey = (e: KeyboardEvent) => {
    if (game.solved || !(e.ctrlKey || e.metaKey)) return;
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
