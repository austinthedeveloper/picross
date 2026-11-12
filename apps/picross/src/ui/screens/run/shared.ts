import { startRun, type RunState } from '../../../game/run';
import { getCurrentRun, getJobStats, hasSeenScene, saveCurrentRun } from '../../../game/runSave';
import { getSettings, updateSettings, type Mode } from '../../../game/settings';
import { endlessBoardOf, endlessRun, endlessSetup } from '../../../puzzles/endless';
import { getRun, runs, type Encounter, type RunDef } from '../../../puzzles/runs';
import { iconArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';

/** What the run screens share: where to draw, how to redraw, and how to play a scene. */
export interface Hub {
  app: HTMLElement;
  rerender(): void;
  /** Plays a scene full screen, marks it seen, then comes back to the hub. */
  playScene(id: string): void;
}

const KIND_LABEL: Record<Encounter['kind'], string> = {
  fight: 'Fight',
  dig: 'Dig',
  rest: 'Rest stop',
};
export const nodeIcon = (e: Encounter) => iconArt(e.boss ? 'boss' : e.kind);
export const nodeLabel = (e: Encounter) => (e.boss ? 'Boss' : KIND_LABEL[e.kind]);

/** The saved run with its definition, or null if there's none (or its run was removed). */
export function loadRun(): { state: RunState; def: RunDef } | null {
  const state = getCurrentRun();
  const def = state && (state.endless ? endlessRun(state) : getRun(state.runId));
  return state && def ? { state, def } : null;
}

export function newRunButton(hub: Hub, def: RunDef, label: string): HTMLButtonElement {
  return el('button', {
    className: 'button primary',
    textContent: label,
    onclick: () => {
      // Overtime always plays with Hits on (#113).
      const mode = def.overtimeOf ? 'hearts' : getSettings().mode;
      const run = startRun(def.id, def.hp, mode, def.gadgets);
      if (def.endless) {
        // Endless draws from every job you've played, in an order set by a fresh seed.
        const played = runs.filter((j) => (getJobStats(j.id)?.plays ?? 0) > 0);
        run.endless = endlessSetup(
          played,
          Math.floor(Math.random() * 2 ** 31),
          endlessBoardOf(def.id),
        );
      }
      saveCurrentRun(run);
      // The intro plays automatically once; after that it's on the jobs board.
      if (def.intro && !hasSeenScene(def.intro)) hub.playScene(def.intro);
      else hub.rerender();
    },
  });
}

const MODE_NOTES: Record<Mode, string> = {
  relaxed: 'Enemies can’t hurt you. Lines and the finished picture still deal damage.',
  hearts: 'Each wrong fill lets the enemy hit you. Run out of HP and the run is over.',
};

/** Relaxed vs. hits-on choice for the next run (shares the puzzle list's mode setting). */
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
