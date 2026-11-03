import { advance, currentStep, startDialogue } from '../../../game/dialogue';
import type { RunState } from '../../../game/run';
import { recordRunResult, saveCurrentRun } from '../../../game/runSave';
import type { RunDef } from '../../../puzzles/runs';
import { getScene } from '../../../puzzles/scenes';
import { el } from '../../dom';
import { backToPuzzles, modePicker, newRunButton, type Hub } from './shared';

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

/** A finished run: records it once, then shows the outcome, the sign-off, and what's next. */
export function results(hub: Hub, finished: RunState, def: RunDef): Node[] {
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
      modePicker(hub),
      el('div', { className: 'end-actions' }, [
        el('button', {
          className: 'button ghost',
          textContent: 'Jobs board',
          onclick: () => {
            saveCurrentRun(null);
            hub.rerender();
          },
        }),
        newRunButton(hub, def, 'Run it again'),
      ]),
    ]),
  ];
}
