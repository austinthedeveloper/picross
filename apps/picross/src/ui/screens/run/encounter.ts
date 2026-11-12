import { badgeNote } from '../../../game/badges';
import { boardAt, switchesBoard } from '@picross/story/fight/switch';
import { earnFromFight } from '../../../game/fightBadges';
import { addGadget, addToTally, completeEncounter, heal, withBoard } from '../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../game/runSave';
import { ENDLESS_HEAL } from '../../../puzzles/endless';
import { restHeal } from '../../../puzzles/runs';
import { getGadget } from '@picross/story/puzzles/gadgets';
import { getScene } from '@picross/story/puzzles/scenes';
import { createBattleBar } from '@picross/story/ui/components/battleBar';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '@picross/shared/ui/format';
import { renderGameScreen, type PlaySession } from '@picross/play-grid/ui/screens/gameScreen';
import { renderSceneScreen } from '@picross/story/ui/screens/sceneScreen';
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

  // A boss that switches board (docs/story-combined.md) fights on the 3D game's block for
  // some phases. Endless runs build their own encounters, so they stay flat.
  const switching = Boolean(encounter.enemy && switchesBoard(encounter.enemy) && !def.endless);
  // Its one battle bar, with the gadget tray, stays on screen from board to board (#171):
  // each board's fight drives it while it's up.
  const bar = switching
    ? createBattleBar(
        encounter.enemy!,
        (getCurrentRun() ?? state).battle?.enemyHp ?? encounter.enemy!.hp,
      )
    : undefined;

  /** Clears the encounter: rewards, badges, healing and the note for the solved panel. */
  function clear(game: { hintsUsed: number; elapsed: number }, fightNote?: string) {
    // The fight's counts travel with it from board to board (#170), so the flat battle has
    // them all, wherever the fight ended.
    const current = getCurrentRun() ?? state;
    // Fight badges read the battle, which clearing the encounter throws away (#110).
    const badges = encounter.enemy ? earnFromFight(current, encounter.id, encounter.enemy) : [];
    let next = addToTally(
      completeEncounter(current, length),
      current.battle?.counts,
      game.hintsUsed,
    );
    const reward = encounter.puzzle.gadget ? getGadget(encounter.puzzle.gadget) : undefined;
    if (reward) next = addGadget(next, reward.id);
    // Endless (#68) gives a little HP back after each fight; a rest stop (#77)
    // heals more if you beat its clock.
    const before = next.hp;
    if (def.endless && encounter.enemy) next = heal(next, ENDLESS_HEAL);
    if (encounter.rest) next = heal(next, restHeal(encounter.rest, game.elapsed));
    const healed = next.hp - before;
    saveCurrentRun(next);
    const time = formatTime(game.elapsed);
    const got =
      (reward ? ` · You got ${reward.icon} ${reward.name}!` : '') +
      (healed ? ` · +${healed} HP` : '') +
      (badges.length ? ` · ${badgeNote(badges)}` : '');
    const note =
      (fightNote ??
        (encounter.rest
          ? `${restHeal(encounter.rest, game.elapsed) === encounter.rest.heal ? 'Rested' : 'Too slow for a full rest'} · ${time}`
          : `${encounter.name} cleared in ${time}`)) +
      got +
      (encounter.rest && !healed ? ' · already at full HP' : '');
    return { note, last: next.status === 'won' };
  }

  /** The flat board; `canSwitch` false keeps it flat whatever its phases say. */
  const playFlat = (canSwitch = switching): (() => void) => {
    const fight = encounter.enemy
      ? fightHooks(encounter.enemy, encounter.puzzle, canSwitch ? switchBoard : undefined, bar)
      : null;
    const session: PlaySession = {
      back: { href: '#/run', label: '← Map' },
      title: encounter.name,
      // In Hearts runs, fights check fills so the enemy can hit back. Digs never do.
      mode: fight && state.mode === 'hearts' ? 'battle' : 'relaxed',
      saved: (getCurrentRun() ?? state).board,
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
        const { note, last } = clear(
          game,
          fight
            ? `${fight.name()} defeated! Finisher −${finisher} · ${formatTime(game.elapsed)}`
            : undefined,
        );
        return {
          note,
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
    // A fight's board may have turned (#83), and its saved marks turned with it.
    return renderGameScreen(app, fight?.puzzle ?? encounter.puzzle, session);
  };

  const playBlock = (): (() => void) => {
    let stopped = false;
    let stopBlock: (() => void) | null = null;
    // While the block loads (three.js and all), the bar holds the screen.
    if (bar) app.replaceChildren(el('main', { className: 'screen run-switching' }, [bar.root]));
    void import('./blockFight').then(({ renderBlockFight }) => {
      if (stopped) return;
      stopBlock =
        renderBlockFight(app, {
          encounterId: encounter.id,
          title: encounter.name,
          enemy: encounter.enemy!,
          size: encounter.puzzle.width,
          onFlat: switchBoard,
          bar,
          onBlock: encounter.onBlock,
          clear,
        }) ?? playFlat(false);
    });
    return () => {
      stopped = true;
      stopBlock?.();
    };
  };

  const play = (): (() => void) => {
    const phase = (getCurrentRun() ?? state).battle?.phase;
    // An Endless fight on a block (#158) is on it the whole way.
    if (encounter.onBlock) return playBlock();
    return switching && boardAt(encounter.enemy!, phase) === 'block' ? playBlock() : playFlat();
  };

  let stop: () => void = () => {};
  let left = false;
  /** Moves the fight to the board its phase says, with the new board unfolding in. */
  function switchBoard() {
    // A switch waits out the phase banner; by then you may have gone back to the map.
    if (left) return;
    stop();
    app.classList.add('board-switch');
    window.setTimeout(() => app.classList.remove('board-switch'), 600);
    stop = play();
  }

  // An encounter's scene (e.g. the boss's entrance) plays when you first open it,
  // before any progress is saved; resuming mid-fight skips it.
  const scene = encounter.scene ? getScene(encounter.scene) : undefined;
  stop =
    !scene || state.board || state.battle || state.block
      ? play()
      : renderSceneScreen(app, scene, { onEnd: () => (stop = play()) });
  return () => {
    left = true;
    stop();
  };
}
