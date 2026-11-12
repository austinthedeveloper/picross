/**
 * A story fight on a block, for a boss that switches board (docs/story-combined.md). The
 * block is the 3D game's: its battle (packages/block) and its play and fight screens
 * (packages/play-block), run here against this game's run. This module loads on demand,
 * so three.js stays out of the first download.
 *
 * It's one fight across the boards (#170, `@picross/story/fight/switch`): the block's battle
 * takes it over from the flat one (`enterBoard`: the same share of HP, the patch kit, the
 * counts, then the phases), and hands it back the same way (`enterFlat`). Each board keeps
 * its own progress, so going back finds it as you left it.
 */
import { Battle, type BattleState as BlockBattle } from '@picross/block/game/battle';
import { hashString } from '@picross/block/puzzles/hide';
import { getEncounter } from '@picross/block/story/data';
import { shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { createPlay, type Play } from '@picross/play-block/ui/screens/play';
import { fightKind, type FightRun } from '@picross/play-block/ui/screens/story/fight';
import { providePlayPrefs } from '@picross/play-block/ui/prefs';
import { boardAt } from '@picross/story/fight/switch';
import type { BattleBar } from '@picross/story/ui/components/battleBar';
import { endlessBlock } from '../../../puzzles/endlessBlocks';
import type { Encounter } from '../../../puzzles/runs';
import { enterFlat, handOver, startBattle, takeCounts, type Enemy } from '../../../game/battle';
import { damage, removeGadget, withBattle, withBlock } from '../../../game/run';
import { getCurrentRun, hasSeenTip, markTipSeen, saveCurrentRun } from '../../../game/runSave';
import { getSettings } from '../../../game/settings';
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
  /** The fight's one battle bar, kept on screen from board to board (#171). */
  bar?: BattleBar;
  /**
   * An Endless fight on a block (#158): its block and enemy are picked for it
   * (`puzzles/endlessBlocks.ts`), and it stays on the block from start to finish.
   */
  onBlock?: Encounter['onBlock'];
  /** Clears the encounter once the block is solved; `fightNote` is the defeat line. */
  clear(
    game: { hintsUsed: number; elapsed: number },
    fightNote: string,
  ): { note: string; last: boolean };
}

// The block fades finished clues as Cubed does: `dimDone`, Cubed's setting, which is in the
// one settings save since #155.
providePlayPrefs(getSettings);

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
  // This is the 2D game's run: a tip it saved before tips knew their board was seen flat.
  home: 'flat',
};

/** Renders the block fight, or returns null if the encounter has no block. */
export function renderBlockFight(app: HTMLElement, opts: BlockFightOptions): (() => void) | null {
  const { onBlock } = opts;
  const picked = onBlock && endlessBlock(onBlock.of, onBlock.fight, onBlock.nth, onBlock.seed);
  // An Endless one is its story encounter, on the block picked for it.
  const encounter = picked
    ? { ...getEncounter(onBlock.of)!, id: opts.encounterId, ...picked }
    : getEncounter(opts.encounterId);
  const state = getCurrentRun();
  if (!encounter?.enemy || state?.status !== 'active') return null;

  const flat = state.battle ?? startBattle(opts.enemy);
  const started = flat.phase ?? 0;
  const saved = state.block?.battle as BlockBattle | undefined;
  const battle = new Battle(encounter.enemy, encounter.puzzle, state.mode === 'hearts', saved, {
    seed: hashString(encounter.id),
  });
  // Coming over from the flat board (rather than reloading mid-block), the block takes the
  // fight over once it's on screen.
  // An Endless block fight starts on the block, fresh: there's nothing to take over.
  const enter =
    !onBlock && (!saved || saved.phase + 1 < started) ? handOver(opts.enemy, flat) : undefined;

  let leaving = false;
  /** Once a phase says the fight is flat again: carries it back and leaves the block. */
  function foldBack(b: Battle) {
    if (onBlock || leaving || boardAt(opts.enemy, b.state.phase + 1) !== 'flat') return;
    leaving = true;
    play.lock();
    const current = getCurrentRun();
    if (current?.status !== 'active') return;
    // The flat board takes the fight back, and the phases from the block start there too
    // (their fog and scrambles land on it), so the run says it's flat before the screen
    // changes.
    const back = current.battle ?? startBattle(opts.enemy);
    const flatNow = enterFlat(opts.enemy, back, b.state, opts.size).state;
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
      enter,
      bar: opts.bar,
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
        // The fight ended here, so its counts are the block's: the run's tally and badges
        // read them from the flat battle.
        const current = getCurrentRun();
        if (current?.status === 'active') {
          const flatNow = takeCounts(current.battle ?? startBattle(opts.enemy), battle.state);
          saveCurrentRun(withBattle(current, flatNow));
        }
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
