import { SOLID } from '../../game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { getSettings } from '../../game/settings';
import { getDiorama } from '../../puzzles/dioramas';
import { BlockView } from '../board/blockView';
import { attachInput } from '../board/input';
import { blockOutline, shapePicture } from '../board/thumbnail';
import { homeLink } from '../components/homeLink';
import { el } from '../dom';
import { formatTime } from '../format';
import { picture, placed } from './dioramaList';
import { playSound } from '../sound';
import { onHide } from '../lifecycle';
import { createPlay } from './play';

/** A diorama (#/diorama/<id>): the scene so far, its pieces, and the finished scene to turn. */
export function renderDioramaScreen(root: HTMLElement, id: string): () => void {
  const d = getDiorama(id);
  if (!d) {
    location.replace('#/');
    return () => {};
  }
  const done = new Set(placed(d));
  const finished = done.size === d.tiles.length;
  let cleanup = () => {};
  const stage = el('div', { className: 'stage diorama-stage' });
  if (finished) {
    // The whole scene in color, to turn and zoom.
    const view = new BlockView(d.scene, new Uint8Array(d.scene.solution.length));
    view.revealed = true;
    view.rebuild();
    stage.append(view.canvas);
    const detach = attachInput(view, {
      acting: () => false,
      begin: () => {},
      extend: () => {},
      end: () => {},
      hover: () => {},
      reset: () => view.animateTo(-0.6, 0.5, 1),
    });
    cleanup = () => {
      detach();
      view.dispose();
    };
  } else {
    stage.append(picture(d, 280));
  }
  root.replaceChildren(
    el('div', { className: 'screen diorama' }, [
      el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: d.name })]),
      ...(d.blurb ? [el('p', { className: 'lede', textContent: d.blurb })] : []),
      stage,
      el('p', {
        className: 'stats',
        textContent: finished
          ? 'Finished! Drag to turn it, pinch or scroll to zoom.'
          : `${done.size} of ${d.tiles.length} pieces placed. Each piece is a puzzle of its own.`,
      }),
      el(
        'div',
        { className: 'puzzle-grid' },
        d.tiles.map((t) => {
          const solved = done.has(t.index);
          const stats = getPuzzleStats(t.puzzle.id);
          return el(
            'a',
            {
              className: `puzzle-card${solved ? ' solved' : ''}`,
              href: `#/diorama/${d.id}/${t.index + 1}`,
            },
            [
              el('div', { className: 'thumb' }, [
                solved ? shapePicture(t.puzzle, 72) : blockOutline(t.puzzle.dims, 72),
              ]),
              el('span', { className: 'card-name', textContent: `Piece ${t.index + 1}` }),
              el('span', {
                className: 'card-meta',
                textContent: stats ? `✓ ${formatTime(stats.bestTime)}` : 'To do',
              }),
            ],
          );
        }),
      ),
    ]),
  );
  return cleanup;
}

/** One piece of a diorama (#/diorama/<id>/<n>). */
export function renderDioramaTile(root: HTMLElement, id: string, n: number): () => void {
  const d = getDiorama(id);
  const tile = d?.tiles[n - 1];
  if (!d || !tile) {
    location.replace('#/');
    return () => {};
  }
  const back = el('a', {
    className: 'button ghost',
    href: `#/diorama/${d.id}`,
    textContent: `← ${d.name}`,
  });
  const saved = getSavedBoard(tile.puzzle.id);
  let changed = false;
  const play = createPlay(root, {
    puzzle: tile.puzzle,
    title: `Piece ${n}`,
    mode: getSettings().mode,
    saved,
    back,
    hooks: {
      changed: () => (changed = true),
      solved(time) {
        recordSolve(tile.puzzle.id, time, play.game.hintsUsed);
        const left = d.tiles.length - placed(d).length;
        playSound('line', 0.4);
        return [
          el('h2', { textContent: left ? 'Placed!' : 'Finished!' }),
          picture(d, 140),
          el('p', {
            className: 'end-note',
            textContent: left
              ? `${left} piece${left === 1 ? '' : 's'} to go · ${formatTime(time)}`
              : `The ${d.name.toLowerCase()} is done.`,
          }),
          el('div', { className: 'end-actions' }, [
            el('a', {
              className: 'button primary',
              href: `#/diorama/${d.id}`,
              textContent: left ? 'Back to the scene' : 'See it',
            }),
          ]),
        ];
      },
    },
  });
  // A half-done piece is kept, like a free-play board.
  const persist = (elapsed: number) => {
    const { game } = play;
    if (game.over) {
      if (game.failed) clearSavedBoard(tile.puzzle.id);
      return;
    }
    if (!(changed || saved)) return;
    game.elapsed = elapsed;
    if (game.blocks.some((b) => b !== SOLID)) saveBoard(tile.puzzle.id, game.save());
  };
  onHide(() => persist(play.clock.elapsed));
  return () => persist(play.cleanup());
}
