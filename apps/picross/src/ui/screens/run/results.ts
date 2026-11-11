import { earnFromRun, type NewBadge } from '../../../game/badges';
import { advance, currentStep, startDialogue } from '@picross/story/game/dialogue';
import type { RunState } from '../../../game/run';
import { getJobStats, recordRunResult, saveCurrentRun } from '../../../game/runSave';
import type { RunDef } from '../../../puzzles/runs';
import { getScene } from '@picross/story/puzzles/scenes';
import { portraitArt, withArt } from '@picross/shared/ui/art';
import { earnedBadges } from '../../components/badge';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { modePicker, newRunButton, type Hub } from './shared';

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

/**
 * Badges from the run just recorded. Kept while this page lives, so changing the
 * mode here redraws them, but a reload doesn't show them again (#108).
 */
let fresh: NewBadge[] = [];

/** A finished run: records it once, then shows the outcome, the sign-off, and what's next. */
export function results(hub: Hub, finished: RunState, def: RunDef): Node[] {
  const bestBefore = getJobStats(def.id)?.bestDepth ?? 0;
  const state = recordRunResult(finished);
  if (!finished.recorded) fresh = earnFromRun(state);
  const won = state.status === 'won';
  const cleared = Math.min(state.node, def.encounters.length);
  const best = getJobStats(def.id)?.bestDepth ?? 0;
  // Only the first look counts: on a reload the run is already in the best.
  const newBest = !finished.recorded && state.node > bestBefore;
  const summary = def.endless
    ? `Depth ${state.node} · best ${best}${newBest ? ' · new best!' : ''}`
    : `${cleared}/${def.encounters.length} encounters cleared · ${state.hp}/${state.maxHp} HP left`;
  return [
    el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: def.name })]),
    el('section', { className: `run-card results ${won ? 'won' : 'lost'}` }, [
      el('h2', { textContent: won ? 'Job done!' : 'Run over' }),
      el('p', { className: 'run-meta', textContent: summary }),
      ...earnedBadges(fresh),
      ...signOff(def, won),
      modePicker(hub),
      el('div', { className: 'end-actions' }, [
        el('button', {
          className: 'button ghost',
          textContent: 'Jobs board',
          onclick: () => {
            fresh = [];
            saveCurrentRun(null);
            hub.rerender();
          },
        }),
        newRunButton(hub, def, 'Run it again'),
      ]),
    ]),
  ];
}
