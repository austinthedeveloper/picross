import { addGadget, completeEncounter, heal, withBoard } from '../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../game/runSave';
import { ENDLESS_HEAL } from '../../../puzzles/endless';
import { restHeal } from '../../../puzzles/runs';
import { getGadget } from '../../../puzzles/gadgets';
import { getScene } from '../../../puzzles/scenes';
import { el } from '../../dom';
import { formatTime } from '../../format';
import { renderGameScreen, type PlaySession } from '../gameScreen';
import { renderSceneScreen } from '../sceneScreen';
import { digHooks } from './dig';
import { fightHooks } from './fight/index';
import { restHooks } from './rest';
import { loadRun } from './shared';

/** Plays the current encounter at #/run/play. Returns the game screen's cleanup. */
export function renderRunEncounter(app: HTMLElement): (() => void) | undefined {
  const run = loadRun();
  if (!run || run.state.status !== 'active') {
    location.replace('#/run');
    return undefined;
  }
  const { def, state } = run;
  const encounter = def.encounters[state.node];
  const length = def.endless ? Infinity : def.encounters.length;

  const play = (): (() => void) => {
    const fight = encounter.enemy ? fightHooks(encounter.enemy, encounter.puzzle) : null;
    const session: PlaySession = {
      back: { href: '#/run', label: '← Map' },
      title: encounter.name,
      // In Hearts runs, fights check fills so the enemy can hit back. Digs never do.
      mode: fight && state.mode === 'hearts' ? 'battle' : 'relaxed',
      saved: state.board,
      ...(fight
        ? fight.hooks
        : encounter.rest
          ? restHooks(encounter.rest)
          : digHooks(encounter.puzzle)),
      save: (board) => {
        const current = getCurrentRun();
        if (current?.status === 'active') saveCurrentRun(withBoard(current, board));
      },
      complete(game) {
        const finisher = fight?.land();
        let next = completeEncounter(getCurrentRun() ?? state, length);
        const reward = encounter.puzzle.gadget ? getGadget(encounter.puzzle.gadget) : undefined;
        if (reward) next = addGadget(next, reward.id);
        // Endless (#68) gives a little HP back after each fight; a rest stop (#77)
        // heals more if you beat its clock.
        const before = next.hp;
        if (def.endless && fight) next = heal(next, ENDLESS_HEAL);
        if (encounter.rest) next = heal(next, restHeal(encounter.rest, game.elapsed));
        const healed = next.hp - before;
        saveCurrentRun(next);
        const last = next.status === 'won';
        const time = formatTime(game.elapsed);
        const got =
          (reward ? ` · You got ${reward.icon} ${reward.name}!` : '') +
          (healed ? ` · +${healed} HP` : '');
        return {
          note:
            (fight
              ? `${fight.name()} defeated! Finisher −${finisher} · ${time}`
              : encounter.rest
                ? `${restHeal(encounter.rest, game.elapsed) === encounter.rest.heal ? 'Rested' : 'Too slow for a full rest'} · ${time}`
                : `${encounter.name} cleared in ${time}`) +
            got +
            (encounter.rest && !healed ? ' · already at full HP' : ''),
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
