import { saveCurrentRun } from '../../../game/runSave';
import type { RunState } from '../../../game/run';
import { getGadget } from '@picross/story/puzzles/gadgets';
import type { RunDef } from '../../../puzzles/runs';
import { gadgetArt } from '@picross/shared/ui/art';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { nodeIcon, nodeLabel, type Hub } from './shared';

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

/** How many cleared encounters an endless map keeps in view. */
const ENDLESS_TRAIL = 2;

/** The path map for a run in progress: HP, gadgets, and the encounters. */
export function pathMap(hub: Hub, state: RunState, def: RunDef): Node[] {
  // An endless run (#68) shows the last few you cleared and the next few ahead.
  const from = def.endless ? Math.max(0, state.node - ENDLESS_TRAIL) : 0;
  const nodes = def.encounters.slice(from).map((encounter, n) => {
    const i = from + n;
    const status = i < state.node ? 'cleared' : i === state.node ? 'current' : 'locked';
    const content = [
      el('span', { className: 'node-icon', ariaHidden: 'true' }, [nodeIcon(encounter)]),
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
      hub.rerender();
    },
  });

  return [
    el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: def.name })]),
    el('div', { className: 'run-status' }, [
      hpBar(state),
      el('span', {
        className: 'run-mode-label',
        textContent: state.mode === 'hearts' ? '♥ Hits on' : 'Relaxed',
      }),
      ...(def.endless
        ? [el('span', { className: 'run-depth', textContent: `Depth ${state.node + 1}` })]
        : []),
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
              el('span', { className: 'gadget-icon', ariaHidden: 'true' }, [gadgetArt(g.id)]),
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
