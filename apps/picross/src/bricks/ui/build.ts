/**
 * One build for little kids (`#/bricks/<id>`), and a toy's moment again from the shelf
 * (`#/bricks/<id>/show`). This module brings three.js (the view), so the route loads it
 * with `import()`.
 *
 * It plays like Cubed's build stage with `KIDS_RULES`, and without the words: tap a brick
 * in the tray (every kind the layer needs, with a dot for each one left), then tap its ghost
 * (or next to it) and it drops in, turning itself to fit; anywhere else, it bounces. A mouse
 * shows it in the ghost before the tap, and dragging works too.
 * The camera sways on its own; there's no turning or zoom. Sound and motion say how it's
 * going: a pop up the scale for each brick, a tune for a layer, a bigger one for the toy,
 * which then goes on the shelf. There's no way to lose.
 */
import { footprint, isSquare, type Rotation } from '@picross/block/build/bricks';
import { BrickBuild, type TrayKind } from '@picross/block/build/build';
import type { BrickModel } from '@picross/block/build/models';
import { carryFromTray, isOver } from '@picross/play-block/ui/board/brickInput';
import { BrickView } from '@picross/play-block/ui/board/brickView';
import { el } from '@picross/shared/ui/dom';
import { haptic } from '@picross/shared/ui/haptics';
import { pause, reducedMotion } from '@picross/shared/ui/motion';
import { bricksHref } from '../href';
import { KIDS_RULES } from '../models';
import { clearProgress, getShelf, putOnShelf, savedLayer, saveLayer } from '../shelf';
import { boingSound, builtSound, layerSound, pickSound, popSound } from '../sounds';
import { parentGate, type GateAction } from './gate';
import { icon } from './icons';
import { shelf } from './picker';

/** How far a press moves before it's a drag. */
const SLOP = 10;

/** The big Home button: back to the picker. */
const homeButton = () =>
  el('a', { className: 'bk-home', href: bricksHref(), ariaLabel: 'Home' }, [icon('home')]);

/** A brick from above, turned `rotation`. */
function brickIcon(kind: TrayKind, color: string, rotation: Rotation): HTMLElement {
  const { sx, sz } = footprint(kind.size, rotation);
  const brick = el('span', { className: 'bk-brick', ariaHidden: 'true' });
  brick.style.setProperty('--brick', `var(--vox-${color})`);
  brick.style.setProperty('--sx', String(sx));
  brick.style.setProperty('--sz', String(sz));
  // Little bricks drawn big: the long side about 60 px, a stud at most 30.
  brick.style.setProperty('--cell', `${Math.min(30, Math.floor(60 / Math.max(sx, sz)))}px`);
  return brick;
}

/** How many are left, as dots in the brick's color: one each, no numbers to read. */
function pips(count: number, color: string): HTMLElement {
  const row = el('span', { className: 'bk-pips', ariaHidden: 'true' });
  row.style.setProperty('--brick', `var(--vox-${color})`);
  row.append(...Array.from({ length: count }, () => el('span', { className: 'bk-pip' })));
  return row;
}

export interface KidsBuildOptions {
  /** Draws the build afresh from the bottom (the grown-ups' Start over, Build again). */
  restart(): void;
}

export function renderKidsBuild(
  app: HTMLElement,
  model: BrickModel,
  opts: KidsBuildOptions,
): () => void {
  const build = BrickBuild.fromShape(model, savedLayer(model.id), KIDS_RULES);
  const view = new BrickView(model, build, { drift: true, bob: true });
  /** Aborted when the screen goes: stops a carry, and anything still waiting on a pause. */
  const life = new AbortController();
  if (import.meta.env.DEV) Object.assign(window, { __build: build, __brickView: view });

  let held: TrayKind | null = null;
  let rotation: Rotation = 0;
  let ready = false;
  let finished = false;
  /** Bricks placed on this layer so far: each pops a note higher. */
  let placedHere = 0;
  /** The layer the tray last showed: a new one's bricks slide in. */
  let shownLayer = -1;

  const tray = el('div', { className: 'bk-tray', role: 'group', ariaLabel: 'Bricks' });
  const status = el('p', { className: 'sr-only', role: 'status' });
  const stage = el('div', { className: 'bk-stage' }, [view.canvas]);
  view.canvas.tabIndex = 0;
  view.canvas.ariaLabel = `Build plate for the ${model.name}`;
  const gate = parentGate([
    {
      label: 'Start over',
      confirm: true,
      run: () => {
        clearProgress(model.id);
        opts.restart();
      },
    },
    realBricks(model),
  ]);

  const screen = el('main', { className: 'bk bk-build' }, [
    el('header', { className: 'bk-top' }, [
      homeButton(),
      el('h1', { className: 'sr-only', textContent: `Build the ${model.name}` }),
      gate.button,
    ]),
    stage,
    tray,
    status,
    gate.panel,
  ]);
  screen.dataset.layers = String(build.layers.length);
  screen.dataset.model = model.id;
  app.replaceChildren(screen);

  const colorName = (color: number) => model.palette[color - 1];
  const say = (text: string) => (status.textContent = text);

  // --- The tray: every kind the layer still needs ------------------------------------

  function renderTray() {
    screen.dataset.layer = String(build.layer + 1);
    if (finished) return;
    const arrive = build.layer !== shownLayer;
    shownLayer = build.layer;
    tray.replaceChildren(
      ...build.tray().map((kind, i) => {
        const on = held?.key === kind.key;
        const color = colorName(kind.color);
        const button = el(
          'button',
          {
            className: `bk-brick-button${on ? ' held' : ''}${arrive ? ' arrive' : ''}`,
            type: 'button',
            ariaLabel: `${kind.size} ${color} brick, ${kind.count} left`,
            ariaPressed: String(on),
            disabled: !ready,
          },
          // Drawn turned the way its next ghost is, as it comes when picked up.
          [brickIcon(kind, color, fitRotation(kind)), pips(kind.count, color)],
        );
        button.style.setProperty('--i', String(i));
        button.dataset.kind = kind.key;
        button.dataset.count = String(kind.count);
        button.addEventListener('pointerdown', (e) => trayDown(e, kind));
        // A keyboard press (no pointer) picks it up too.
        button.addEventListener('click', (e) => {
          if (e.detail === 0 && ready) pick(kind);
        });
        return button;
      }),
    );
  }

  /** The tray's bricks wiggle: look, here. */
  function nudge() {
    for (const b of tray.querySelectorAll<HTMLElement>('.bk-brick-button')) {
      b.classList.remove('nudge');
      void b.offsetWidth;
      b.classList.add('nudge');
    }
  }

  /** The rotation of the next open ghost of this kind: the brick comes turned to fit it. */
  function fitRotation(kind: TrayKind): Rotation {
    const [slot] = build.openSlots(kind);
    return slot === undefined ? 0 : build.current[slot].rotation;
  }

  function pick(kind: TrayKind | null) {
    const fresh = kind && held?.key !== kind.key;
    held = kind;
    if (kind) {
      rotation = fitRotation(kind);
      view.hold({ size: kind.size, color: kind.color, rotation });
      if (fresh) {
        pickSound();
        haptic('tap');
      }
      say(`Got a ${colorName(kind.color)} brick. Tap where it goes.`);
    } else view.hold(null);
    renderTray();
  }

  // --- Placing ------------------------------------------------------------------------

  /**
   * Where the held brick is over (x, y): the corner on the plate it's at, and the open ghost
   * of its kind it would go in, if one's within reach (`KIDS_RULES`). Null off the plate.
   */
  function targetAt(x: number, y: number) {
    if (!held) return null;
    const corner = view.cornerAt(x, y, held.size, rotation);
    if (!corner) return null;
    return { corner, slot: build.snapTarget(held.size, held.color, rotation, corner.x, corner.z) };
  }

  /** A mouse over the plate carries the brick, and shows it in a ghost it's near. */
  function hover(x: number, y: number) {
    if (!held || !ready || !isOver(view.canvas, x, y)) return view.hideHeld();
    const target = targetAt(x, y);
    if (!target) return view.hideHeld();
    if (target.slot === null) {
      const { x: cx, z: cz } = target.corner;
      return view.moveHeld(cx, cz, held.size, rotation, null);
    }
    const slot = build.current[target.slot];
    // It turns itself to fit the ghost it's over.
    if (slot.rotation !== rotation) {
      rotation = slot.rotation;
      view.hold({ size: held.size, color: held.color, rotation });
    }
    view.moveHeld(slot.position.x, slot.position.z, slot.size, slot.rotation, target.slot);
  }

  function drop(x: number, y: number) {
    if (!held || !ready) return;
    const target = targetAt(x, y);
    if (target?.slot == null) {
      // Not near a ghost of its kind: it hops where it was dropped, and stays in hand.
      if (target) view.bounce(target.corner.x, target.corner.z, held.size, rotation);
      boingSound();
      return;
    }
    const brick = build.current[target.slot];
    // It slides in from where the tap was: the same middle, in the slot's footprint.
    const a = footprint(held.size, rotation);
    const b = footprint(brick.size, brick.rotation);
    place(target.slot, {
      x: target.corner.x + (a.sx - b.sx) / 2,
      z: target.corner.z + (a.sz - b.sz) / 2,
      turned: !isSquare(brick.size) && brick.rotation !== rotation,
    });
  }

  function place(slot: number, from?: { x: number; z: number; turned: boolean }) {
    if (!held) return;
    const layer = build.layer;
    const done = build.place(slot);
    view.placed(layer, slot, from);
    popSound(placedHere++);
    haptic('tap');
    const next = build.tray().find((k) => k.key === held!.key);
    // Keep holding the same kind while there are more of it.
    if (next) pick(next);
    else pick(null);
    if (done) void layerDone(layer);
  }

  async function layerDone(layer: number) {
    ready = false;
    pick(null);
    view.layerDone(layer);
    layerSound();
    haptic('line');
    await pause(reducedMotion() ? 0 : 520);
    if (finished || life.signal.aborted) return;
    if (build.advance()) {
      saveLayer(model.id, build.layer);
      placedHere = 0;
      view.rise();
      view.showGhost(true);
      ready = true;
      renderTray();
      say(`Layer ${build.layer + 1} of ${build.layers.length}.`);
    } else void finish();
  }

  async function finish() {
    finished = true;
    screen.dataset.phase = 'done';
    tray.replaceChildren();
    view.celebrate({ middle: true, hops: 3 });
    builtSound();
    haptic('line');
    say(`You built the ${model.name}!`);
    // Once it's turned a little and the burst has fallen, a picture of it for the shelf.
    await pause(reducedMotion() ? 60 : 2400);
    if (life.signal.aborted) return;
    putOnShelf(model.id, view.snapshot(180));
    tray.replaceChildren(
      el('div', { className: 'bk-end' }, [
        shelf(getShelf(), model.id),
        el('div', { className: 'bk-end-actions' }, [
          el('a', { className: 'bk-big', href: bricksHref(), ariaLabel: 'Home' }, [icon('home')]),
          el(
            'button',
            {
              className: 'bk-big',
              type: 'button',
              ariaLabel: 'Build it again',
              onclick: () => opts.restart(),
            },
            [icon('again')],
          ),
        ]),
      ]),
    );
    screen.dataset.phase = 'shelf';
  }

  // --- Pointers -----------------------------------------------------------------------

  /** A press on the tray's brick: a tap picks it up, a drag carries it to the plate. */
  function trayDown(e: PointerEvent, kind: TrayKind) {
    if (!ready || e.button > 0) return;
    e.preventDefault();
    pick(kind);
    carryFromTray(e, {
      slop: SLOP,
      target: view.canvas,
      hover,
      drop,
      away: () => view.hideHeld(),
      signal: life.signal,
    });
  }

  // On the plate a tap puts the brick in; with nothing in hand, the tray's brick wiggles.
  let press: { id: number; x: number; y: number } | null = null;
  view.canvas.addEventListener('pointerdown', (e) => {
    if (press) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  view.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') hover(e.clientX, e.clientY);
  });
  const canvasUp = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    const tap = Math.hypot(e.clientX - press.x, e.clientY - press.y) <= SLOP * 3;
    press = null;
    if (!tap || !ready || e.type === 'pointercancel') return;
    if (held) drop(e.clientX, e.clientY);
    else {
      nudge();
      boingSound();
    }
  };
  view.canvas.addEventListener('pointerup', canvasUp);
  view.canvas.addEventListener('pointercancel', canvasUp);
  view.canvas.addEventListener('pointerleave', () => view.hideHeld());
  view.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const keydown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'escape') pick(null);
    // On the plate, Enter or Space puts the brick in (its first open ghost).
    else if ((key === 'enter' || key === ' ') && document.activeElement === view.canvas) {
      if (held && ready) place(build.openSlots(held)[0]);
      else nudge();
    }
    // Dev builds: N finishes the layer, for getting to the end quickly.
    else if (import.meta.env.DEV && key === 'n' && ready) {
      const layer = build.layer;
      for (const slot of build.fillLayer()) view.placed(layer, slot);
      void layerDone(layer);
    } else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', keydown);

  // --- Start: the block comes apart ---------------------------------------------------

  screen.dataset.phase = 'pop';
  renderTray();
  view.showBuild(false);
  void view.pop().then(() => {
    if (finished || life.signal.aborted) return;
    ready = true;
    screen.dataset.phase = 'build';
    renderTray();
    say(`Build the ${model.name}. Tap a brick, then tap its ghost.`);
  });

  return () => {
    life.abort();
    window.removeEventListener('keydown', keydown);
    gate.dispose();
    view.dispose();
  };
}

/** A toy from the shelf, built: it turns, hops and bursts again. Tap it for more. */
/** The grown-ups' way to the toy's steps for real bricks. */
const realBricks = (model: BrickModel): GateAction => ({
  label: 'Build it in real bricks',
  run: () => location.assign(bricksHref(`/${model.id}/steps`)),
});

export function renderToyMoment(app: HTMLElement, model: BrickModel): () => void {
  const gate = parentGate([realBricks(model)]);
  // On the top layer with every one under it built, then the top filled too.
  const build = BrickBuild.fromShape(model, Infinity);
  build.fillLayer();
  const view = new BrickView(model, build);
  const stage = el('div', { className: 'bk-stage' }, [view.canvas]);
  view.canvas.ariaLabel = `The ${model.name}, built`;
  const party = () => {
    view.celebrate({ middle: true, hops: 3 });
    builtSound(0);
    haptic('line');
  };
  const screen = el('main', { className: 'bk bk-build bk-moment' }, [
    el('header', { className: 'bk-top' }, [
      homeButton(),
      el('h1', { className: 'sr-only', textContent: `The ${model.name}` }),
      gate.button,
    ]),
    stage,
    el('div', { className: 'bk-tray' }, [
      el('div', { className: 'bk-end-actions' }, [
        el('button', { className: 'bk-big', type: 'button', ariaLabel: 'Again', onclick: party }, [
          icon('again'),
        ]),
        el(
          'a',
          {
            className: 'bk-big',
            href: bricksHref(`/${model.id}`),
            ariaLabel: `Build the ${model.name}`,
          },
          [icon('build')],
        ),
      ]),
    ]),
    gate.panel,
  ]);
  screen.dataset.phase = 'show';
  screen.dataset.model = model.id;
  app.replaceChildren(screen);
  view.canvas.addEventListener('click', party);
  view.showBuild(false);
  const start = window.setTimeout(party, reducedMotion() ? 0 : 250);
  return () => {
    clearTimeout(start);
    gate.dispose();
    view.dispose();
  };
}
