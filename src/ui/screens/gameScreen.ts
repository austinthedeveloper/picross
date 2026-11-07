import { debug } from '../../debug/hooks';
import { Cell } from '../../engine/board';
import { revertMove, type Change } from '../../engine/history';
import { Game, MAX_HEARTS, type GameMode, type HintTarget } from '../../game/game';
import type { SavedBoard } from '../../game/progress';
import type { Puzzle } from '../../puzzles/format';
import { createBoardView, type BoardView, type Line } from '../board/boardView';
import { attachInput, type Tool } from '../board/input';
import { attachKeyboard } from '../board/keyboard';
import { attachZoom } from '../board/zoom';
import { createEndPanel, createFailedPanel, solvedPanelContent } from '../components/endPanels';
import { freePlaySession } from './freePlaySession';
import { createHintMenu } from '../components/hintMenu';
import { homeLink } from '../components/homeLink';
import { createMuteButton } from '../components/muteButton';
import { createZoomBar } from '../components/zoomBar';
import { el } from '../dom';
import { formatTime, lineName, plural } from '../format';
import { haptic } from '../haptics';
import { pause } from '../motion';
import { playSound } from '../sound';

/**
 * Where a puzzle is being played from. Free play saves to the puzzle list's
 * progress; a run encounter saves into the run. The screen itself only knows
 * this interface.
 */
export interface PlaySession {
  /** A screen between this one and home (e.g. the run's map), linked next to Home. */
  back?: { href: string; label: string };
  /** Heading before the puzzle is solved (after, it shows the puzzle's name). */
  title: string;
  mode: GameMode;
  saved?: SavedBoard;
  /** Saves the in-progress board, or clears it with null. */
  save(board: SavedBoard | null): void;
  /** Called once when solved. Returns the solved panel's note and buttons. */
  complete(game: Game): { note: string; actions: HTMLElement[] };

  // Optional encounter hooks (fights use all of them).

  /** Extra UI shown between the toolbar and the board. */
  header?: HTMLElement;
  /** Restyles the screen: adds a `theme-<name>` class (e.g. the dig's dirt board). */
  theme?: string;
  /**
   * Called once with the board view before play starts (e.g. to fog clues).
   * `controls` lets an encounter change the board itself and then resync the
   * screen (e.g. the Mimic swapping rows).
   */
  onBoard?(view: BoardView, controls: BoardControls): void;
  /** Lines that just became complete. May return a message to announce instead. */
  onLinesComplete?(lines: Line[]): string | void;
  /** A wrong fill was caught (hearts and battle modes). May return a message to announce. */
  onMistake?(): string | void;
  /** Non-null once something outside the puzzle ends play (e.g. knocked out). */
  ended?(): EndState | null;
  /** Plays after `complete` and before the solved panel (e.g. the picture attacking). */
  celebrate?(board: HTMLElement): Promise<void>;
}

export interface BoardControls {
  game: Game;
  /** Redraws, saves, and rechecks the board after an outside change. */
  refresh(): void;
}

/** A panel that replaces play when a session ends it early. */
export interface EndState {
  title: string;
  note: string;
  actions: HTMLElement[];
}

/**
 * Renders the play screen for one puzzle. All board changes (mouse, touch,
 * keyboard, hints) go through `Game`; `refresh` then redraws, saves, and
 * reacts to solving or failing. Returns a cleanup function for the router.
 */
export function renderGameScreen(
  app: HTMLElement,
  puzzle: Puzzle,
  session: PlaySession = freePlaySession(puzzle),
): () => void {
  const game = new Game(puzzle, session.saved, session.mode);
  const view = createBoardView(puzzle);
  session.onBoard?.(view, { game, refresh: () => refresh() });

  // Top bar
  const title = el('h1', { textContent: session.title });
  const hearts = el('span', { className: 'hearts', hidden: game.mode !== 'hearts' });
  const timer = el('span', { className: 'timer', role: 'timer', ariaLabel: 'Time' });

  // Toolbar
  // The board's scroll box and zoom, made first so the Move tool can switch panning.
  const boardWrap = el('div', { className: 'board-wrap' }, [view.root]);
  const zoom = attachZoom(boardWrap, view.root);
  zoom.onChange((z) => {
    moveBtn.hidden = z <= 1;
    if (z <= 1 && moving) setTool(tool);
  });

  let tool: Tool = Cell.Filled;
  /** The Move tool, only offered while zoomed: one finger drags the board instead of painting. */
  let moving = false;
  const toolButton = (t: Tool, label: string) => {
    const button = el('button', { className: 'toggle', textContent: label, title: label.slice(2) });
    button.onclick = () => (setTool(t), playSound('tool'));
    return button;
  };
  const fillBtn = toolButton(Cell.Filled, '■ Fill');
  const markBtn = toolButton(Cell.Marked, '✕ Mark');
  const moveBtn = el('button', {
    className: 'toggle move-tool',
    textContent: '✥',
    title: 'Move the board',
    ariaLabel: 'Move',
    hidden: true,
  });
  const setTool = (t: Tool | 'move') => {
    moving = t === 'move';
    if (t !== 'move') tool = t;
    zoom.setPanning(moving);
    fillBtn.setAttribute('aria-pressed', String(!moving && tool === Cell.Filled));
    markBtn.setAttribute('aria-pressed', String(!moving && tool === Cell.Marked));
    moveBtn.setAttribute('aria-pressed', String(moving));
  };
  moveBtn.onclick = () => (setTool('move'), playSound('tool'));

  const undoBtn = el('button', { textContent: 'Undo', title: 'Undo (Ctrl+Z)' });
  const redoBtn = el('button', { textContent: 'Redo', title: 'Redo (Ctrl+Shift+Z)' });
  const resetBtn = el('button', { textContent: 'Reset', title: 'Clear the board' });
  undoBtn.onclick = () => (game.undo(), refresh());
  redoBtn.onclick = () => (game.redo(), refresh());
  resetBtn.onclick = () => (game.reset(), refresh());
  const hintMenu = createHintMenu(useHint);

  const toolbar = el('div', { className: 'toolbar' }, [
    el('div', { className: 'actions' }, [hintMenu.root, undoBtn, redoBtn, resetBtn]),
  ]);

  // Board, its controls, and end-of-game panels
  const tools = el('div', { className: 'tools segmented', role: 'group', ariaLabel: 'Tool' }, [
    fillBtn,
    markBtn,
    moveBtn,
  ]);
  const boardControls = el('div', { className: 'board-controls' }, [tools, createZoomBar(zoom)]);
  const solvedPanel = el('div', { className: 'end-panel', hidden: true });
  const failedPanel = createFailedPanel(() => (game.retry(), refresh()));
  const endedPanel = el('div', { className: 'end-panel failed', hidden: true });
  /** Play is over: solved, out of hearts, or ended by the session. */
  const over = () => game.over || Boolean(session.ended?.());

  // Screen-reader announcements
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const announce = (message: string) => {
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = message));
  };

  const screen = el('main', { className: 'screen game' }, [
    el('header', { className: `topbar${session.back ? ' nested' : ''}` }, [
      homeLink(),
      ...(session.back
        ? [
            el('a', {
              className: 'button ghost',
              href: session.back.href,
              textContent: session.back.label,
            }),
          ]
        : []),
      title,
      hearts,
      timer,
      createMuteButton(true),
    ]),
    toolbar,
    ...(session.header ? [session.header] : []),
    boardWrap,
    boardControls,
    el('p', {
      className: 'help keyboard',
      textContent:
        'Arrows move · Space fill · X mark · Delete clear · Shift+arrows repeat · Ctrl+Z undo',
    }),
    solvedPanel,
    failedPanel,
    endedPanel,
    live,
  ]);
  if (session.theme) screen.classList.add(`theme-${session.theme}`);
  app.replaceChildren(screen);

  /** Lets the session record the solve, then shows the picture and its next steps. */
  const showSolved = async () => {
    const { note, actions } = session.complete(game);
    title.textContent = puzzle.name;
    view.highlight(null, null);
    if (session.celebrate) await session.celebrate(view.root);
    // Let the solve wave play on the board, then show only the result.
    else await pause(900);
    solvedPanel.replaceChildren(...solvedPanelContent(puzzle, note, actions));
    solvedPanel.hidden = false;
    showEnd(true);
    announce(`Solved! ${puzzle.name}. ${note}.`);
    playSound('solve');
  };
  let solvedShown = false;

  /** Hides the board and its controls so the end panel is all that's left to see. */
  const showEnd = (end: boolean) => {
    const changed = screen.classList.contains('show-end') !== end;
    screen.classList.toggle('show-end', end);
    if (end && changed) window.scrollTo({ top: 0 });
  };

  /** Redraws the board and celebrates lines that were just completed. */
  const redraw = () => {
    const completed = view.update(game.board);
    if (completed.length && !game.solved) {
      const names = `${completed.map((l) => lineName(l, true)).join(', ')} complete`;
      const extra = session.onLinesComplete?.(completed);
      announce(extra ? `${names}. ${extra}` : names);
      completed.forEach(view.flashLine);
      playSound('line');
      haptic('line');
    }
  };

  /** Whether this stroke has buzzed yet: it taps once as it starts, not for every cell. */
  let tapped = false;

  /** Applies changes through the game; tells the input layer what was applied. */
  const play = (changes: Change[]) => {
    const { applied, mistake } = game.preview(changes);
    if (!mistake && applied.length && !tapped) haptic('tap');
    tapped = true;
    redraw();
    if (mistake) {
      playSound('error');
      haptic('hit');
      if (game.failed) playSound('knockout', 0.3);
      view.flashError(mistake.index);
      const message = session.onMistake?.();
      announce(
        message ||
          (game.failed
            ? 'Wrong. Out of hearts.'
            : `Wrong, that cell is empty. ${plural(game.hearts, 'heart')} left.`),
      );
    } else if (applied.length) {
      const to = applied[applied.length - 1].to;
      playSound(to === Cell.Filled ? 'fill' : to === Cell.Marked ? 'mark' : 'erase');
    }
    return { applied, stop: Boolean(mistake) };
  };

  const persist = () => {
    if (game.solved) return; // session.complete clears the save
    // A failed board can't continue, so reopening it starts fresh.
    session.save(game.started && !over() ? game.serialize() : null);
  };

  // The clock runs while the page is visible and the puzzle is in play.
  let lastTick = performance.now();
  const tick = () => {
    const now = performance.now();
    if (document.visibilityState === 'visible' && !session.ended?.()) game.tick(now - lastTick);
    lastTick = now;
    timer.textContent = formatTime(game.elapsed);
  };
  const clock = window.setInterval(tick, 250);
  const onVisibilityChange = () => {
    tick();
    if (document.visibilityState === 'hidden') persist();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  if (import.meta.env.VITE_DEBUG === '1') {
    debug.board = {
      solve() {
        const changes = puzzle.solution.cells.flatMap((filled, index) => {
          const from = game.board.cells[index];
          const to = filled ? Cell.Filled : from === Cell.Marked ? Cell.Marked : Cell.Empty;
          return from === to ? [] : [{ index, from, to }];
        });
        const { applied } = play(changes);
        game.commit(applied);
        refresh();
      },
    };
  }

  /** Syncs everything after a committed change. */
  function refresh() {
    tapped = false; // every stroke, key, and hint ends here
    tick();
    persist();
    redraw();
    undoBtn.disabled = !game.history.canUndo;
    redoBtn.disabled = !game.history.canRedo;
    hearts.textContent = '♥'.repeat(game.hearts) + '♡'.repeat(MAX_HEARTS - game.hearts);
    hearts.ariaLabel = `${game.hearts} of ${MAX_HEARTS} hearts left`;
    hintMenu.update(game.hintsLeft, keyboard.cursor);
    const ended = session.ended?.();
    screen.classList.toggle('is-solved', game.solved);
    screen.classList.toggle('is-failed', game.failed || Boolean(ended));
    toolbar.inert = over();
    tools.inert = over();
    failedPanel.hidden = !game.failed;
    if (!game.solved) showEnd(game.failed || Boolean(ended));
    if (ended && endedPanel.hidden) {
      endedPanel.replaceChildren(...createEndPanel(ended.title, ended.note, ended.actions));
      endedPanel.hidden = false;
      announce(`${ended.title}. ${ended.note}`);
    }
    if (game.solved && !solvedShown) {
      solvedShown = true;
      void showSolved();
    }
  }

  attachInput(view.root, {
    board: game.board,
    getTool: () => tool,
    enabled: () => !over() && !moving,
    onPreview: play,
    onCommit: (changes) => {
      game.commit(changes);
      refresh();
    },
    onCancel: (changes) => {
      tapped = false;
      revertMove(game.board, changes);
      redraw();
    },
    onHover: (r, c) => view.highlight(r, c),
  });

  const keyboard = attachKeyboard(view, {
    board: game.board,
    enabled: () => !over(),
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
    if (over() || !(e.ctrlKey || e.metaKey)) return;
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
