import { Cell } from '../../engine/board';
import type { Change } from '../../engine/history';
import { Game } from '../../game/game';
import {
  currentStep,
  moveProblem,
  toolNeeded,
  tutorialPuzzle as puzzle,
  tutorialSteps as steps,
} from '../../puzzles/tutorial';
import { createBoardView } from '../board/boardView';
import { attachInput, type Tool } from '../board/input';
import { attachKeyboard } from '../board/keyboard';
import { solvedPanelContent } from '../components/endPanels';
import { homeLink } from '../components/homeLink';
import { el } from '../dom';
import { haptic } from '../haptics';
import { pause } from '../motion';
import { playSound } from '../sound';

const NUDGES = {
  'stays-empty': 'That cell stays empty in this picture. Try the highlighted line.',
  'gets-filled': 'That cell gets filled, so it can’t be crossed off. Switch to ■ Fill.',
};

/** The rest of the rules, for anyone who came back to look something up. */
const RULES: [string, string][] = [
  ['Never guess', 'Every puzzle can be solved from its clues alone.'],
  ['Fill and mark', 'Tap to use the current tool and drag to paint a line. Right-click marks.'],
  ['Change your mind', 'Tap a filled or marked cell to clear it. Undo and Redo work too.'],
  ['Relaxed', 'Nothing checks your work. Solve at your own pace.'],
  ['♥ Hearts', 'A wrong fill costs a heart. Lose all three and you start over.'],
  ['Hints', 'You get 3 per puzzle. Each reveals the cell, row or column you’re on.'],
  ['Daily', 'One big puzzle a day, the same for everyone. Keep your streak going.'],
  ['Murals', 'Each tile is its own puzzle. Solve them all to see the whole picture.'],
  ['Jobs', 'A string of fights and digs, where enemies mess with your board.'],
];

/** How to play at #/how-to-play: a guided solve on a real board, then the rest of the rules. */
export function renderHowToPlay(app: HTMLElement): void {
  const game = new Game(puzzle);
  const view = createBoardView(puzzle);

  let tool: Tool = Cell.Filled;
  const toolButton = (t: Tool, label: string) =>
    el('button', {
      className: 'toggle',
      textContent: label,
      onclick: () => (setTool(t), playSound('tool')),
    });
  const fillBtn = toolButton(Cell.Filled, '■ Fill');
  const markBtn = toolButton(Cell.Marked, '✕ Mark');
  const setTool = (t: Tool) => {
    tool = t;
    fillBtn.setAttribute('aria-pressed', String(t === Cell.Filled));
    markBtn.setAttribute('aria-pressed', String(t === Cell.Marked));
    showStep();
  };

  const kicker = el('div', { className: 'coach-kicker' });
  const heading = el('h2', { className: 'coach-title' });
  const text = el('p', { className: 'coach-text' });
  const nudge = el('p', { className: 'coach-nudge' });
  const coach = el('section', { className: 'coach', ariaLive: 'polite' }, [
    kicker,
    heading,
    text,
    nudge,
  ]);
  const solvedPanel = el('div', { className: 'end-panel', hidden: true });

  const screen = el('main', { className: 'screen game how-to' }, [
    el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: 'How to play' })]),
    coach,
    el('div', { className: 'toolbar' }, [
      el('button', {
        textContent: 'Start over',
        onclick: () => renderHowToPlay(app),
      }),
    ]),
    el('div', { className: 'board-wrap' }, [view.root]),
    el('div', { className: 'board-controls' }, [
      el('div', { className: 'segmented' }, [fillBtn, markBtn]),
    ]),
    solvedPanel,
    el('section', { className: 'rules', ariaLabel: 'The rest of the rules' }, [
      el('h2', { textContent: 'Good to know' }),
      el(
        'dl',
        {},
        RULES.flatMap(([name, detail]) => [
          el('dt', { textContent: name }),
          el('dd', { textContent: detail }),
        ]),
      ),
    ]),
  ]);
  app.replaceChildren(screen);

  let shownStep = -1;
  /** Shows the step the board is on. Works it out from the board, so erasing goes back. */
  function showStep() {
    const n = currentStep(game.board);
    const step = steps[n];
    if (!step) return;
    if (n !== shownStep) {
      shownStep = n;
      kicker.textContent = `Step ${n + 1} of ${steps.length}`;
      heading.textContent = step.title;
      text.textContent = step.text;
      view.setFocus(step.lines);
    }
    const needed = toolNeeded(game.board, step);
    fillBtn.classList.toggle('nudge', needed === Cell.Filled && tool !== Cell.Filled);
    markBtn.classList.toggle('nudge', needed === Cell.Marked && tool !== Cell.Marked);
  }

  async function showSolved() {
    view.setFocus([]);
    screen.classList.add('is-solved');
    await pause(900);
    solvedPanel.replaceChildren(
      ...solvedPanelContent(puzzle, 'That’s the whole game. Now try one on your own.', [
        el('button', {
          className: 'button ghost',
          textContent: 'Start over',
          onclick: () => renderHowToPlay(app),
        }),
        el('a', { className: 'button primary', href: '#/', textContent: 'Pick a puzzle →' }),
      ]),
    );
    solvedPanel.hidden = false;
    screen.classList.add('show-end');
    playSound('solve');
    window.scrollTo({ top: 0 });
  }

  const redraw = () => {
    const completed = view.update(game.board);
    if (completed.length && !game.solved) {
      completed.forEach(view.flashLine);
      playSound('line');
      haptic('line');
    }
  };

  /** Whether this stroke has buzzed yet, as on the play screen. */
  let tapped = false;

  /** Applies a stroke up to the first move that contradicts the picture. */
  const play = (changes: Change[]) => {
    const wrong = changes.findIndex((change) => moveProblem(change));
    const { applied } = game.preview(wrong < 0 ? changes : changes.slice(0, wrong));
    if (applied.length && !tapped) haptic('tap');
    tapped = true;
    redraw();
    nudge.textContent = '';
    if (wrong >= 0) {
      nudge.textContent = NUDGES[moveProblem(changes[wrong])!];
      view.flashError(changes[wrong].index);
      playSound('error');
      haptic('hit');
    } else if (applied.length) {
      const to = applied[applied.length - 1].to;
      playSound(to === Cell.Filled ? 'fill' : to === Cell.Marked ? 'mark' : 'erase');
    }
    return { applied, stop: wrong >= 0 };
  };

  const commit = (changes: Change[]) => {
    tapped = false;
    game.commit(changes);
    redraw();
    showStep();
    if (game.solved) void showSolved();
  };

  attachInput(view.root, {
    board: game.board,
    getTool: () => tool,
    enabled: () => !game.solved,
    onPreview: play,
    onCommit: commit,
    onCancel: (changes) => {
      tapped = false;
      for (const { index, from } of changes) game.board.cells[index] = from;
      redraw();
    },
    // No hover highlight here: the only highlighted lines are the ones the step is about.
    onHover: () => {},
  });
  attachKeyboard(view, {
    board: game.board,
    enabled: () => !game.solved,
    act: (index, match, target) => commit(play([{ index, from: match, to: target }]).applied),
    onCursorMove: () => {},
  });

  setTool(Cell.Filled);
  view.update(game.board);
}
