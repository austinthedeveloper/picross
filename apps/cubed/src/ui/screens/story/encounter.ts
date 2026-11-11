import type { Game, GameMode } from '../../../game/game';
import {
  addGadget,
  addToTally,
  completeEncounter,
  heal,
  withBoard,
  type RunState,
} from '../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../game/runSave';
import { getGadget } from '@picross/shared/puzzles/gadgets';
import { getScene } from '@picross/shared/puzzles/scenes';
import { restHeal, type Encounter } from '../../../story/data';
import { shapePicture } from '../../board/thumbnail';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '../../format';
import { onHide } from '../../lifecycle';
import { createPlay, type Play, type PlayHooks } from '../play';
import { renderSceneScreen } from '@picross/shared/ui/screens/sceneScreen';
import { digKind } from './dig';
import { fightKind } from './fight';
import { restKind } from './rest';
import { loadRun } from './shared';

/** What an encounter's kind (fight, dig, rest) adds to the play screen. */
export interface Kind {
  mode: GameMode;
  /** Shown above the block (the battle bar, the dig sign, the rest clock). */
  header: HTMLElement;
  hooks?: Omit<PlayHooks, 'solved' | 'failed'>;
  /** Once the play screen exists. */
  attach?(play: Play): void;
  /** The solved panel's first line. */
  note(game: Game): string;
  /** Called when solved, before the encounter is cleared (the finisher). */
  land?(): void;
  /** Kept with the run, so a reload resumes the fight. */
  save?(): unknown;
  /** The panel when the run is lost mid-encounter, if it can be. */
  knockedOut?(): Node[];
  dispose?(): void;
}

/** The current encounter at #/story/play. Returns a cleanup. */
export function renderEncounter(app: HTMLElement): (() => void) | undefined {
  const run = loadRun();
  if (!run || run.state.status !== 'active') {
    location.replace('#/story');
    return undefined;
  }
  const { job, state } = run;
  const encounter = job.encounters[state.node];

  const play = (): (() => void) => {
    const kind: Kind =
      encounter.kind === 'fight'
        ? fightKind(encounter, state)
        : encounter.kind === 'rest'
          ? restKind(encounter.rest!)
          : digKind(encounter);
    const back = el('a', { className: 'button ghost', href: '#/story', textContent: '← Map' });
    const p: Play = createPlay(app, {
      puzzle: encounter.puzzle,
      title: encounter.name,
      mode: kind.mode,
      saved: state.board,
      back,
      hooks: {
        ...kind.hooks,
        solved: () => {
          kind.land?.();
          return complete(p.game);
        },
        failed: () => kind.knockedOut?.() ?? null,
      },
    });
    p.coach.dataset.owned = encounter.kind;
    p.coach.hidden = false;
    p.coach.replaceChildren(kind.header);
    kind.attach?.(p);

    function complete(game: Game): Node[] {
      const current = getCurrentRun() ?? state;
      let next: RunState = addToTally(completeEncounter(current, job.encounters.length), {
        hintsUsed: game.hintsUsed,
        mistakes: game.strikes,
      });
      const reward = encounter.gadget ? getGadget(encounter.gadget) : undefined;
      if (reward) next = addGadget(next, reward.id);
      const before = next.hp;
      if (encounter.rest) next = heal(next, restHeal(encounter.rest, game.elapsed));
      const healed = next.hp - before;
      saveCurrentRun(next);
      const got =
        (reward ? ` · You got ${reward.icon} ${reward.name}!` : '') +
        (healed ? ` · +${healed} HP` : encounter.rest ? ' · already at full HP' : '');
      return [
        el('h2', { textContent: encounter.boss ? 'Boss down!' : 'Cleared!' }),
        shapePicture(encounter.puzzle, 110),
        el('p', { className: 'end-name', textContent: encounter.puzzle.name }),
        el('p', { className: 'end-note', textContent: kind.note(game) + got }),
        el('div', { className: 'end-actions' }, [
          el('a', {
            className: 'button primary',
            href: '#/story',
            textContent: next.status === 'won' ? 'See results →' : 'Back to map →',
          }),
        ]),
      ];
    }

    const persist = (elapsed: number) => {
      const { game } = p;
      const current = getCurrentRun();
      // Save the board to come back to, unless it's over (cleared, or the run was lost).
      if (game.over || current?.status !== 'active' || current.node !== state.node) return;
      game.elapsed = elapsed;
      let next = withBoard(current, game.save());
      const battle = kind.save?.();
      if (battle) next = { ...next, battle };
      saveCurrentRun(next);
    };
    onHide(() => persist(p.clock.elapsed));
    return () => {
      const elapsed = p.cleanup();
      kind.dispose?.();
      persist(elapsed);
    };
  };

  // An encounter's scene (a boss's entrance) plays when you first open it.
  const scene = encounter.scene ? getScene(encounter.scene) : undefined;
  if (!scene || state.board || state.battle) return play();
  let stop = renderSceneScreen(app, scene, { onEnd: () => (stop = play()) });
  return () => stop();
}

/** The time a puzzle took, for notes. */
export const took = (game: Game) => formatTime(game.elapsed);
export type { Encounter };
