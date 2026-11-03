import { addGadget, completeEncounter, startRun, withBoard, type RunState } from '../../game/run';
import { advance, currentStep, startDialogue } from '../../game/dialogue';
import {
  getCurrentRun,
  getJobStats,
  hasSeenScene,
  markSceneSeen,
  recordRunResult,
  saveCurrentRun,
} from '../../game/runSave';
import { getSettings, updateSettings, type Mode } from '../../game/settings';
import { getGadget } from '../../puzzles/gadgets';
import { getRun, runs, type Encounter, type RunDef } from '../../puzzles/runs';
import { getScene } from '../../puzzles/scenes';
import { el } from '../dom';
import { formatTime } from '../format';
import { digHooks } from './digHooks';
import { fightHooks } from './fightHooks';
import { renderGameScreen, type PlaySession } from './gameScreen';
import { renderSceneScreen } from './sceneScreen';

const KIND_ICON: Record<Encounter['kind'], string> = { fight: '⚔️', dig: '⛏️' };
const KIND_LABEL: Record<Encounter['kind'], string> = { fight: 'Fight', dig: 'Dig' };
const nodeIcon = (e: Encounter) => (e.boss ? '👑' : KIND_ICON[e.kind]);
const nodeLabel = (e: Encounter) => (e.boss ? 'Boss' : KIND_LABEL[e.kind]);

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

/** Cleanup for a scene playing on the run screen, so navigating away stops it. */
let stopScene: (() => void) | undefined;

/** Plays a run's intro scene full screen, then comes back to the run screen. */
function playIntro(app: HTMLElement, def: RunDef) {
  const scene = def.intro ? getScene(def.intro) : undefined;
  if (!scene) return renderRunScreen(app);
  stopScene = renderSceneScreen(app, scene, {
    onEnd: () => {
      stopScene = undefined;
      markSceneSeen(scene.id);
      renderRunScreen(app);
    },
  });
}

function newRunButton(app: HTMLElement, def: RunDef, label: string): HTMLButtonElement {
  return el('button', {
    className: 'button primary',
    textContent: label,
    onclick: () => {
      saveCurrentRun(startRun(def.id, def.hp, getSettings().mode, def.gadgets));
      // The intro plays automatically once; after that it's on the jobs board.
      if (def.intro && !hasSeenScene(def.intro)) playIntro(app, def);
      else renderRunScreen(app);
    },
  });
}

/** The run's sign-off for a win or a loss: the lines its outro scene plays for that flag. */
function signOff(def: RunDef, won: boolean): HTMLElement[] {
  const scene = def.outro ? getScene(def.outro) : undefined;
  if (!scene) return [];
  const lines: HTMLElement[] = [];
  let state = startDialogue(scene, { won });
  for (
    let step = currentStep(scene, state);
    step.kind === 'line';
    step = currentStep(scene, state)
  ) {
    lines.push(
      el('figure', { className: 'sign-off' }, [
        el('span', {
          className: 'sign-off-portrait',
          ariaHidden: 'true',
          textContent: step.speaker?.portrait ?? '',
        }),
        el('figcaption', {}, [
          ...(step.speaker ? [el('strong', { textContent: step.speaker.name })] : []),
          el('span', { textContent: step.text }),
        ]),
      ]),
    );
    state = advance(scene, state);
  }
  return lines;
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
 * The run hub at #/run: the jobs board when there's no run, the path map while
 * one is active, and a results screen once it's won or lost.
 */
export function renderRunScreen(app: HTMLElement): () => void {
  const run = loadRun();
  const body = !run
    ? jobsBoard(app)
    : run.state.status === 'active'
      ? pathMap(app, run.state, run.def)
      : results(app, run.state, run.def);
  app.replaceChildren(el('main', { className: 'screen run' }, body));
  return () => stopScene?.();
}

/** A job you can start: everything without `requires`, plus jobs whose requirement you've won. */
const unlocked = (def: RunDef) => !def.requires || (getJobStats(def.requires)?.wins ?? 0) > 0;

function bestResult(def: RunDef): string {
  const stats = getJobStats(def.id);
  if (!stats?.plays) return 'Not played yet';
  if (!stats.wins) return `${stats.plays} ${stats.plays === 1 ? 'try' : 'tries'}, not cleared yet`;
  return `Cleared ${stats.wins}× · best ${stats.bestHp}/${def.hp} HP left`;
}

/** The jobs board (#47): every job, its length and boss, your best result, and Start. */
function jobsBoard(app: HTMLElement): Node[] {
  const card = (def: RunDef) => {
    const open = unlocked(def);
    const boss = def.encounters.find((e) => e.boss);
    return el('section', { className: `run-card job${open ? '' : ' locked'}` }, [
      el('h2', { textContent: open ? def.name : `🔒 ${def.name}` }),
      ...(def.blurb ? [el('p', { className: 'job-blurb', textContent: def.blurb })] : []),
      el('p', {
        className: 'run-meta',
        textContent: `${def.encounters.length} encounters · ${def.hp} HP${boss ? ` · Boss: ${boss.name}` : ''}`,
      }),
      el(
        'ol',
        { className: 'run-preview' },
        def.encounters.map((e) => el('li', { textContent: `${nodeIcon(e)} ${e.name}` })),
      ),
      el('p', {
        className: `job-best${getJobStats(def.id)?.wins ? '' : ' none'}`,
        textContent: bestResult(def),
      }),
      open
        ? el('div', { className: 'end-actions' }, [
            newRunButton(app, def, 'Start'),
            ...(def.intro && hasSeenScene(def.intro)
              ? [
                  el('button', {
                    className: 'button ghost',
                    textContent: '▶ Watch the intro',
                    onclick: () => playIntro(app, def),
                  }),
                ]
              : []),
          ])
        : el('p', {
            className: 'run-meta',
            textContent: `Win ${getRun(def.requires!)?.name ?? def.requires} to unlock.`,
          }),
    ]);
  };
  return [
    el('header', { className: 'topbar' }, [backToPuzzles(), el('h1', { textContent: 'Jobs' })]),
    modePicker(app),
    el('div', { className: 'jobs' }, runs.map(card)),
  ];
}

function pathMap(app: HTMLElement, state: RunState, def: RunDef): Node[] {
  const nodes = def.encounters.map((encounter, i) => {
    const status = i < state.node ? 'cleared' : i === state.node ? 'current' : 'locked';
    const content = [
      el('span', {
        className: 'node-icon',
        ariaHidden: 'true',
        textContent: nodeIcon(encounter),
      }),
      el('span', { className: 'node-text' }, [
        el('span', { className: 'node-name', textContent: encounter.name }),
        el('span', {
          className: 'node-kind',
          textContent: `${nodeLabel(encounter)} · ${encounter.puzzle.width}×${encounter.puzzle.height}`,
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
    const label = `${encounter.name}, ${nodeLabel(encounter)}, ${status}`;
    const node =
      status === 'current'
        ? el('a', { className: 'node-body', href: '#/run/play', ariaLabel: label }, content)
        : el('div', { className: 'node-body', ariaLabel: label }, content);
    return el('li', { className: `node ${status}${encounter.boss ? ' boss' : ''}` }, [node]);
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

function results(app: HTMLElement, finished: RunState, def: RunDef): Node[] {
  const state = recordRunResult(finished);
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
      ...signOff(def, won),
      modePicker(app),
      el('div', { className: 'end-actions' }, [
        el('button', {
          className: 'button ghost',
          textContent: 'Jobs board',
          onclick: () => {
            saveCurrentRun(null);
            renderRunScreen(app);
          },
        }),
        newRunButton(app, def, 'Run it again'),
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

  const play = (): (() => void) => {
    const fight = encounter.enemy ? fightHooks(encounter.enemy, encounter.puzzle) : null;
    const session: PlaySession = {
      back: { href: '#/run', label: '← Map' },
      title: encounter.name,
      // In Hearts runs, fights check fills so the enemy can hit back. Digs never do.
      mode: fight && state.mode === 'hearts' ? 'battle' : 'relaxed',
      saved: state.board,
      ...(fight ? fight.hooks : digHooks(encounter.puzzle)),
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
              ? `${fight.name()} defeated! Finisher −${finisher} · ${time}`
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
  };

  // An encounter's scene (e.g. the boss's entrance) plays when you first open it,
  // before any progress is saved; resuming mid-fight skips it.
  const scene = encounter.scene ? getScene(encounter.scene) : undefined;
  if (!scene || state.board || state.battle) return play();
  let stop = renderSceneScreen(app, scene, { onEnd: () => (stop = play()) });
  return () => stop();
}

/** One line for the puzzle list: start or continue a run. */
export function runBanner(): HTMLElement {
  const run = loadRun();
  const active = run?.state.status === 'active';
  const open = runs.filter(unlocked).length;
  return el('a', { className: 'run-banner', href: '#/run' }, [
    el('span', {
      className: 'run-banner-title',
      textContent: active ? 'Continue run' : 'Pick a job',
    }),
    el('span', {
      className: 'run-banner-meta',
      textContent: active
        ? `${run!.def.name} · encounter ${run!.state.node + 1} of ${run!.def.encounters.length} · HP ${run!.state.hp}/${run!.state.maxHp}`
        : `${open} of ${runs.length} jobs open`,
    }),
    el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
  ]);
}
