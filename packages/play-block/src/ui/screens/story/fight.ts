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
import type { HandOver } from '@picross/story/fight/battle';
import type { BoardKind } from '@picross/story/fight/board';
import { tipToShow, type TipCard } from '@picross/story/fight/tips';
import { createBattleBar, type BattleBar } from '@picross/story/ui/components/battleBar';
import { gadgetArt, withArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { haptic } from '@picross/shared/ui/haptics';
import { pause } from '@picross/shared/ui/motion';
import { playSound } from '@picross/shared/ui/sound';
import type { Play } from '../play';
import type { Kind } from './kind';
import { took } from './kind';

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
  /** Whether the run's save has seen this tip (a power's name, or `<power>:<board>`). */
  tipSeen(key: string): boolean;
  markTip(key: string): void;
  /**
   * The board this run's save is from, where its tips from before they knew their board
   * were seen (`tipToShow`): Cubed's (`block`) by default, the 2D game's `flat`.
   */
  home?: BoardKind;
}

export interface FightOptions {
  /** The run the fight is in. */
  run: FightRun;
  /** A battle already set up, instead of a new one. */
  battle?: Battle;
  /**
   * The fight as the other board hands it over (a boss that switches board, #170): the
   * battle takes it over once the block is up (`enterBoard`), and its phases start here.
   */
  enter?: HandOver;
  /** Where the knocked-out panel leads: the game's story map. */
  home: string;
  /** After each update that started a phase: a boss can change board here. */
  phased?(battle: Battle): void;
  /**
   * The battle bar to drive, instead of a new one: a boss that switches board keeps one
   * bar on screen from board to board (#171).
   */
  bar?: BattleBar;
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

  // --- The bar: the story's, the same on both boards (#171) ----------------------------
  const bar = opts.bar ?? createBattleBar(enemy, battle.state.enemyHp);
  const info = el('button', { className: 'powers-info', textContent: 'ⓘ', title: 'Powers' });
  info.ariaLabel = 'Enemy powers';
  bar.setInfo(info);
  const callOut = el(
    'button',
    { className: 'button call-out', hidden: true },
    withArt('🔍 Call out'),
  );
  let tipShown = false;
  const showTip = (content: HTMLElement | null) => {
    tipShown = content !== null;
    bar.setTip(content);
  };
  const say = (text: string) => bar.say(text);

  function render() {
    const s = battle.state;
    const now = battle.current;
    bar.setForm(now.name, now.sprite);
    bar.setEnemyHp(s.enemyHp, s.maxHp);
    const run = link.get();
    if (run) bar.setPlayerHp(run.hp, run.maxHp);
    bar.setArmor(s.targets.length);
    bar.setArmorLines(s.armorLines, ARMOR_HIT_LINES);
    bar.setFakes(s.fakes.length);
    callOut.hidden = !s.suspects.length || Boolean(play?.game.over);
    callOut.setAttribute('aria-pressed', String(callingOut));
    const c = s.charge;
    bar.setCharge(
      c ? (c.warmUp ? 0 : c.meter / c.every) : null,
      c ? (c.warmUp ? `warming up · ${c.warmUp}` : `${c.meter}/${c.every}`) : '',
    );
    const t = s.turn;
    bar.setTurn(t ? t.meter / t.every : null, t ? `${t.meter}/${t.every}` : '');
    bar.setShield(s.shield);
    renderTray();
  }

  /** The gadgets, after the call-out button while there are suspects (as on a grid). */
  function renderTray() {
    const gadgets = (link.get()?.gadgets ?? []).flatMap((id, i) => {
      const g = getGadget(id);
      if (!g) return [];
      const b = el('button', { className: 'gadget', title: `${g.name}: ${g.description}` }, [
        el('span', { className: 'gadget-icon', ariaHidden: 'true' }, [gadgetArt(g.id)]),
        g.name,
      ]);
      b.disabled = Boolean(play?.game.over) || knockedOut;
      b.onclick = () => useGadget(id, i);
      return [b];
    });
    bar.setGadgets([...(callOut.hidden ? [] : [callOut]), ...gadgets]);
  }

  // --- Tips ----------------------------------------------------------------------------
  // The story's tips for both boards (#167): a power met on a flat board isn't explained
  // again here, unless it works differently on a block, and then its short note shows.
  function tipCard(tip: TipCard, onDone: () => void) {
    return el('div', { className: 'tip-card' }, [
      el('span', { className: 'tip-icon', ariaHidden: 'true' }, withArt(tip.icon)),
      el('span', { className: 'tip-text' }, [
        el('strong', { textContent: tip.name }),
        ` ${tip.text}`,
      ]),
      el('button', { className: 'button tip-ok', textContent: 'Got it', onclick: onDone }),
    ]);
  }
  function nextTip() {
    const tip = battle.powers
      .map((p) => tipToShow(p, 'block', (key) => link.tipSeen(key), link.home ?? 'block'))
      .find((t) => t !== null);
    if (!tip) return showTip(null);
    showTip(
      tipCard(tip, () => {
        for (const key of tip.keys) link.markTip(key);
        nextTip();
      }),
    );
  }
  info.onclick = () => {
    if (tipShown) return showTip(null);
    const list = battle.powers.filter((p) => POWERS[p]);
    showTip(
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
          onclick: () => showTip(null),
        }),
      ]),
    );
  };

  // --- What happens --------------------------------------------------------------------
  function hurt(amount: number) {
    if (!link.get()) return;
    const out = link.hurt(amount);
    bar.hitPlayer(amount);
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
          href: opts.home,
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
          if (e.amount) bar.hitEnemy(e.amount);
          break;
        case 'armor-broken':
          playSound('block');
          bar.armorBreaks();
          say('The armor breaks!');
          break;
        case 'hit':
          hurt(e.amount);
          if (e.cause === 'zap') bar.zap();
          if (e.cause === 'zap') say(`Zapped for ${e.amount}.`);
          if (e.cause === 'armor') say(`The armor hits back for ${e.amount}.`);
          break;
        case 'blocked':
          playSound('block');
          bar.block();
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
          bar.phaseBanner(e.phase.name ?? battle.current.name, e.phase.taunt ?? '');
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
          bar.hitEnemy(e.amount);
          say(`Caught a forgery! −${e.amount}.`);
          rebuild = true;
          break;
        case 'honest':
          playSound('error');
          say('That clue was honest.');
          rebuild = true;
          break;
        case 'healed':
          bar.healEnemy(e.amount);
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
    header: bar.root,
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
      // A fight taken over from the other board starts its phases first; then lines already
      // finished when the fight starts (or resumes) count from here.
      // (In the block's order, only a block's events.)
      const carried = opts.enter
        ? (battle.enterBoard(opts.enter, play.game.blocks) as BattleEvent[])
        : [];
      handle([...carried, ...battle.update(play.game.blocks)]);
      play.view.rebuild();
      nextTip();
      render();
    },
    land() {
      const dealt = battle.finish();
      render();
      playSound('finisher');
      void pause(300).then(() => bar.hitEnemy(dealt));
      finisherDealt = dealt;
    },
    note: (game) => `${battle.current.name} defeated! Finisher −${finisherDealt} · ${took(game)}`,
    save: () => battle.state,
  };
}
