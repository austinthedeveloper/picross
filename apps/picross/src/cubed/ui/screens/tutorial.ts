import { BROKEN, PAINTED, type Block, type Tool } from '@picross/block/game/game';
import { updateSettings } from '../../game/settings';
import { isFilled, parsePuzzle } from '@picross/block/puzzles/format';
import { PUZZLES } from '@picross/block/puzzles/index';
import { el } from '@picross/shared/ui/dom';
import { playSound } from '@picross/shared/ui/sound';
import { createPlay } from '@picross/play-block/ui/screens/play';

/**
 * The tutorial's block, 3 wide, 2 tall, 2 deep. Rows along x (cube = x + 3 * (z + 2y)):
 * bottom back "s.s" (a circle 2), bottom front "sss" (3 of 3), top back "..." (0),
 * top front ".s." (1).
 */
export const TUTORIAL = parsePuzzle({
  id: 'tutorial',
  name: 'Step',
  colors: { s: 'coral' },
  layers: [
    ['s.s', 'sss'],
    ['...', '.s.'],
  ],
});

interface Step {
  text: string;
  /** Lines to light (ids in the tutorial's line list). */
  lit?: number[];
  /** The only cubes the step lets you touch, and with which tool. */
  cells?: number[];
  tool?: Tool;
  /** The cubes must end up like this to go on. */
  goal?: Record<number, Block>;
  /** Or: go on after turning, or after peeling. */
  wait?: 'orbit' | 'peel';
}

const xLine = (y: number, z: number) => y * 2 + z;

export const STEPS: Step[] = [
  {
    text: 'This block hides a shape. Drag empty space (or use Turn) to look around it.',
    wait: 'orbit',
  },
  {
    text: 'The lit row’s clue, on the faces at its ends, is 0: none of it is the shape. Break all three cubes.',
    lit: [xLine(1, 0)],
    cells: [6, 7, 8],
    tool: 'break',
    goal: { 6: BROKEN, 7: BROKEN, 8: BROKEN },
  },
  {
    text: 'This row says 3, and it’s 3 long: every cube is the shape. Pick Paint and paint all three, so they can’t be broken by accident.',
    lit: [xLine(0, 1)],
    cells: [3, 4, 5],
    tool: 'paint',
    goal: { 3: PAINTED, 4: PAINTED, 5: PAINTED },
  },
  {
    text: 'A circle means two pieces. 2 cubes in two pieces in a row of 3: both ends. Pick Break and break the middle one.',
    lit: [xLine(0, 0)],
    cells: [1],
    tool: 'break',
    goal: { 1: BROKEN },
  },
  {
    text: 'Peel lifts layers off to see inside. Pick Y and slide Peel to lift off the top layer.',
    wait: 'peel',
  },
  {
    text: 'Now finish it: break the two cubes left that aren’t the shape. Every clue counts what’s left of its line. Slide Peel back to 0 first.',
  },
];

/** The guided tutorial (#/tutorial): a real block, one step at a time. Records nothing. */
export function renderTutorial(root: HTMLElement): () => void {
  let step = 0;
  /** The board as each step began, for going back. */
  let snapshots: Uint8Array[] = [];

  const text = el('p', { className: 'coach-text' });
  const nudge = el('p', { className: 'coach-nudge', role: 'alert' });
  const count = el('span', { className: 'kicker' });
  const back = el('button', { className: 'button ghost', textContent: 'Back a step' });
  const skip = el('a', { className: 'button ghost', href: '#/', textContent: 'Skip' });
  skip.onclick = () => updateSettings({ tutorialDone: true });

  const play = createPlay(root, {
    puzzle: TUTORIAL,
    title: 'Tutorial',
    mode: 'relaxed',
    hints: false,
    hooks: {
      allow(tool, cell) {
        const s = STEPS[step];
        if (tool === 'break' && isFilled(TUTORIAL, cell)) {
          say('That cube is part of the shape: the clues say so. Leave it.');
          return false;
        }
        if (s.cells && !s.cells.includes(cell)) {
          say('Stick to the lit row for now.');
          return false;
        }
        if (s.tool && s.tool !== tool) {
          say(s.tool === 'paint' ? 'Pick Paint first.' : 'Pick Break first.');
          return false;
        }
        return true;
      },
      changed: () => check(),
      orbited: () => STEPS[step].wait === 'orbit' && advance(),
      peeled: (axis, layers) =>
        STEPS[step].wait === 'peel' && axis === 'y' && layers > 0 && advance(),
      solved() {
        updateSettings({ tutorialDone: true });
        play.coach.hidden = true;
        const first = PUZZLES[0];
        return [
          el('h2', { textContent: 'You’ve got it!' }),
          el('p', {
            className: 'end-note',
            textContent: 'That’s all the rules. Hidden clues and Hearts mode are in How to play.',
          }),
          el('div', { className: 'end-actions' }, [
            el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
            el('a', {
              className: 'button primary',
              href: `#/play/${first.id}`,
              textContent: 'First puzzle',
            }),
          ]),
        ];
      },
    },
  });
  const { game, view, coach } = play;
  coach.dataset.owned = 'tutorial';
  coach.hidden = false;
  coach.replaceChildren(
    el('div', { className: 'coach-head' }, [count, el('span', {}, [back, skip])]),
    text,
    nudge,
  );

  function say(message: string) {
    nudge.textContent = message;
    playSound('error');
  }

  function show() {
    const s = STEPS[step];
    count.textContent = `Step ${step + 1} of ${STEPS.length}`;
    text.textContent = s.text;
    nudge.textContent = '';
    back.disabled = step === 0;
    view.lit = new Set(s.lit ?? []);
    if (s.tool) play.setTool(s.tool);
    view.rebuild();
    play.announce(s.text);
  }

  function advance() {
    if (step >= STEPS.length - 1) return;
    step++;
    snapshots[step] = Uint8Array.from(game.blocks);
    playSound('line');
    show();
  }

  function check() {
    const goal = STEPS[step].goal;
    if (goal && Object.entries(goal).every(([cell, b]) => game.blocks[Number(cell)] === b)) {
      advance();
    }
  }

  back.onclick = () => {
    if (step === 0) return;
    step--;
    game.blocks.set(snapshots[step]);
    snapshots = snapshots.slice(0, step + 1);
    play.refresh();
    show();
  };

  snapshots[0] = Uint8Array.from(game.blocks);
  show();
  return () => {
    play.cleanup();
  };
}
