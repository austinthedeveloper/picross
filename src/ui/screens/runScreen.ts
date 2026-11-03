import { addGadget, completeEncounter, startRun, withBoard, type RunState } from '../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../game/runSave';
import { getSettings, updateSettings, type Mode } from '../../game/settings';
import { getGadget } from '../../puzzles/gadgets';
import { DEFAULT_RUN_ID, getRun, type Encounter, type RunDef } from '../../puzzles/runs';
import { el } from '../dom';
import { formatTime } from '../format';
import { fightHooks } from './fightHooks';
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
      saveCurrentRun(startRun(def.id, def.hp, getSettings().mode, def.gadgets));
      renderRunScreen(app);
    },
  });
}

const MODE_NOTES: Record<Mode, string> = {
  relaxed: 'Enemies can’t hurt you. Lines and the finished picture still deal damage.',
  hearts: 'Each wrong fill lets the enemy hit you. Run out of HP and the run is over.',
};

/** Relaxed vs. hits-on choice for the next run (shares the puzzle list's mode setting). */
function modePicker(app: HTMLElement): HTMLElement {
  const mode = getSettings().mode;
  const option = (value: Mode, label: string) => {
    const button = el('button', {
      className: 'toggle',
      textContent: label,
      onclick: () => {
        updateSettings({ mode: value });
        renderRunScreen(app);
      },
    });
    button.setAttribute('aria-pressed', String(mode === value));
    return button;
  };
  return el('div', { className: 'run-mode' }, [
    el('div', { className: 'segmented', role: 'group', ariaLabel: 'Run mode' }, [
      option('relaxed', 'Relaxed'),
      option('hearts', '♥ Hits on'),
    ]),
    el('p', { className: 'run-meta', textContent: MODE_NOTES[mode] }),
  ]);
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
      modePicker(app),
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
        className: 'run-mode-label',
        textContent: state.mode === 'hearts' ? '♥ Hits on' : 'Relaxed',
      }),
    ]),
    inventory(state),
    el('ol', { className: 'run-path', ariaLabel: 'Run map' }, nodes),
    el('div', { className: 'run-actions' }, [abandon]),
  ];
}

/** Held gadgets with what each does. They're used from the battle bar in fights. */
function inventory(state: RunState): HTMLElement {
  const items = state.gadgets.flatMap((id) => getGadget(id) ?? []);
  return el('section', { className: 'inventory', ariaLabel: 'Gadgets' }, [
    el('h2', { textContent: 'Gadgets' }),
    items.length
      ? el(
          'ul',
          {},
          items.map((g) =>
            el('li', {}, [
              el('span', { className: 'gadget-icon', textContent: g.icon, ariaHidden: 'true' }),
              el('span', {}, [el('strong', { textContent: g.name }), ` ${g.description}`]),
            ]),
          ),
        )
      : el('p', {
          className: 'run-meta',
          textContent: 'None yet. Solved pictures can turn into gadgets.',
        }),
  ]);
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
      modePicker(app),
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

  const fight = encounter.enemy ? fightHooks(encounter.enemy, encounter.puzzle) : null;
  const session: PlaySession = {
    back: { href: '#/run', label: '← Map' },
    title: encounter.name,
    // In Hearts runs, fights check fills so the enemy can hit back. Digs never do.
    mode: fight && state.mode === 'hearts' ? 'battle' : 'relaxed',
    saved: state.board,
    ...fight?.hooks,
    save: (board) => {
      const current = getCurrentRun();
      if (current?.status === 'active') saveCurrentRun(withBoard(current, board));
    },
    complete(game) {
      const finisher = fight?.land();
      let next = completeEncounter(getCurrentRun() ?? state, length);
      const reward = encounter.puzzle.gadget ? getGadget(encounter.puzzle.gadget) : undefined;
      if (reward) next = addGadget(next, reward.id);
      saveCurrentRun(next);
      const last = next.status === 'won';
      const time = formatTime(game.elapsed);
      const got = reward ? ` · You got ${reward.icon} ${reward.name}!` : '';
      return {
        note:
          (fight
            ? `${encounter.enemy!.name} defeated! Finisher −${finisher} · ${time}`
            : `${encounter.name} cleared in ${time}`) + got,
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
