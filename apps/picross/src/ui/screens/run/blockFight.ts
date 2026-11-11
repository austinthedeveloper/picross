/**
 * A story fight on a block, for a boss that switches board (docs/story-combined.md). The
 * block is the 3D game's: its play screen, battle and fight screen (from cubed/), run here
 * against this game's run. This module loads on demand, so three.js stays out of the first
 * download.
 *
 * HP and phases carry between the boards as a share of the enemy's HP (the boards scale HP
 * differently); each board keeps its own progress, so going back finds it as you left it.
 */
import { Battle, type BattleState as BlockBattle } from '../../../../../cubed/src/game/battle';
import { hashString } from '../../../../../cubed/src/puzzles/hide';
import { getEncounter } from '../../../../../cubed/src/story/data';
import { shapePicture } from '../../../../../cubed/src/ui/board/thumbnail';
import { createPlay, type Play } from '../../../../../cubed/src/ui/screens/play';
import { fightKind, type FightRun } from '../../../../../cubed/src/ui/screens/story/fight';
import { advancePhase, boardAt, carryHp, startBattle, type Enemy } from '../../../game/battle';
import { damage, removeGadget, withBattle, withBlock } from '../../../game/run';
import { getCurrentRun, hasSeenTip, markTipSeen, saveCurrentRun } from '../../../game/runSave';
import { el } from '@picross/shared/ui/dom';

export interface BlockFightOptions {
  encounterId: string;
  title: string;
  /** The enemy as this game reads it: its phases say which board each is on. */
  enemy: Enemy;
  /** The flat board's size, for the phases that start back on it. */
  size: number;
  /** Once a phase folds the fight back to the flat board. */
  onFlat(): void;
  /** Clears the encounter once the block is solved; `fightNote` is the defeat line. */
  clear(
    game: { hintsUsed: number; elapsed: number },
    fightNote: string,
  ): { note: string; last: boolean };
}

/** How long a phase banner shows before the fight changes board. */
const SWITCH_DELAY = 1200;

/** This game's run, as the 3D fight screen needs it. */
const run: FightRun = {
  get() {
    const current = getCurrentRun();
    return current?.status === 'active' ? current : null;
  },
  hurt(amount) {
    const current = getCurrentRun();
    if (current?.status !== 'active') return false;
    const next = damage(current, amount);
    saveCurrentRun(next);
    return next.status === 'lost';
  },
  spendGadget(index, id) {
    const current = getCurrentRun();
    if (current) saveCurrentRun(removeGadget(current, current.gadgets[index] ?? id));
  },
  tipSeen: hasSeenTip,
  markTip: markTipSeen,
};

/** Renders the block fight, or returns null if the encounter has no block. */
export function renderBlockFight(app: HTMLElement, opts: BlockFightOptions): (() => void) | null {
  const encounter = getEncounter(opts.encounterId);
  const state = getCurrentRun();
  if (!encounter?.enemy || state?.status !== 'active') return null;

  const flat = state.battle ?? startBattle(opts.enemy);
  const started = flat.phase ?? 0;
  const saved = state.block?.battle as BlockBattle | undefined;
  const battle = new Battle(encounter.enemy, encounter.puzzle, state.mode === 'hearts', saved, {
    seed: hashString(encounter.id),
  });
  // Coming over from the flat board (rather than reloading mid-block), the block picks up
  // the flat board's HP share, phases and patch kit.
  let carry: number | undefined;
  if (!saved || saved.phase + 1 < started) {
    carry = carryHp(
      flat.enemyHp / opts.enemy.hp,
      battle.state.maxHp,
      encounter.enemy.phases ?? [],
      started,
    );
    battle.state.shield = flat.shield ?? 0;
  }

  let leaving = false;
  /** Once a phase says the fight is flat again: carries it back and leaves the block. */
  function foldBack(b: Battle) {
    if (leaving || boardAt(opts.enemy, b.state.phase + 1) !== 'flat') return;
    leaving = true;
    play.lock();
    const current = getCurrentRun();
    if (current?.status !== 'active') return;
    const back = current.battle ?? startBattle(opts.enemy);
    const enemyHp = carryHp(
      b.state.enemyHp / b.state.maxHp,
      opts.enemy.hp,
      opts.enemy.phases ?? [],
      b.state.phase + 1,
    );
    // The phases from the block start on the flat board too (its fog and scrambles land
    // there), so the run says it's flat again before the screen changes.
    const flatNow = advancePhase(
      opts.enemy,
      { ...back, enemyHp, shield: b.state.shield },
      opts.size,
    ).state;
    saveCurrentRun(
      withBattle(withBlock(current, { board: play.game.save(), battle: b.state }), flatNow),
    );
    // The move that folds it back may also solve the block: then the fight's over instead.
    window.setTimeout(() => {
      if (!play.game.over) opts.onFlat();
    }, SWITCH_DELAY);
  }

  const kind = fightKind(
    encounter,
    { mode: state.mode ?? 'relaxed', battle: battle.state },
    {
      run,
      battle,
      carry,
      home: '#/run',
      phased: foldBack,
    },
  );

  const back = el('a', { className: 'button ghost', href: '#/run', textContent: '← Map' });
  document.documentElement.dataset.board = 'block';
  // Declared after the fight, whose callbacks only use it once play has started.
  const play: Play = createPlay(app, {
    puzzle: encounter.puzzle,
    title: opts.title,
    mode: kind.mode,
    saved: state.block?.board as Parameters<typeof createPlay>[1]['saved'],
    back,
    hooks: {
      ...kind.hooks,
      solved: () => {
        kind.land?.();
        const { note, last } = opts.clear(play.game, kind.note(play.game));
        return [
          el('h2', { textContent: 'Boss down!' }),
          shapePicture(encounter.puzzle, 110),
          el('p', { className: 'end-name', textContent: encounter.puzzle.name }),
          el('p', { className: 'end-note', textContent: note }),
          el('div', { className: 'end-actions' }, [
            el('a', {
              className: 'button primary',
              href: '#/run',
              textContent: last ? 'See results →' : 'Back to map →',
            }),
          ]),
        ];
      },
      failed: () => kind.knockedOut?.() ?? null,
    },
  });
  play.coach.dataset.owned = 'fight';
  play.coach.hidden = false;
  play.coach.replaceChildren(kind.header);
  kind.attach?.(play);
  // A block left mid-switch (closed during the banner) folds back as soon as it opens.
  foldBack(battle);

  const persist = (elapsed: number) => {
    const { game } = play;
    const current = getCurrentRun();
    if (game.over || current?.status !== 'active' || current.node !== state.node) return;
    game.elapsed = elapsed;
    saveCurrentRun(withBlock(current, { board: game.save(), battle: battle.state }));
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') persist(play.clock.elapsed);
  };
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    document.removeEventListener('visibilitychange', onHidden);
    const elapsed = play.cleanup();
    kind.dispose?.();
    persist(elapsed);
    delete document.documentElement.dataset.board;
  };
}
