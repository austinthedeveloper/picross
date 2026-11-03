import { completeEncounter, startRun, withBoard, type RunState } from '../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../game/runSave';
import { DEFAULT_RUN_ID, getRun, type Encounter, type RunDef } from '../../puzzles/runs';
import { el } from '../dom';
import { formatTime } from '../format';
import { renderGameScreen, type PlaySession } from './gameScreen';

const KIND_ICON: Record<Encounter['kind'], string> = { fight: '⚔️', dig: '⛏️' };
const KIND_LABEL: Record<Encounter['kind'], string> = { fight: 'Fight', dig: 'Dig' };

/** The saved run with its definition, or null if there's none (or its run was removed). */
function loadRun(): { state: RunState; def: RunDef } | null {
  const state = getCurrentRun();
  const def = state && getRun(state.runId);
  return state && def ? { state, def } : null;
}

const backToPuzzles = () =>
  el('a', { className: 'button ghost', href: '#/', textContent: '← Puzzles' });

function hpBar(state: RunState): HTMLElement {
  const bar = el('div', { className: 'hp', role: 'meter', ariaLabel: 'HP' }, [
    el('span', { className: 'hp-label', textContent: `HP ${state.hp}/${state.maxHp}` }),
    el('span', { className: 'hp-track' }, [el('span', { className: 'hp-fill' })]),
  ]);
  bar.style.setProperty('--hp', String(state.hp / state.maxHp));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(state.maxHp));
  bar.setAttribute('aria-valuenow', String(state.hp));
  return bar;
}

function newRunButton(app: HTMLElement, label: string): HTMLButtonElement {
  return el('button', {
    className: 'button primary',
    textContent: label,
    onclick: () => {
      const def = getRun(DEFAULT_RUN_ID)!;
      saveCurrentRun(startRun(def.id, def.hp));
      renderRunScreen(app);
    },
  });
}

/**
 * The run hub at #/run: a start panel when there's no run, the path map while
 * one is active, and a results screen once it's won or lost.
 */
export function renderRunScreen(app: HTMLElement): void {
  const run = loadRun();
  const body = !run
    ? startPanel(app)
    : run.state.status === 'active'
      ? pathMap(app, run.state, run.def)
      : results(app, run.state, run.def);
  app.replaceChildren(el('main', { className: 'screen run' }, body));
}

function startPanel(app: HTMLElement): Node[] {
  const def = getRun(DEFAULT_RUN_ID)!;
  return [
    el('header', { className: 'topbar' }, [backToPuzzles(), el('h1', { textContent: 'Runs' })]),
    el('section', { className: 'run-card' }, [
      el('h2', { textContent: def.name }),
      el('p', {
        className: 'run-meta',
        textContent: `${def.encounters.length} encounters · ${def.hp} HP`,
      }),
      el(
        'ol',
        { className: 'run-preview' },
        def.encounters.map((e) => el('li', { textContent: `${KIND_ICON[e.kind]} ${e.name}` })),
      ),
      newRunButton(app, 'Start run'),
    ]),
  ];
}

function pathMap(app: HTMLElement, state: RunState, def: RunDef): Node[] {
  const nodes = def.encounters.map((encounter, i) => {
    const status = i < state.node ? 'cleared' : i === state.node ? 'current' : 'locked';
    const content = [
      el('span', {
        className: 'node-icon',
        ariaHidden: 'true',
        textContent: KIND_ICON[encounter.kind],
      }),
      el('span', { className: 'node-text' }, [
        el('span', { className: 'node-name', textContent: encounter.name }),
        el('span', {
          className: 'node-kind',
          textContent: `${KIND_LABEL[encounter.kind]} · ${encounter.puzzle.width}×${encounter.puzzle.height}`,
        }),
        ...(status === 'current' && encounter.blurb
          ? [el('span', { className: 'node-blurb', textContent: encounter.blurb })]
          : []),
      ]),
      el('span', {
        className: 'node-status',
        textContent:
          status === 'cleared'
            ? '✓'
            : status === 'current'
              ? state.board
                ? 'Continue'
                : 'Start'
              : '🔒',
      }),
    ];
    const label = `${encounter.name}, ${KIND_LABEL[encounter.kind]}, ${status}`;
    const node =
      status === 'current'
        ? el('a', { className: 'node-body', href: '#/run/play', ariaLabel: label }, content)
        : el('div', { className: 'node-body', ariaLabel: label }, content);
    return el('li', { className: `node ${status}` }, [node]);
  });

  let armed = false;
  const abandon = el('button', {
    className: 'button ghost abandon',
    textContent: 'Abandon run',
    onclick: () => {
      if (!armed) {
        armed = true;
        abandon.textContent = 'Tap again to abandon';
        window.setTimeout(() => {
          armed = false;
          abandon.textContent = 'Abandon run';
        }, 3000);
        return;
      }
      saveCurrentRun(null);
      renderRunScreen(app);
    },
  });

  return [
    el('header', { className: 'topbar' }, [backToPuzzles(), el('h1', { textContent: def.name })]),
    el('div', { className: 'run-status' }, [
      hpBar(state),
      el('span', {
        className: 'gadgets',
        textContent: state.gadgets.length ? state.gadgets.join(', ') : 'No gadgets yet',
      }),
    ]),
    el('ol', { className: 'run-path', ariaLabel: 'Run map' }, nodes),
    el('div', { className: 'run-actions' }, [abandon]),
  ];
}

function results(app: HTMLElement, state: RunState, def: RunDef): Node[] {
  const won = state.status === 'won';
  const cleared = Math.min(state.node, def.encounters.length);
  return [
    el('header', { className: 'topbar' }, [backToPuzzles(), el('h1', { textContent: def.name })]),
    el('section', { className: `run-card results ${won ? 'won' : 'lost'}` }, [
      el('h2', { textContent: won ? 'Job done!' : 'Run over' }),
      el('p', {
        className: 'run-meta',
        textContent: `${cleared}/${def.encounters.length} encounters cleared · ${state.hp}/${state.maxHp} HP left`,
      }),
      el('div', { className: 'end-actions' }, [
        el('a', { className: 'button ghost', href: '#/', textContent: 'Puzzles' }),
        newRunButton(app, 'New run'),
      ]),
    ]),
  ];
}

/** Plays the current encounter at #/run/play. Returns the game screen's cleanup. */
export function renderRunEncounter(app: HTMLElement): (() => void) | undefined {
  const run = loadRun();
  if (!run || run.state.status !== 'active') {
    location.replace('#/run');
    return undefined;
  }
  const { def, state } = run;
  const encounter = def.encounters[state.node];
  const length = def.encounters.length;

  const session: PlaySession = {
    back: { href: '#/run', label: '← Map' },
    title: encounter.name,
    // Fights decide what mistakes cost (#27); until then encounters don't check fills.
    mode: 'relaxed',
    saved: state.board,
    save: (board) => {
      const current = getCurrentRun();
      if (current?.status === 'active') saveCurrentRun(withBoard(current, board));
    },
    complete(game) {
      const next = completeEncounter(getCurrentRun() ?? state, length);
      saveCurrentRun(next);
      const last = next.status === 'won';
      return {
        note: `${encounter.name} cleared in ${formatTime(game.elapsed)}`,
        actions: [
          el('a', {
            className: 'button primary',
            href: '#/run',
            textContent: last ? 'See results →' : 'Back to map →',
          }),
        ],
      };
    },
  };
  return renderGameScreen(app, encounter.puzzle, session);
}

/** One line for the puzzle list: start or continue a run. */
export function runBanner(): HTMLElement {
  const run = loadRun();
  const def = run?.def ?? getRun(DEFAULT_RUN_ID)!;
  const active = run?.state.status === 'active';
  return el('a', { className: 'run-banner', href: '#/run' }, [
    el('span', {
      className: 'run-banner-title',
      textContent: active ? 'Continue run' : 'Start a run',
    }),
    el('span', {
      className: 'run-banner-meta',
      textContent: active
        ? `${def.name} · encounter ${run!.state.node + 1} of ${def.encounters.length} · HP ${run!.state.hp}/${run!.state.maxHp}`
        : `${def.name} · ${def.encounters.length} encounters`,
    }),
    el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
  ]);
}
