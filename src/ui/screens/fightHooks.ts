import {
  absorbHit,
  advancePhase,
  chip,
  clearFog,
  clearScramble,
  currentForm,
  finish,
  startBattle,
  useGadget,
  type BattleState,
  type Enemy,
} from '../../game/battle';
import { damage, removeGadget, withBattle, type RunState } from '../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../game/runSave';
import type { Puzzle } from '../../puzzles/format';
import { getGadget, type Gadget } from '../../puzzles/gadgets';
import type { BoardView } from '../board/boardView';
import { createPicture } from '../board/picture';
import { createBattleBar } from '../components/battleBar';
import { el } from '../dom';
import { lineName } from '../format';
import { pause, reducedMotion } from '../motion';
import { playSound } from '../sound';
import { keyToLine, lineCount, lineKey, type LineSet } from '../../engine/lines';
import { pickSwapRows } from '../../engine/swap';
import type { BoardControls, PlaySession } from './gameScreen';

/**
 * Fight rules on top of a run encounter (#27): completed lines chip the
 * enemy, the solved picture is the finisher, and in Hits-on runs each wrong
 * fill lets the enemy hit the player's run HP. Held gadgets (#28) can be
 * used from the battle bar. Bosses (#42) change form at HP thresholds. Every
 * change is saved to the run right away so a reload resumes the fight.
 */
export function fightHooks(enemy: Enemy, puzzle: Puzzle) {
  const current = (): RunState => getCurrentRun()!;
  const battle = () => current().battle ?? startBattle(enemy);
  const hitsOn = current().mode === 'hearts';

  const form = () => currentForm(enemy, battle());

  const bar = createBattleBar(enemy, battle().enemyHp);
  bar.setForm(form().name, form().sprite);
  bar.setPlayerHp(current().hp, current().maxHp);
  bar.setShield(battle().shield ?? 0);
  let finisher = 0;
  let finished = false;
  let defeatedAs = enemy.name;
  let view: BoardView | null = null;
  let controls: BoardControls | null = null;
  // Row swaps wait until no stroke is in progress, so a drag never paints into moved rows.
  let strokes = 0;
  let pendingSwaps = 0;

  /** The Mimic (#48): swaps two of your unfinished rows, then resyncs the screen. */
  const runSwaps = () => {
    if (strokes > 0 || !controls) return;
    for (; pendingSwaps > 0; pendingSwaps--) {
      const rows = pickSwapRows(controls.game.board, puzzle.solution);
      if (!rows) continue;
      controls.game.swapRows(...rows);
      controls.refresh();
      view?.flashSwap(...rows);
      playSound('phase');
      bar.say(`${form().name} swapped rows ${rows[0] + 1} and ${rows[1] + 1}! Undo can't help.`);
    }
  };

  /** Why a gadget can't be used right now, or null if it can. */
  const blocker = (gadget: Gadget): string | null => {
    if (finished || current()?.status !== 'active') return 'The fight is over';
    if (gadget.effect.kind === 'shield' && !hitsOn) return 'Nothing hits you in a Relaxed run';
    if (gadget.effect.kind === 'damage' && battle().enemyHp <= 1) {
      return 'Only the finished picture can defeat it now';
    }
    return null;
  };

  const renderGadgets = () => {
    const counts = new Map<string, number>();
    for (const id of current()?.gadgets ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    const buttons = [...counts].flatMap(([id, count]) => {
      const gadget = getGadget(id);
      if (!gadget) return [];
      const reason = blocker(gadget);
      const button = el('button', {
        className: 'gadget',
        disabled: Boolean(reason),
        title: reason ?? gadget.description,
        ariaLabel: `Use ${gadget.name}${count > 1 ? `, ${count} held` : ''}. ${reason ?? gadget.description}`,
        onclick: () => use(gadget),
      });
      button.append(
        el('span', { className: 'gadget-icon', textContent: gadget.icon, ariaHidden: 'true' }),
        `${gadget.name}${count > 1 ? ` ×${count}` : ''}`,
      );
      return [button];
    });
    bar.setGadgets(buttons);
  };

  /**
   * Starts any phases the enemy's HP has fallen into: new form, harder hits,
   * fog over lines not yet completed, and row swaps. Returns a message to announce.
   */
  const checkPhase = (state: BattleState): { state: BattleState; message: string } => {
    const { state: next, entered } = advancePhase(enemy, state);
    if (!entered.length) return { state, message: '' };
    const before = currentForm(enemy, state).name;
    const { name, sprite } = currentForm(enemy, next);
    if (entered.some((p) => p.swap)) {
      pendingSwaps += entered.filter((p) => p.swap).length;
      window.setTimeout(runSwaps, 0); // outside the redraw that triggered the phase
    }
    const taunt = entered
      .map((p) => p.taunt)
      .filter(Boolean)
      .join(' ');
    bar.setForm(name, sprite);
    bar.phaseBanner(name, taunt);
    if (next.fog) view?.setFog(next.fog);
    if (next.scramble) view?.setScramble(next.scramble);
    playSound('phase');
    const count = (set?: LineSet) => (set ? lineCount(set) : 0);
    const fogged = count(next.fog) - count(state.fog);
    const scrambled = count(next.scramble) - count(state.scramble);
    return {
      state: next,
      message: `${name !== before ? `${before} becomes ${name}! ` : ''}${taunt}${fogged > 0 ? ` ${fogged} lines go dark.` : ''}${scrambled > 0 ? ` ${scrambled} clues scramble.` : ''}`,
    };
  };

  const use = (gadget: Gadget) => {
    if (blocker(gadget)) return;
    const used = useGadget(battle(), gadget.effect);
    const { state, message } = checkPhase(used.state);
    const dealt = used.dealt;
    saveCurrentRun(withBattle(removeGadget(current(), gadget.id), state));
    if (gadget.effect.kind === 'damage') {
      bar.setEnemyHp(state.enemyHp);
      bar.hitEnemy(dealt);
      playSound('finisher');
      bar.say(
        `${gadget.name}! ${form().name} takes ${dealt} damage, ${state.enemyHp} HP left. ${message}`,
      );
    } else {
      bar.setShield(state.shield ?? 0);
      playSound('hint');
      bar.say(`${gadget.name} ready. It blocks the next hit.`);
    }
    renderGadgets();
  };

  renderGadgets();

  const hooks: Pick<
    PlaySession,
    'header' | 'onBoard' | 'onLinesComplete' | 'onMistake' | 'ended' | 'celebrate'
  > = {
    header: bar.root,

    onBoard(boardView, boardControls) {
      view = boardView;
      controls = boardControls;
      view.root.addEventListener('pointerdown', () => strokes++);
      const lift = () => {
        strokes = Math.max(0, strokes - 1);
        if (!strokes && pendingSwaps) window.setTimeout(runSwaps, 0);
      };
      view.root.addEventListener('pointerup', lift);
      view.root.addEventListener('pointercancel', lift);
      const { fog, scramble, armor } = battle();
      if (fog) view.setFog(fog);
      if (scramble) view.setScramble(scramble);
      if (armor) {
        view.setWeakPoints(armor);
        bar.setArmor(lineCount(armor));
      }
    },

    onLinesComplete(lines) {
      const messages: string[] = [];
      const fogged = clearFog(battle(), lines);
      const unscrambled = clearScramble(fogged.state, lines);
      const chipped = chip(
        unscrambled.state,
        lines.map((l) => lineKey(l.kind, l.index)),
      );
      const dealt = chipped.dealt;
      if (chipped.cracked.length || chipped.broke) {
        const armor = chipped.state.armor ?? { rows: [], cols: [] };
        view?.setWeakPoints(armor, chipped.cracked.map(keyToLine));
        bar.setArmor(lineCount(armor));
        if (chipped.broke) bar.armorBreaks();
      }
      const phased = checkPhase(chipped.state);
      const state = phased.state;
      if (fogged.revealed.length && state.fog) {
        view?.setFog(state.fog, fogged.revealed);
        const names = fogged.revealed.map((l) => lineName(l));
        messages.push(`You solved through the fog: ${names.join(', ')} revealed.`);
      }
      if (unscrambled.revealed.length && state.scramble) {
        view?.setScramble(state.scramble, unscrambled.revealed);
        const names = unscrambled.revealed.map((l) => lineName(l));
        messages.push(`Gears click back into place: ${names.join(', ')} in order.`);
      }
      if (state !== battle()) saveCurrentRun(withBattle(current(), state));
      if (dealt) {
        bar.setEnemyHp(state.enemyHp);
        bar.hitEnemy(dealt);
        playSound('strike');
        renderGadgets(); // a bomb can't help once the enemy is down to 1 HP
        messages.unshift(`${enemy.name} takes ${dealt} damage, ${state.enemyHp} HP left.`);
      }
      if (chipped.cracked.length) messages.push('Weak point! Triple damage.');
      if (chipped.broke) messages.push(`${form().name}'s armor breaks! Its hits soften.`);
      else if (!dealt && lines.length && form().armored) {
        messages.push('The armor shrugs it off. Find the 🎯 weak points.');
      }
      if (phased.message) messages.push(phased.message);
      return messages.join(' ') || undefined;
    },

    onMistake() {
      const shielded = absorbHit(battle());
      if (shielded.blocked) {
        saveCurrentRun(withBattle(current(), shielded.state));
        bar.setShield(shielded.state.shield ?? 0);
        bar.block();
        return `Wrong cell! ${form().name} attacks, but the patch kit blocks it.`;
      }
      const { name, attack } = form();
      const run = damage(current(), attack);
      saveCurrentRun(run);
      bar.setPlayerHp(run.hp, run.maxHp);
      bar.hitPlayer(attack);
      if (run.status === 'lost') renderGadgets();
      return run.status === 'lost'
        ? `${name} hits you for ${attack}. You're knocked out.`
        : `Wrong cell! ${name} hits you for ${attack}. ${run.hp} HP left.`;
    },

    ended() {
      if (current()?.status !== 'lost') return null;
      return {
        title: 'Knocked out',
        note: `${form().name} wins this round. The run is over.`,
        actions: [
          el('a', { className: 'button primary', href: '#/run', textContent: 'See results →' }),
        ],
      };
    },

    // The solved picture flies at the enemy and lands the finisher.
    async celebrate(board) {
      bar.setEnemyHp(0);
      const picture = createPicture(puzzle.solution, 6);
      picture.classList.add('projectile');
      document.body.append(picture);
      const from = board.getBoundingClientRect();
      const to = bar.sprite.getBoundingClientRect();
      const size = picture.getBoundingClientRect();
      const start = `translate(${from.left + from.width / 2 - size.width / 2}px, ${from.top + from.height / 2 - size.height / 2}px)`;
      const end = `translate(${to.left + to.width / 2 - size.width / 2}px, ${to.top + to.height / 2 - size.height / 2}px)`;
      if (!reducedMotion()) {
        await picture.animate(
          [
            { transform: `${start} scale(2)`, opacity: 1 },
            { transform: `${start} scale(2.3) rotate(-20deg)`, offset: 0.25 },
            { transform: `${end} scale(0.6) rotate(25deg)`, opacity: 1 },
          ],
          { duration: 650, easing: 'cubic-bezier(.5,0,.75,0)' },
        ).finished;
      }
      picture.remove();
      playSound('finisher');
      bar.hitEnemy(finisher);
      bar.defeat();
      await pause(600);
    },
  };

  return {
    hooks,
    /** The enemy's name when the finisher landed (after any phases), for the defeat note. */
    name: () => defeatedAs,
    /** Records the finisher; call from `complete` before the encounter is cleared. */
    land(): number {
      finished = true;
      defeatedAs = form().name; // before the encounter is cleared and the battle reset
      finisher = finish(battle()).dealt;
      renderGadgets();
      return finisher;
    },
  };
}
