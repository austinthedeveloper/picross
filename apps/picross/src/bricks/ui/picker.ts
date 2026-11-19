/**
 * The bricks route's first screen (`#/bricks`): the shelf of toys built so far, then a big
 * picture card for every model. Nothing to read: a card is its picture, a built one wears a
 * star, and a toy on the shelf plays its moment again. No three.js here (the pictures are
 * drawn flat), so it opens before the build's view has loaded.
 */
import { shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { el } from '@picross/shared/ui/dom';
import { bricksHref } from '../href';
import { BRICKS_MODELS, bricksModel } from '../models';
import { clearShelf, getShelf, isBuilt, type ShelfToy } from '../shelf';
import { parentGate } from './gate';
import { icon } from './icons';

/** A toy's picture: as it was built if the device kept it, else drawn from its model. */
export function toyPicture(toy: ShelfToy, px: number): HTMLElement {
  if (toy.picture) {
    const img = el('img', { className: 'bk-toy-picture', alt: '' });
    img.src = toy.picture;
    return img;
  }
  return shapePicture(bricksModel(toy.id)!, px);
}

/** The shelf: a plank with every toy built, each a way to see it again. */
export function shelf(toys: ShelfToy[], fresh?: string): HTMLElement {
  return el('section', { className: 'bk-shelf', ariaLabel: 'Shelf' }, [
    el(
      'ul',
      { className: 'bk-shelf-toys' },
      toys
        .filter((t) => bricksModel(t.id))
        .map((toy) => {
          const link = el(
            'a',
            {
              className: `bk-toy${toy.id === fresh ? ' fresh' : ''}`,
              href: bricksHref(`/${toy.id}/show`),
              ariaLabel: bricksModel(toy.id)!.name,
            },
            [toyPicture(toy, 72)],
          );
          link.dataset.id = toy.id;
          return el('li', {}, [link]);
        }),
    ),
    el('div', { className: 'bk-plank', ariaHidden: 'true' }),
  ]);
}

export function renderPicker(app: HTMLElement): () => void {
  const gate = parentGate([
    {
      label: 'Clear the shelf',
      confirm: true,
      run: () => {
        clearShelf();
        draw();
      },
    },
  ]);
  const cards = el('nav', { className: 'bk-models', ariaLabel: 'Models' });
  const screen = el('main', { className: 'bk bk-picker' }, [
    el('header', { className: 'bk-top' }, [
      el('h1', { className: 'sr-only', textContent: 'Brick kids' }),
      gate.button,
    ]),
    el('div', { className: 'bk-shelf-slot' }),
    cards,
    gate.panel,
  ]);

  function draw() {
    screen.querySelector('.bk-shelf-slot')!.replaceChildren(shelf(getShelf()));
    cards.replaceChildren(
      ...BRICKS_MODELS.map((id, i) => {
        const model = bricksModel(id)!;
        const card = el('a', { className: 'bk-card', href: bricksHref(`/${id}`) }, [
          shapePicture(model, 120),
          ...(isBuilt(id) ? [el('span', { className: 'bk-star' }, [icon('star')])] : []),
        ]);
        card.ariaLabel = model.name;
        card.dataset.id = id;
        card.style.setProperty('--i', String(i));
        return card;
      }),
    );
  }
  draw();
  app.replaceChildren(screen);
  return () => gate.dispose();
}
