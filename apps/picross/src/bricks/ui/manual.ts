/**
 * A toy's steps for real toy bricks (`#/bricks/<id>/steps`), for a grown-up and a child to
 * build together: the parts list first, then one page per layer, the same layers the screen
 * builds. It's a grown-ups' page (from their corner), so it has words. No three.js: the
 * pictures are drawn flat, so it opens fast and prints, one step to a page.
 */
import type { BrickModel } from '@picross/block/build/models';
import type { Part } from '@picross/block/build/real';
import { el } from '@picross/shared/ui/dom';
import { bricksHref } from '../href';
import { FIT_NOTE, manualFor, sizeLabel, type Manual } from '../manual';
import { savedStep, saveStep } from '../shelf';
import { brickPicture, colorOf, layerPlan, stepPicture } from './manualArt';

const stepHref = (id: string, step: number) => bricksHref(`/${id}/steps/${step}`);

/** The parts, as pictures with counts. */
function partsList(model: BrickModel, parts: Part[], px: number): HTMLElement {
  return el(
    'ul',
    { className: 'bk-parts' },
    parts.map((part) => {
      const color = model.palette[part.color - 1];
      const item = el('li', { className: 'bk-part' }, [
        brickPicture(part.size, colorOf(model, part.color), px),
        el('span', { className: 'bk-part-count', textContent: `× ${part.count}` }),
        el('span', {
          className: 'bk-part-name',
          textContent: `${sizeLabel(part.size)} ${color}`,
        }),
      ]);
      item.ariaLabel = `${part.count} ${color} ${sizeLabel(part.size)}`;
      return item;
    }),
  );
}

/** Page 0: what to have out, and whether it holds together in real bricks. */
function partsPage(model: BrickModel, manual: Manual): HTMLElement {
  const finished = stepPicture(model, manual.layers, manual.layers.length - 1, 260, false);
  finished.ariaLabel = `The ${model.name}, built`;
  finished.setAttribute('role', 'img');
  return el('section', { className: 'bk-manual-page' }, [
    el('h2', { textContent: 'What you need' }),
    el('div', { className: 'bk-manual-picture' }, [finished]),
    el('p', {
      textContent: `${manual.bricks} bricks in ${manual.layers.length} layers, one layer a step.`,
    }),
    el('p', { className: `bk-fit ${manual.fit}`, textContent: FIT_NOTE[manual.fit] }),
    partsList(model, manual.parts, 84),
    el('p', {
      className: 'bk-manual-small',
      textContent:
        'Real bricks stand a little taller than they’re wide, so the toy comes out a bit taller than on the screen. Any color close to the picture’s is fine.',
    }),
  ]);
}

/** Page `n` (from 1): one layer. */
function stepPage(model: BrickModel, manual: Manual, n: number): HTMLElement {
  const step = manual.steps[n - 1];
  const picture = stepPicture(model, manual.layers, step.layer, 260);
  picture.ariaLabel = `The ${model.name} after step ${n}`;
  picture.setAttribute('role', 'img');
  const plan = layerPlan(model, manual.layers, step.layer, step);
  plan.ariaLabel = `Step ${n} from above, the front at the bottom`;
  const notes: HTMLElement[] = [];
  if (step.hangs.length)
    notes.push(
      el('p', {
        className: 'bk-note hangs',
        textContent: `${step.hangs.length === 1 ? 'The dashed brick has' : `The ${step.hangs.length} dashed bricks have`} nothing under them: put them on after the next step, pressed on from underneath.`,
      }),
    );
  if (step.loose.length)
    notes.push(
      el('p', {
        className: 'bk-note loose',
        textContent: `${step.loose.length === 1 ? 'The crossed brick only touches' : `The ${step.loose.length} crossed bricks only touch`} the toy from the side, so ${step.loose.length === 1 ? 'it won’t' : 'they won’t'} hold: leave ${step.loose.length === 1 ? 'it' : 'them'} off, or hold ${step.loose.length === 1 ? 'it' : 'them'} on.`,
      }),
    );
  return el('section', { className: 'bk-manual-page' }, [
    el('h2', { textContent: `Step ${n} of ${manual.steps.length}` }),
    el('div', { className: 'bk-manual-picture' }, [picture]),
    el('div', { className: 'bk-manual-layer' }, [
      el('figure', { className: 'bk-plan-figure' }, [
        plan,
        el('figcaption', { textContent: 'From above, front at the bottom' }),
      ]),
      el('div', {}, [el('h3', { textContent: 'Add these' }), partsList(model, step.parts, 64)]),
    ]),
    ...notes,
  ]);
}

export function renderManual(app: HTMLElement, model: BrickModel, at: number | null): () => void {
  const manual = manualFor(model);
  const last = manual.steps.length;
  const step = Math.min(Math.max(0, at ?? savedStep(model.id)), last);
  saveStep(model.id, step);
  const go = (n: number) => {
    if (n >= 0 && n <= last && n !== step) location.replace(stepHref(model.id, n));
  };

  const pages = el('nav', { className: 'bk-manual-pages', ariaLabel: 'Steps' }, [
    ...Array.from({ length: last + 1 }, (_, n) => {
      const link = el('a', {
        className: `bk-manual-dot${n === step ? ' here' : ''}`,
        href: stepHref(model.id, n),
        textContent: n ? String(n) : 'Parts',
      });
      link.ariaLabel = n ? `Step ${n}` : 'What you need';
      if (n === step) link.ariaCurrent = 'step';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        go(n);
      });
      return link;
    }),
  ]);
  const flip = (label: string, n: number, primary = false) =>
    el('button', {
      className: `button${primary ? ' primary' : ''}`,
      type: 'button',
      textContent: label,
      disabled: n < 0 || n > last,
      onclick: () => go(n),
    });
  const page = step ? stepPage(model, manual, step) : partsPage(model, manual);
  page.classList.add('here');

  // Printed, it's every page, one to a sheet.
  const print = el('div', { className: 'bk-manual-print', ariaHidden: 'true' });
  const fillPrint = () => {
    if (print.childElementCount) return;
    print.append(
      partsPage(model, manual),
      ...manual.steps.map((_, i) => stepPage(model, manual, i + 1)),
    );
  };

  const screen = el('main', { className: 'bk-manual' }, [
    el('header', { className: 'bk-manual-top' }, [
      el('a', {
        className: 'button ghost',
        href: bricksHref(`/${model.id}`),
        textContent: 'Back to the build',
      }),
      el('button', {
        className: 'button',
        type: 'button',
        textContent: 'Print',
        onclick: () => {
          fillPrint();
          window.print();
        },
      }),
    ]),
    el('h1', { textContent: `The ${model.name} in real bricks` }),
    pages,
    page,
    el('footer', { className: 'bk-manual-flip' }, [
      flip('Back', step - 1),
      flip(step ? (step === last ? 'Done' : 'Next') : 'Start', step === last ? -1 : step + 1, true),
    ]),
    print,
  ]);
  screen.dataset.model = model.id;
  screen.dataset.step = String(step);
  screen.dataset.fit = manual.fit;

  // A swipe turns the page, and so do the arrow keys.
  let down: { x: number; y: number } | null = null;
  page.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
  page.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(step + (dx < 0 ? 1 : -1));
  });
  const keydown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') go(step + 1);
    if (e.key === 'ArrowLeft') go(step - 1);
  };
  document.addEventListener('keydown', keydown);
  window.addEventListener('beforeprint', fillPrint);

  app.replaceChildren(screen);
  return () => {
    document.removeEventListener('keydown', keydown);
    window.removeEventListener('beforeprint', fillPrint);
  };
}
