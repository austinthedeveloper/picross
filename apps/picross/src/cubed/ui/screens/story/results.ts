import { advance, currentStep, startDialogue } from '@picross/story/game/dialogue';
import type { RunState } from '../../../game/run';
import { recordRunResult, saveCurrentRun } from '../../../game/runSave';
import { getScene } from '@picross/story/puzzles/scenes';
import type { Job } from '@picross/block/story/data';
import { portraitArt, withArt } from '@picross/shared/ui/art';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { modePicker, newRunButton, type Hub } from './shared';

/** The job's sign-off for a win or a loss: the lines its outro plays for that flag. */
function signOff(job: Job, won: boolean): HTMLElement[] {
  const scene = job.outro ? getScene(job.outro) : undefined;
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
        el(
          'span',
          { className: 'sign-off-portrait', ariaHidden: 'true' },
          step.speaker ? [portraitArt(step.speaker.portrait)] : [],
        ),
        el('figcaption', {}, [
          ...(step.speaker ? [el('strong', { textContent: step.speaker.name })] : []),
          el('span', {}, withArt(step.text)),
        ]),
      ]),
    );
    state = advance(scene, state);
  }
  return lines;
}

/** A finished run: records it once, then the outcome, the sign-off, and what's next. */
export function results(hub: Hub, finished: RunState, job: Job): Node[] {
  const state = recordRunResult(finished);
  const won = state.status === 'won';
  const cleared = Math.min(state.node, job.encounters.length);
  return [
    el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: job.name })]),
    el('section', { className: `run-card results ${won ? 'won' : 'lost'}` }, [
      el('h2', { textContent: won ? 'Job done!' : 'Run over' }),
      el('p', {
        className: 'run-meta',
        textContent: `${cleared}/${job.encounters.length} encounters cleared · ${state.hp}/${state.maxHp} HP left`,
      }),
      ...signOff(job, won),
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
        newRunButton(hub, job, 'Run it again'),
      ]),
    ]),
  ];
}
