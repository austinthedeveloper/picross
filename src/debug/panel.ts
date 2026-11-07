import { addGadget, startRun } from '../game/run';
import {
  getCurrentRun,
  getJobStats,
  markSceneSeen,
  recordRunResult,
  saveCurrentRun,
} from '../game/runSave';
import { getSettings } from '../game/settings';
import { chapters } from '../puzzles/chapters';
import { ENDLESS_GADGETS, ENDLESS_HP, ENDLESS_ID } from '../puzzles/endless';
import { catalog } from '../puzzles/gadgets';
import { encounters, getRun, runs } from '../puzzles/runs';
import { scenes } from '../puzzles/scenes';
import { el } from '../ui/dom';
import { debug } from './hooks';
import './panel.css';

const SAVE_KEYS = ['picross:v1', 'picross:run', 'picross:daily'];

/**
 * Leaves the game screen before changing the run: it saves its board on the way
 * out, and that must not land on the new run.
 */
function leaveBoard(): Promise<void> {
  if (location.hash === '#/' || location.hash === '') return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener('hashchange', () => resolve(), { once: true });
    location.hash = '#/';
  });
}

/** Changes saved data with no board up, then goes to `target`. */
async function change(apply: () => void, target = location.hash) {
  await leaveBoard();
  apply();
  location.hash = target;
}

/** Records a win on every job, so all chapters and Endless are open. */
function unlockEverything() {
  const current = getCurrentRun();
  for (const job of runs) {
    if (!getJobStats(job.id)?.wins) {
      recordRunResult({ ...startRun(job.id, job.hp), status: 'won' });
    }
  }
  saveCurrentRun(current);
  for (const chapter of chapters) if (chapter.opening) markSceneSeen(chapter.opening);
}

function jumpTo(jobId: string, node: number) {
  const job = getRun(jobId);
  if (!job) return;
  saveCurrentRun({ ...startRun(job.id, job.hp, getSettings().mode, job.gadgets), node });
}

/**
 * Starts any fight, even one only a boss fight or Overtime uses: an Endless run
 * whose only fight is this one, so it comes back after every break.
 */
function fightAny(id: string) {
  saveCurrentRun({
    ...startRun(ENDLESS_ID, ENDLESS_HP, getSettings().mode, ENDLESS_GADGETS),
    endless: { seed: 0, fights: [id], digs: [], rests: [] },
  });
}

/** Ends the current run: straight to its results screen. */
function finishRun(won: boolean) {
  const run = getCurrentRun();
  if (!run) return;
  const length = getRun(run.runId)?.encounters.length ?? run.node;
  saveCurrentRun(won ? { ...run, node: length, status: 'won' } : { ...run, hp: 0, status: 'lost' });
}

const options = (items: { value: string; label: string }[]) =>
  items.map(({ value, label }) => {
    const option = el('option', { textContent: label });
    option.value = value;
    return option;
  });

const button = (label: string, onclick: () => void) =>
  el('button', { className: 'button ghost', textContent: label, onclick });

const section = (title: string, ...content: HTMLElement[]) =>
  el('section', { className: 'picross-debug-section' }, [
    el('h2', { textContent: title }),
    ...content,
  ]);

const row = (...content: HTMLElement[]) => el('div', { className: 'picross-debug-row' }, content);

/** The dev tools: a floating DEV button that opens a drawer. Dev builds only (#65). */
export function installDebugPanel(): void {
  document.title = `DEV ${document.title}`;

  const status = el('p', { className: 'picross-debug-status', role: 'status' });
  const say = (message: string) => (status.textContent = message);

  // Health
  const health = el('input', { type: 'checkbox', checked: debug.infiniteHealth() });
  health.onchange = () => {
    debug.setInfiniteHealth(health.checked);
    say(health.checked ? 'Infinite health on.' : 'Infinite health off.');
  };

  // Jump to a job and node
  const job = el(
    'select',
    { ariaLabel: 'Job' },
    options(runs.map((r) => ({ value: r.id, label: r.name }))),
  );
  const node = el('select', { ariaLabel: 'Encounter' });
  const fillNodes = () => {
    const encounters = getRun(job.value)?.encounters ?? [];
    node.replaceChildren(
      ...options(encounters.map((e, i) => ({ value: String(i), label: `${i + 1}. ${e.name}` }))),
    );
  };
  job.onchange = fillNodes;
  fillNodes();

  // Any fight, by itself
  const fight = el(
    'select',
    { ariaLabel: 'Any fight' },
    options(
      encounters
        .filter((e) => e.enemy)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({ value: e.id, label: e.name })),
    ),
  );

  // Gadgets
  const gadget = el(
    'select',
    { ariaLabel: 'Gadget' },
    options(catalog.map((g) => ({ value: g.id, label: `${g.icon} ${g.name}` }))),
  );

  // Scenes
  const scene = el(
    'select',
    { ariaLabel: 'Scene' },
    options(scenes.map((s) => ({ value: s.id, label: s.id }))),
  );

  // On a phone the open drawer covers the board, so anything that takes you
  // somewhere closes it first.
  const close = () => {
    drawer.hidden = true;
    toggle.ariaExpanded = 'false';
  };
  const go = (apply: () => void, target?: string) => {
    close();
    void change(apply, target);
  };

  const inFight = (action: (fight: NonNullable<typeof debug.fight>) => void) => () => {
    if (debug.fight) action(debug.fight);
    else say('No fight is up.');
  };

  const drawer = el(
    'aside',
    { className: 'picross-debug-drawer', ariaLabel: 'Debug tools', hidden: true },
    [
      section(
        'Player',
        el('label', { className: 'picross-debug-row' }, [
          health,
          'Infinite health (HP and hearts)',
        ]),
      ),
      section(
        'This board',
        row(
          button('Solve board', () => {
            if (!debug.board) return say('No board is up.');
            close();
            debug.board.solve();
          }),
          button(
            'Enemy −10',
            inFight((f) => f.damage(10)),
          ),
          button(
            'Next phase',
            inFight((f) => f.nextPhase()),
          ),
        ),
      ),
      section(
        'Jump',
        row(job, node),
        row(
          button('Go', () => go(() => jumpTo(job.value, Number(node.value)), '#/run/play')),
          button('Win run', () => go(() => finishRun(true), '#/run')),
          button('Lose run', () => go(() => finishRun(false), '#/run')),
        ),
      ),
      section(
        'Fight anyone',
        row(
          fight,
          button('Fight', () => go(() => fightAny(fight.value), '#/run/play')),
        ),
      ),
      section(
        'Gadgets',
        row(
          gadget,
          button('Grant', () => {
            if (!getCurrentRun()) return say('Start a run first.');
            go(() => saveCurrentRun(addGadget(getCurrentRun()!, gadget.value)));
          }),
        ),
      ),
      section(
        'Scenes',
        row(
          scene,
          button('Play', () => go(() => {}, `#/scene/${scene.value}`)),
        ),
      ),
      section(
        'Saves',
        row(
          button('Unlock everything', () => go(unlockEverything, '#/run')),
          button('Reset everything', () => {
            void leaveBoard().then(() => {
              for (const key of SAVE_KEYS) localStorage.removeItem(key);
              location.reload();
            });
          }),
        ),
      ),
      status,
    ],
  );

  const toggle = el('button', {
    className: 'picross-debug-toggle',
    textContent: '🐞 DEV',
    ariaLabel: 'Debug tools',
    onclick: () => {
      drawer.hidden = !drawer.hidden;
      toggle.ariaExpanded = String(!drawer.hidden);
    },
  });
  document.body.append(drawer, toggle);
}
