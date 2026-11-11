import { startRun, type RunState } from '../../../game/run';
import { getCurrentRun, getJobStats, hasSeenScene, saveCurrentRun } from '../../../game/runSave';
import { getSettings, updateSettings, type Mode } from '../../../game/settings';
import { dimsLabel } from '../../../engine/volume';
import { getJob, type Encounter, type Job } from '../../../story/data';
import { iconArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';

/** What the story screens share: where to draw, how to redraw, how to play a scene. */
export interface Hub {
  app: HTMLElement;
  rerender(): void;
  /** Plays a scene full screen, marks it seen, then comes back. */
  playScene(id: string): void;
}

const KIND_LABEL: Record<Encounter['kind'], string> = {
  fight: 'Fight',
  dig: 'Dig',
  rest: 'Rest stop',
};

export const nodeIcon = (e: Encounter) => iconArt(e.boss ? 'boss' : e.kind);
export const nodeLabel = (e: Encounter) => (e.boss ? 'Boss' : KIND_LABEL[e.kind]);
export const nodeSize = (e: Encounter) => dimsLabel(e.puzzle.dims);

/** A job you can start: no requirement, or its requirement won. */
export const unlocked = (job: Job) => !job.requires || (getJobStats(job.requires)?.wins ?? 0) > 0;
export const cleared = (job: Job) => (getJobStats(job.id)?.wins ?? 0) > 0;

/** The saved run with its job, or null. */
export function loadRun(): { state: RunState; job: Job } | null {
  const state = getCurrentRun();
  const job = state && getJob(state.runId);
  return state && job ? { state, job } : null;
}

export function newRunButton(hub: Hub, job: Job, label: string): HTMLButtonElement {
  return el('button', {
    className: 'button primary',
    textContent: label,
    onclick: () => {
      // Overtime always plays with Hits on, like the 2D game.
      const mode: Mode = job.overtimeOf ? 'hearts' : getSettings().mode;
      saveCurrentRun(startRun(job.id, job.hp, mode, job.gadgets));
      // The intro plays automatically once; after that it's on the jobs board.
      if (job.intro && !hasSeenScene(job.intro)) hub.playScene(job.intro);
      else hub.rerender();
    },
  });
}

const MODE_NOTES: Record<Mode, string> = {
  relaxed: 'Enemies can’t hurt you. Lines and the finished shape still deal damage.',
  hearts: 'Breaking a cube of the shape lets the enemy hit you. Run out of HP and the run is over.',
};

/** Relaxed vs. Hits on for the next run (shares the puzzle list's mode). */
export function modePicker(hub: Hub): HTMLElement {
  const mode = getSettings().mode;
  const option = (value: Mode, label: string) => {
    const button = el('button', {
      className: 'toggle',
      textContent: label,
      onclick: () => {
        updateSettings({ mode: value });
        hub.rerender();
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
