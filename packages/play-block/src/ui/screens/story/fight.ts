import {
  Battle,
  ARMOR_HIT_LINES,
  type BattleEvent,
  type BattleState,
} from '@picross/block/game/battle';
import { PAINTED, type Mode } from '@picross/block/game/game';
import { getGadget } from '@picross/story/puzzles/gadgets';
import { hashString } from '@picross/block/puzzles/hide';
import { lineIdAt, pointOf } from '@picross/block/engine/volume';
import type { Encounter } from '@picross/block/story/data';
import { POWERS } from '@picross/block/story/powers';
import { enemyArt, gadgetArt, withArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { haptic } from '@picross/shared/ui/haptics';
import { pause } from '@picross/shared/ui/motion';
import { playSound } from '@picross/shared/ui/sound';
import type { Play } from '../play';
import type { Kind } from './kind';
import { took } from './kind';

function meter(label: string, className: string) {
  const text = el('span', { className: 'meter-text' });
  const root = el('div', { className: `meter ${className}`, role: 'meter', ariaLabel: label }, [
    text,
    el('span', { className: 'meter-track' }, [el('span', { className: 'meter-fill' })]),
  ]);
  root.setAttribute('aria-valuemin', '0');
  return {
    root,
    set(value: number, max: number) {
      text.textContent = `${value}/${max}`;
      root.style.setProperty('--value', String(max ? value / max : 0));
      root.setAttribute('aria-valuemax', String(max));
      root.setAttribute('aria-valuenow', String(value));
    },
  };
}

function floatNumber(host: HTMLElement, text: string, className: string) {
  const n = el('span', {
    className: `float-number ${className}`,
    textContent: text,
    ariaHidden: 'true',
  });
  host.append(n);
  window.setTimeout(() => n.remove(), 900);
}

/**
 * What a fight needs from the run it's in: your HP, gadgets and seen tips. Cubed passes its
 * story run; the 2D story passes its own when a boss turns into a block there.
 */
export interface FightRun {
  /** Your HP and gadgets, or null once the run isn't active. */
  get(): { hp: number; maxHp: number; gadgets: string[] } | null;
  /** Takes HP; returns true if that knocked you out. */
  hurt(amount: number): boolean;
  /** Uses up the gadget at `index` in `get().gadgets`. */
  spendGadget(index: number, id: string): void;
  tipSeen(power: string): boolean;
  markTip(power: string): void;
}

export interface FightOptions {
  /** The run the fight is in. */
  run: FightRun;
  /** A battle already set up, instead of a new one. */
  battle?: Battle;
  /** Enemy HP carried over from the other board: phases it has fallen into start here. */
  carry?: number;
  /** Where the knocked-out panel leads. Default: Cubed's story map. */
  home?: string;
  /** After each update that started a phase: a boss can change board here. */
  phased?(battle: Battle): void;
}

/**
 * A fight on a block (docs/cubed/story.md): finishing lines chips the enemy, the solved shape
 * finishes it, and its powers fight back. With Hits on, breaking a cube of the shape lets
 * it hit you; in Relaxed nothing can hurt you.
 */
export function fightKind(
  encounter: Encounter,
  /** The run's mode, and the fight's saved state (so a reload resumes it). */
  state: { mode: Mode; battle?: unknown },
  opts: FightOptions,
): Kind {
  const enemy = encounter.enemy!;
  const hitsOn = state.mode === 'hearts';
  const link = opts.run;
  const battle =
    opts.battle ??
    new Battle(enemy, encounter.puzzle, hitsOn, state.battle as BattleState | undefined, {
      seed: hashString(encounter.id),
    });
  let play: Play;
  let knockedOut = false;
  let callingOut = false;
  let lastSwapped: number[] = [];
  let finisherDealt = 0;

  // --- The bar -------------------------------------------------------------------------
  const sprite = el('span', { className: 'enemy-sprite', ariaHidden: 'true' }, [
    enemyArt(enemy.sprite),
  ]);
  const enemyHp = meter(`${enemy.name} HP`, 'enemy-hp');
  const playerHp = meter('Your HP', 'player-hp');
  const name = el('span', { className: 'battle-name' });
  const armor = el('span', { className: 'armor', hidden: true });
  const fakes = el('span', { className: 'fakes', hidden: true });
  const info = el('button', { className: 'powers-info', textContent: 'ⓘ', title: 'Powers' });
  info.ariaLabel = 'Enemy powers';
  const chargeLabel = el('span', { className: 'charge-label' });
  const charge = el('span', { className: 'charge', hidden: true }, [
    el('span', { className: 'charge-icon' }, withArt('⚡')),
    el('span', { className: 'charge-track' }, [el('span', { className: 'charge-fill' })]),
    chargeLabel,
  ]);
  const turnLabel = el('span', { className: 'charge-label' });
  const turn = el('span', { className: 'turn-meter', hidden: true }, [
    el('span', { className: 'charge-icon' }, withArt('🔃')),
    el('span', { className: 'charge-track' }, [el('span', { className: 'charge-fill' })]),
    turnLabel,
  ]);
  const shield = el('span', { className: 'shield', hidden: true, textContent: '🩹' });
  const tray = el('div', { className: 'gadget-tray', role: 'group', ariaLabel: 'Gadgets' });
  const callOut = el(
    'button',
    { className: 'button call-out', hidden: true },
    withArt('🔍 Call out'),
  );
  const tipSlot = el('div', { className: 'tip-slot', hidden: true });
  const banner = el('div', { className: 'phase-banner', hidden: true, ariaHidden: 'true' });
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const enemySide = el('div', { className: 'battle-side enemy' }, [
    sprite,
    el('div', { className: 'battle-info' }, [
      el('span', { className: 'battle-name-row' }, [name, armor, fakes, info]),
      enemyHp.root,
      charge,
      turn,
    ]),
  ]);
  const header = el('section', { className: 'battle', ariaLabel: 'Fight' }, [
    el('div', { className: 'battle-row' }, [
      enemySide,
      el('div', { className: 'battle-side player' }, [
        el('div', { className: 'battle-info' }, [
          el('span', { className: 'battle-name' }, [shield, 'You']),
          playerHp.root,
        ]),
      ]),
    ]),
    tipSlot,
    el('div', { className: 'fight-actions' }, [tray, callOut]),
    banner,
    live,
  ]);

  const say = (text: string) => (live.textContent = text);

  function render() {
    const s = battle.state;
    const now = battle.current;
    name.textContent = now.name;
    sprite.replaceChildren(enemyArt(now.sprite));
    enemyHp.set(s.enemyHp, s.maxHp);
    const run = link.get();
    if (run) playerHp.set(run.hp, run.maxHp);
    armor.hidden = !s.targets.length;
    armor.replaceChildren(...withArt(`🛡 ${s.targets.length}🎯 ${s.armorLines}/${ARMOR_HIT_LINES}`));
    armor.title = `Armored: ${s.targets.length} target lines left`;
    fakes.hidden = !s.fakes.length;
    fakes.replaceChildren(...withArt(`🎭 ${s.fakes.length}`));
    callOut.hidden = !s.suspects.length || play?.game.over;
    callOut.setAttribute('aria-pressed', String(callingOut));
    const c = s.charge;
    charge.hidden = !c;
    if (c) {
      charge.style.setProperty('--level', String(c.warmUp ? 0 : c.meter / c.every));
      chargeLabel.textContent = c.warmUp ? `warming up · ${c.warmUp}` : `${c.meter}/${c.every}`;
    }
    const t = s.turn;
    turn.hidden = !t;
    if (t) {
      turn.style.setProperty('--level', String(t.meter / t.every));
      turnLabel.textContent = `${t.meter}/${t.every}`;
    }
    shield.hidden = !s.shield;
    renderTray();
  }

  function renderTray() {
    tray.replaceChildren(
      ...(link.get()?.gadgets ?? []).flatMap((id, i) => {
        const g = getGadget(id);
        if (!g) return [];
        const b = el('button', { className: 'gadget', title: `${g.name}: ${g.description}` }, [
          el('span', { className: 'gadget-icon', ariaHidden: 'true' }, [gadgetArt(g.id)]),
          g.name,
        ]);
        b.disabled = play?.game.over || knockedOut;
        b.onclick = () => useGadget(id, i);
        return [b];
      }),
    );
  }

  // --- Tips ----------------------------------------------------------------------------
  function tipCard(power: string, onDone: () => void) {
    const p = POWERS[power];
    return el('div', { className: 'tip-card' }, [
      el('span', { className: 'tip-icon', ariaHidden: 'true' }, withArt(p.icon)),
      el('span', { className: 'tip-text' }, [el('strong', { textContent: p.name }), ` ${p.tip}`]),
      el('button', { className: 'button tip-ok', textContent: 'Got it', onclick: onDone }),
    ]);
  }
  function nextTip() {
    const power = battle.powers.find((p) => POWERS[p] && !link.tipSeen(p));
    if (!power) {
      tipSlot.hidden = true;
      return;
    }
    tipSlot.hidden = false;
    tipSlot.replaceChildren(
      tipCard(power, () => {
        link.markTip(power);
        nextTip();
      }),
    );
  }
  info.onclick = () => {
    if (!tipSlot.hidden) return void (tipSlot.hidden = true);
    const list = battle.powers.filter((p) => POWERS[p]);
    tipSlot.hidden = false;
    tipSlot.replaceChildren(
      el('div', { className: 'power-list' }, [
        ...(list.length
          ? list.map((p) =>
              el('p', {}, [
                ...withArt(POWERS[p].icon),
                ' ',
                el('strong', { textContent: POWERS[p].name }),
                ` ${POWERS[p].tip}`,
              ]),
            )
          : [
              el('p', {
                textContent: `${enemy.name} has no special powers. Finish lines to chip it, then solve the shape.`,
              }),
            ]),
        el('button', {
          className: 'button tip-ok',
          textContent: 'Close',
          onclick: () => (tipSlot.hidden = true),
        }),
      ]),
    );
  };

  // --- What happens --------------------------------------------------------------------
  function hurt(amount: number) {
    if (!link.get()) return;
    const out = link.hurt(amount);
    floatNumber(header, `−${amount}`, 'player');
    playSound('hit', 0.05);
    haptic('hit');
    if (out) knockOut();
  }

  function knockOut() {
    if (knockedOut) return;
    knockedOut = true;
    play.lock();
    playSound('knockout', 0.2);
    play.showPanel([
      el('h2', { textContent: 'Knocked out' }),
      el('p', {
        className: 'end-note',
        textContent: `${battle.current.name} got the better of you.`,
      }),
      el('div', { className: 'end-actions' }, [
        el('a', {
          className: 'button primary',
          href: opts.home ?? '#/story',
          textContent: 'See results →',
        }),
      ]),
    ]);
  }

  function handle(events: BattleEvent[]) {
    let rebuild = false;
    const phased = events.some((e) => e.kind === 'phase');
    for (const e of events) {
      switch (e.kind) {
        case 'chip':
          if (e.amount) floatNumber(enemySide, `−${e.amount}`, 'enemy');
          break;
        case 'armor-broken':
          playSound('block');
          say('The armor breaks!');
          break;
        case 'hit':
          hurt(e.amount);
          if (e.cause === 'zap') say(`Zapped for ${e.amount}.`);
          if (e.cause === 'armor') say(`The armor hits back for ${e.amount}.`);
          break;
        case 'blocked':
          playSound('block');
          say('Your patch kit takes the hit.');
          break;
        case 'grounded':
          playSound('tool');
          say('Grounded the charge.');
          break;
        case 'live':
          playSound('live');
          say('A line went live. Finish it to ground the charge.');
          rebuild = true;
          break;
        case 'turn':
          playSound('phase');
          for (const axis of ['x', 'y', 'z'] as const) play.view.peels[axis].layers = 0;
          play.view.animateTo(play.view.yaw + Math.PI / 2, play.view.pitch);
          say('The block turns a quarter!');
          rebuild = true;
          break;
        case 'phase':
          playSound('phase');
          banner.hidden = false;
          banner.replaceChildren(
            el('strong', { textContent: e.phase.name ?? battle.current.name }),
            ...(e.phase.taunt ? [el('span', { textContent: e.phase.taunt })] : []),
          );
          window.setTimeout(() => (banner.hidden = true), 2600);
          say(`${e.phase.name ?? battle.current.name}${e.phase.taunt ? `: ${e.phase.taunt}` : ''}`);
          nextTip();
          rebuild = true;
          break;
        case 'swap':
          lastSwapped = e.lines;
          playSound('error');
          say('Two lines were wiped back to solid cubes.');
          rebuild = true;
          break;
        case 'ink':
        case 'washed':
          rebuild = true;
          break;
        case 'caught':
          playSound('finisher');
          floatNumber(enemySide, `−${e.amount}`, 'enemy');
          say(`Caught a forgery! −${e.amount}.`);
          rebuild = true;
          break;
        case 'honest':
          playSound('error');
          say('That clue was honest.');
          rebuild = true;
          break;
        case 'healed':
          floatNumber(enemySide, `+${e.amount}`, 'heal');
          break;
      }
    }
    if (rebuild) play.view.rebuild();
    render();
    if (phased && !knockedOut) opts.phased?.(battle);
  }

  // Faces: ink over everything; then paint as usual; then the marked lines.
  const styler = (cell: number, _axis: string, line: number) => {
    const s = battle.state;
    if (s.ink.includes(cell)) return 'ink' as const;
    if (play.game.blocks[cell] === PAINTED) return null;
    if (lastSwapped.includes(line)) return 'swapped' as const;
    if (s.charge?.live === line) return 'live' as const;
    if (s.fog.includes(line) && !s.struck.includes(line)) return 'fog' as const;
    if (s.targets.includes(line)) return 'target' as const;
    if (s.suspects.includes(line))
      return battle.isHonest(line) ? ('honest' as const) : ('suspect' as const);
    return null;
  };

  // --- Gadgets and calling out ---------------------------------------------------------
  function useGadget(id: string, index: number) {
    const g = getGadget(id);
    if (!g || !link.get() || play.game.over || knockedOut) return;
    link.spendGadget(index, id);
    playSound('tool');
    if (g.effect.kind === 'blast') {
      const { events } = battle.bomb(play.game.blocks);
      play.game.clearHistory();
      playSound('finisher');
      say(`Bomb! −${g.effect.damage}, and a line worked out.`);
      handle(events);
      play.refresh();
    } else if (g.effect.kind === 'shield') {
      battle.shieldUp(g.effect.hits);
      say('Patch kit ready: it blocks the next hit.');
      render();
    } else {
      handle(battle.wash());
      say('Ink washed off.');
    }
  }

  callOut.onclick = () => {
    callingOut = !callingOut;
    play.coach.classList.toggle('calling-out', callingOut);
    say(
      callingOut
        ? 'Tap a ? clue face to call it out, or press X on a cube its line runs through.'
        : 'Call out cancelled.',
    );
    render();
  };

  return {
    mode: hitsOn ? 'battle' : 'relaxed',
    header,
    hooks: {
      hintClues: () => battle.hintClues(),
      keyPick(cell) {
        if (!callingOut) return false;
        callingOut = false;
        play.coach.classList.remove('calling-out');
        // The suspect line through the cursor's cube, if there is one.
        const p = pointOf(encounter.puzzle.dims, cell);
        const line = (['x', 'y', 'z'] as const)
          .map((axis) => lineIdAt(encounter.puzzle.dims, axis, p))
          .find((id) => battle.state.suspects.includes(id));
        if (line === undefined) {
          say('No ? clue runs through that cube. Call out cancelled.');
          render();
          return true;
        }
        handle(battle.callOut(line));
        return true;
      },
      pick(pick) {
        if (!callingOut) return false;
        callingOut = false;
        play.coach.classList.remove('calling-out');
        const line = lineIdAt(
          encounter.puzzle.dims,
          pick.axis,
          pointOf(encounter.puzzle.dims, pick.cell),
        );
        if (!battle.state.suspects.includes(line)) {
          say('That isn’t a ? clue. Call out cancelled.');
          render();
          return true;
        }
        handle(battle.callOut(line));
        return true;
      },
      changed({ outcome }) {
        lastSwapped = [];
        const events = outcome === 'strike' ? battle.mistake() : [];
        const before = play.game.blocks.join('');
        events.push(...battle.update(play.game.blocks));
        handle(events);
        // A swap changed the board under the player: redraw from the game. Undo can't go
        // back past it, or it would bring back what was wiped.
        if (play.game.blocks.join('') !== before) {
          play.game.clearHistory();
          play.refresh();
        }
      },
    },
    attach(p) {
      play = p;
      play.view.clueFor = (line) => battle.clueFor(line);
      play.view.styler = styler;
      // Phases carried over from the other board start first; then lines already finished
      // when the fight starts (or resumes) count from here.
      const carried = opts.carry === undefined ? [] : battle.carry(opts.carry, play.game.blocks);
      handle([...carried, ...battle.update(play.game.blocks)]);
      play.view.rebuild();
      nextTip();
      render();
    },
    land() {
      const dealt = battle.finish();
      render();
      playSound('finisher');
      void pause(300).then(() => floatNumber(enemySide, `−${dealt}`, 'enemy'));
      finisherDealt = dealt;
    },
    note: (game) => `${battle.current.name} defeated! Finisher −${finisherDealt} · ${took(game)}`,
    save: () => battle.state,
  };
}
