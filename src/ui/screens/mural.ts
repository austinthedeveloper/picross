import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { getSettings } from '../../game/settings';
import type { Mural } from '../../puzzles/murals';
import { murals } from '../../puzzles/murals';
import { createPicture } from '../board/picture';
import { el } from '../dom';
import { formatTime } from '../format';
import { renderGameScreen, type PlaySession } from './gameScreen';

const solvedTiles = (mural: Mural) => mural.tiles.filter((t) => getPuzzleStats(t.id));
const complete = (mural: Mural) => solvedTiles(mural).length === mural.tiles.length;
/** Murals keep their name hidden until they're finished, like pack puzzles. */
const title = (mural: Mural) => (complete(mural) ? mural.name : `Mural No. ${mural.order}`);
const tileHref = (mural: Mural, n: number) => `#/mural/${mural.id}/${n + 1}`;

/** The picture with solved tiles drawn in and the rest as numbered "?" tiles. */
function tileGrid(mural: Mural, pixel: number, links: boolean): HTMLElement {
  const grid = el(
    'div',
    { className: 'mural-grid' },
    mural.tiles.map((tile, n) => {
      const solved = Boolean(getPuzzleStats(tile.id));
      const inner = solved
        ? createPicture(tile.solution, pixel)
        : el('span', { className: 'mural-unknown', textContent: String(n + 1) });
      const label = `Tile ${n + 1}, ${solved ? 'solved' : getSavedBoard(tile.id) ? 'in progress' : 'unsolved'}`;
      const className = `mural-tile${solved ? ' solved' : ''}`;
      return links
        ? el('a', { className, href: tileHref(mural, n), ariaLabel: label }, [inner])
        : el('div', { className, ariaHidden: 'true' }, [inner]);
    }),
  );
  grid.style.setProperty('--across', String(mural.across));
  grid.style.setProperty('--tile', `${mural.tiles[0].width * pixel}px`);
  return grid;
}

/** The murals section on the puzzle list (#24). */
export function muralSection(): HTMLElement {
  return el('section', { className: 'size-section murals', ariaLabel: 'Murals' }, [
    el('h2', { className: 'size-heading' }, [
      'Murals',
      el('span', {
        className: 'size-count',
        textContent: `${murals.filter(complete).length}/${murals.length}`,
      }),
    ]),
    el(
      'div',
      { className: 'mural-cards' },
      murals.map((mural) =>
        el('a', { className: 'card mural-card', href: `#/mural/${mural.id}` }, [
          tileGrid(mural, 2, false),
          el('div', { className: 'card-name', textContent: title(mural) }),
          el('div', { className: 'card-meta' }, [
            el('span', {
              textContent: `${mural.across}×${mural.down} tiles of ${mural.tiles[0].width}×${mural.tiles[0].height}`,
            }),
            el('span', {
              className: 'status',
              textContent: `${solvedTiles(mural).length}/${mural.tiles.length}`,
            }),
          ]),
        ]),
      ),
    ),
  ]);
}

/** A mural at #/mural/<id>: its tiles to pick from, or the finished picture. */
export function renderMuralScreen(app: HTMLElement, mural: Mural): void {
  const done = complete(mural);
  const pixel = Math.max(3, Math.floor(300 / (mural.across * mural.tiles[0].width)));
  app.replaceChildren(
    el('main', { className: 'screen mural' }, [
      el('header', { className: 'topbar' }, [
        el('a', { className: 'button ghost', href: '#/', textContent: '← Puzzles' }),
        el('h1', { textContent: title(mural) }),
      ]),
      el('p', {
        className: 'run-meta',
        textContent: done
          ? `Mural complete! All ${mural.tiles.length} tiles fit together.`
          : `${solvedTiles(mural).length} of ${mural.tiles.length} tiles solved. Each tile is its own puzzle; solve them all to see the whole picture.`,
      }),
      done
        ? el('div', { className: 'mural-done' }, [createPicture(mural.solution, pixel)])
        : tileGrid(mural, pixel, true),
    ]),
  );
}

/** One tile of a mural at #/mural/<id>/<n>, played like a pack puzzle. */
export function renderMuralTile(app: HTMLElement, mural: Mural, n: number): () => void {
  const tile = mural.tiles[n];
  const session: PlaySession = {
    back: { href: `#/mural/${mural.id}`, label: '← Mural' },
    title: `${title(mural)} · tile ${n + 1}/${mural.tiles.length}`,
    mode: getSettings().mode,
    saved: getSavedBoard(tile.id),
    save: (board) => (board ? saveBoard(tile.id, board) : clearSavedBoard(tile.id)),
    complete(game) {
      recordSolve(tile.id, game.elapsed);
      const left = mural.tiles
        .map((t, i) => [t, i] as const)
        .filter(([t]) => !getPuzzleStats(t.id));
      const next = left.find(([, i]) => i > n) ?? left[0];
      const note = left.length
        ? `Tile ${n + 1} done in ${formatTime(game.elapsed)}. ${left.length} to go.`
        : `The last tile! ${mural.name} is complete.`;
      return {
        note,
        actions: [
          el('a', {
            className: `button ${next ? 'ghost' : 'primary'}`,
            href: `#/mural/${mural.id}`,
            textContent: next ? 'Back to mural' : 'See the mural →',
          }),
          ...(next
            ? [
                el('a', {
                  className: 'button primary',
                  href: tileHref(mural, next[1]),
                  textContent: `Tile ${next[1] + 1} →`,
                }),
              ]
            : []),
        ],
      };
    },
  };
  return renderGameScreen(app, tile, session);
}
