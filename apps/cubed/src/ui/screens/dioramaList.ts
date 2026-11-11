import { solvedIds } from '../../game/progress';
import { dioramas, tileOf, type Diorama } from '../../puzzles/dioramas';
import { blockOutline, shapePicture } from '../board/thumbnail';
import { el } from '@picross/shared/ui/dom';

export const placed = (d: Diorama) => {
  const solved = new Set(solvedIds());
  return d.tiles.filter((t) => solved.has(t.puzzle.id)).map((t) => t.index);
};

/** The scene with its placed pieces, as a picture. */
export function picture(d: Diorama, px: number): HTMLCanvasElement {
  const done = new Set(placed(d));
  if (!done.size) return blockOutline(d.scene.dims, px);
  return shapePicture(d.scene, px, (cell) => done.has(tileOf(d, cell)));
}

/** The list's section of dioramas. */
export function dioramaSection(): HTMLElement | null {
  const all = dioramas();
  if (!all.length) return null;
  return el('section', { className: 'list-section dioramas' }, [
    el('h2', { textContent: 'Dioramas' }),
    el(
      'div',
      { className: 'puzzle-grid' },
      all.map((d) => {
        const n = placed(d).length;
        return el('a', { className: 'puzzle-card', href: `#/diorama/${d.id}` }, [
          el('div', { className: 'thumb' }, [picture(d, 88)]),
          el('span', { className: 'card-name', textContent: d.name }),
          el('span', {
            className: 'card-meta',
            textContent: n === d.tiles.length ? 'Finished' : `${n}/${d.tiles.length} pieces`,
          }),
        ]);
      }),
    ),
  ]);
}
