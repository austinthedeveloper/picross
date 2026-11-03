import { Cell } from '../../engine/board';
import { revertMove, type Change } from '../../engine/history';
import { Game, MAX_HEARTS, type HintTarget } from '../../game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { getSettings } from '../../game/settings';
import type { Puzzle } from '../../puzzles/format';
import { puzzles } from '../../puzzles/index';
import { createBoardView, type Line } from '../board/boardView';
import { attachInput, type Tool } from '../board/input';
import { attachKeyboard } from '../board/keyboard';
import { attachZoom } from '../board/zoom';
import { createFailedPanel, solvedPanelContent } from '../components/endPanels';
import { createHintMenu } from '../components/hintMenu';
import { createMuteButton } from '../components/muteButton';
import { createZoomBar } from '../components/zoomBar';
import { el } from '../dom';
import { formatTime } from '../format';
import { playSound } from '../sound';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Renders the play screen for one puzzle. All board changes (mouse, touch,
 * keyboard, hints) go through `Game`; `refresh` then redraws, saves, and
 * reacts to solving or failing. Returns a cleanup function for the router.
 */
export function renderGameScreen(app: HTMLElement, puzzle: Puzzle): () => void {
  const game = new Game(puzzle, getSavedBoard(puzzle.id), getSettings().mode);
  const view = createBoardView(puzzle);

  // Top bar
  const title = el('h1', { textContent: `${puzzle.width}×${puzzle.height}` });
  const hearts = el('span', { className: 'hearts', hidden: game.mode !== 'hearts' });
  const timer = el('span', { className: 'timer', role: 'timer', ariaLabel: 'Time' });

  // Toolbar
  let tool: Tool = Cell.Filled;
  const toolButton = (t: Tool, label: string) => {
    const button = el('button', { className: 'toggle', textContent: label, title: label.slice(2) });
    button.onclick = () => setTool(t);
    return button;
  };
  const fillBtn = toolButton(Cell.Filled, '■ Fill');
  const markBtn = toolButton(Cell.Marked, '✕ Mark');
  const setTool = (t: Tool) => {
    tool = t;
    fillBtn.setAttribute('aria-pressed', String(t === Cell.Filled));
    markBtn.setAttribute('aria-pressed', String(t === Cell.Marked));
  };
  setTool(Cell.Filled);

  const undoBtn = el('button', { textContent: 'Undo', title: 'Undo (Ctrl+Z)' });
  const redoBtn = el('button', { textContent: 'Redo', title: 'Redo (Ctrl+Shift+Z)' });
  const resetBtn = el('button', { textContent: 'Reset', title: 'Clear the board' });
  undoBtn.onclick = () => (game.undo(), refresh());
  redoBtn.onclick = () => (game.redo(), refresh());
  resetBtn.onclick = () => (game.reset(), refresh());
  const hintMenu = createHintMenu(useHint);

  const toolbar = el('div', { className: 'toolbar' }, [
    el('div', { className: 'segmented' }, [fillBtn, markBtn]),
    el('div', { className: 'actions' }, [hintMenu.root, undoBtn, redoBtn, resetBtn]),
  ]);

  // Board, zoom, and end-of-game panels
  const boardWrap = el('div', { className: 'board-wrap' }, [view.root]);
  const zoomBar = createZoomBar(attachZoom(boardWrap, view.root));
  const solvedPanel = el('div', { className: 'end-panel', hidden: true });
  const failedPanel = createFailedPanel(() => (game.retry(), refresh()));

  // Screen-reader announcements
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const announce = (message: string) => {
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = message));
  };

  const screen = el('main', { className: 'screen game' }, [
    el('header', { className: 'topbar' }, [
      el('a', { className: 'button ghost', href: '#/', textContent: '← Puzzles' }),
      title,
      hearts,
      timer,
      createMuteButton(true),
    ]),
    toolbar,
    boardWrap,
    zoomBar,
    el('p', {
      className: 'help keyboard',
      textContent:
        'Arrows move · Space fill · X mark · Delete clear · Shift+arrows repeat · Ctrl+Z undo',
    }),
    solvedPanel,
    failedPanel,
    live,
  ]);
  app.replaceChildren(screen);

  /** Records the solve and shows the picture, time, and a link to the next puzzle. */
  const showSolved = () => {
    const prevBest = getPuzzleStats(puzzle.id)?.bestTime;
    const newBest = recordSolve(puzzle.id, game.elapsed);
    const time = formatTime(game.elapsed);
    let note =
      prevBest === undefined
        ? `Time ${time}`
        : newBest
          ? `New best: ${time} (was ${formatTime(prevBest)})`
          : `Time ${time} · Best ${formatTime(prevBest)}`;
    if (game.hintsUsed) note += ` · ${plural(game.hintsUsed, 'hint')}`;

    title.textContent = puzzle.name;
    const next = puzzles[puzzles.indexOf(puzzle) + 1];
    solvedPanel.replaceChildren(...solvedPanelContent(puzzle, note, next));
    solvedPanel.hidden = false;
    view.highlight(null, null);
    announce(`Solved! ${puzzle.name}. ${note}.`);
    playSound('solve');
  };

  const lineName = (line: Line) => `${line.kind === 'row' ? 'Row' : 'Column'} ${line.index + 1}`;

  /** Redraws the board and celebrates lines that were just completed. */
  const redraw = () => {
    const completed = view.update(game.board);
    if (completed.length && !game.solved) {
      announce(`${completed.map(lineName).join(', ')} complete`);
      completed.forEach(view.flashLine);
      playSound('line');
    }
  };

  /** Applies changes through the game; tells the input layer what was applied. */
  const play = (changes: Change[]) => {
    const { applied, mistake } = game.preview(changes);
    redraw();
    if (mistake) {
      playSound('error');
      view.flashError(mistake.index);
      announce(
        game.failed
          ? 'Wrong. Out of hearts.'
          : `Wrong, that cell is empty. ${plural(game.hearts, 'heart')} left.`,
      );
    } else if (applied.length) {
      const to = applied[applied.length - 1].to;
      playSound(to === Cell.Filled ? 'fill' : to === Cell.Marked ? 'mark' : 'erase');
    }
    return { applied, stop: Boolean(mistake) };
  };

  const persist = () => {
    if (game.solved) return; // recordSolve already cleared the save
    // A failed board can't continue, so reopening it starts fresh.
    if (game.started && !game.failed) saveBoard(puzzle.id, game.serialize());
    else clearSavedBoard(puzzle.id);
  };

  // The clock runs while the page is visible and the puzzle is in play.
  let lastTick = performance.now();
  const tick = () => {
    const now = performance.now();
    if (document.visibilityState === 'visible') game.tick(now - lastTick);
    lastTick = now;
    timer.textContent = formatTime(game.elapsed);
  };
  const clock = window.setInterval(tick, 250);
  const onVisibilityChange = () => {
    tick();
    if (document.visibilityState === 'hidden') persist();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  /** Syncs everything after a committed change. */
  function refresh() {
    tick();
    persist();
    redraw();
    undoBtn.disabled = !game.history.canUndo;
    redoBtn.disabled = !game.history.canRedo;
    hearts.textContent = '♥'.repeat(game.hearts) + '♡'.repeat(MAX_HEARTS - game.hearts);
    hearts.ariaLabel = `${game.hearts} of ${MAX_HEARTS} hearts left`;
    hintMenu.update(game.hintsLeft, keyboard.cursor);
    screen.classList.toggle('is-solved', game.solved);
    screen.classList.toggle('is-failed', game.failed);
    toolbar.inert = game.over;
    failedPanel.hidden = !game.failed;
    if (game.solved && solvedPanel.hidden) showSolved();
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
    onCancel: (changes) => {
      revertMove(game.board, changes);
      redraw();
    },
    onHover: (r, c) => view.highlight(r, c),
  });

  const keyboard = attachKeyboard(view, {
    board: game.board,
    enabled: () => !game.over,
    act: (index, match, target) => {
      const { applied } = play([{ index, from: match, to: target }]);
      game.commit(applied);
      refresh();
    },
    onCursorMove: (cursor) => hintMenu.update(game.hintsLeft, cursor),
  });

  hintMenu.root.addEventListener('toggle', () => {
    screen.classList.toggle('hinting', hintMenu.root.open);
    if (hintMenu.root.open) view.highlight(keyboard.cursor.r, keyboard.cursor.c);
  });

  function useHint(target: HintTarget) {
    hintMenu.close();
    const { r, c } = keyboard.cursor;
    const changes = game.hint(target, r, c);
    if (!changes.length) {
      announce(game.hintsLeft ? 'Already correct. No hint used.' : 'No hints left.');
      return;
    }
    refresh();
    view.flashHint(changes.map((change) => change.index));
    if (!game.solved) playSound('hint');
    announce(`Hint used. ${game.hintsLeft} left.`);
  }

  const onUndoKeys = (e: KeyboardEvent) => {
    if (game.over || !(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) game.undo();
    else if ((key === 'z' && e.shiftKey) || key === 'y') game.redo();
    else return;
    e.preventDefault();
    refresh();
  };
  window.addEventListener('keydown', onUndoKeys);

  refresh();
  return () => {
    tick();
    persist();
    window.clearInterval(clock);
    window.removeEventListener('keydown', onUndoKeys);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
