import type { RunState } from '../../../game/run';
import { saveCurrentRun } from '../../../game/runSave';
import { getGadget } from '../../../puzzles/gadgets';
import type { Job } from '../../../story/data';
import { gadgetArt } from '../../art';
import { homeLink } from '../../components/homeLink';
import { el } from '../../dom';
import { nodeIcon, nodeLabel, nodeSize, type Hub } from './shared';

export function hpBar(state: RunState): HTMLElement {
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

/** Held gadgets and what each does. They're used from the fight's gadget tray. */
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
              el('span', { className: 'gadget-icon', ariaHidden: 'true' }, [gadgetArt(g.id)]),
              el('span', {}, [el('strong', { textContent: g.name }), ` ${g.description}`]),
            ]),
          ),
        )
      : el('p', { className: 'run-meta', textContent: 'None yet. Digs turn finds into gadgets.' }),
  ]);
}

/** The path map for a run in progress: HP, gadgets, and the encounters. */
export function pathMap(hub: Hub, state: RunState, job: Job): Node[] {
  const nodes = job.encounters.map((encounter, i) => {
    const status = i < state.node ? 'cleared' : i === state.node ? 'current' : 'locked';
    const content = [
      el('span', { className: 'node-icon', ariaHidden: 'true' }, [nodeIcon(encounter)]),
      el('span', { className: 'node-text' }, [
        el('span', { className: 'node-name', textContent: encounter.name }),
        el('span', {
          className: 'node-kind',
          textContent: `${nodeLabel(encounter)} · ${nodeSize(encounter)}`,
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
        ? el('a', { className: 'node-body', href: '#/story/play', ariaLabel: label }, content)
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
      hub.rerender();
    },
  });

  return [
    el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: job.name })]),
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
