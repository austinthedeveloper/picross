import '../../styles/build.css';
import { footprint, type Rotation } from '@picross/block/build/bricks';
import { kindKey, type BrickBuild, type TrayKind } from '@picross/block/build/build';
import type { Puzzle } from '@picross/block/puzzles/format';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { createMuteButton } from '@picross/shared/ui/components/muteButton';
import { el } from '@picross/shared/ui/dom';
import { haptic } from '@picross/shared/ui/haptics';
import { pause, reducedMotion } from '@picross/shared/ui/motion';
import { playSound } from '@picross/shared/ui/sound';
import { BrickView } from '../board/brickView';
import { shapePicture } from '../board/thumbnail';
import { token } from '../tokens';

/** A 2D picture: the trio's first stage, drawn at the end beside the other two. */
export interface FlatPicture {
  width: number;
  height: number;
  cells: readonly boolean[];
}

export interface BuildOptions {
  puzzle: Puzzle;
  build: BrickBuild;
  /** The same subject's 2D picture, for the end (drawn, carved, built). */
  flat?: FlatPicture;
  /** The top bar's back link. Default: Home. */
  back?: HTMLElement;
  /** Where Home leads. Default: `#/`. */
  home?: string;
  /** "Build again": draws the screen afresh. */
  again?(): void;
}

/** How far a press moves before it's a drag (turning the view, or carrying a brick). */
const SLOP = 8;
const TURN_SPEED = 0.008;

/**
 * The build: the solved block comes apart into bricks, and the player puts it back
 * together, one layer at a time. Each layer shows as a ghost; the tray holds its bricks.
 * Pick one up (tap it, or drag it out), turn it with R or the Turn button, and drop it near
 * a ghost of its size and color, turned the same way: it snaps in. A wrong drop hops back.
 * Returns a cleanup for the router.
 */
export function renderBuildScreen(root: HTMLElement, opts: BuildOptions): () => void {
  const { puzzle, build } = opts;
  const view = new BrickView(puzzle, build);
  if (import.meta.env.DEV) Object.assign(window, { __build: build, __brickView: view });

  let held: TrayKind | null = null;
  let rotation: Rotation = 0;
  let ready = false;
  let finished = false;

  const title = el('h1', { textContent: `Build the ${puzzle.name}` });
  const counter = el('span', { className: 'size build-counter', ariaLive: 'polite' });
  const coach = el('p', { className: 'build-coach', ariaLive: 'polite' });
  const tray = el('div', { className: 'build-tray', role: 'group', ariaLabel: 'Bricks' });
  const turn = el(
    'button',
    {
      className: 'build-turn',
      title: 'Turn the brick (R)',
      onclick: () => rotate(),
    },
    [el('span', { textContent: '⟳', ariaHidden: 'true' }), 'Turn brick'],
  );
  const resetView = el('button', {
    textContent: 'Reset view',
    title: 'Back to the three-quarter view',
    onclick: () => {
      view.yaw = -0.62;
      view.pitch = 0.58;
      view.setZoom(1);
    },
  });
  // The end lies over the bottom of the stage, so the toy keeps turning above it.
  const panel = el('div', { className: 'build-end', hidden: true });
  const status = el('p', { className: 'sr-only', role: 'status' });
  const stage = el('div', { className: 'stage build-stage' }, [view.canvas, panel]);
  view.canvas.tabIndex = 0;
  view.canvas.ariaLabel = `Build plate for the ${puzzle.name}`;

  const screen = el('div', { className: 'screen game build' }, [
    el('header', { className: 'topbar' }, [
      opts.back ?? homeLink(opts.home),
      title,
      counter,
      createMuteButton(true),
    ]),
    coach,
    stage,
    el('div', { className: 'build-bar' }, [
      tray,
      el('div', { className: 'build-tools' }, [turn, resetView]),
    ]),
    el('p', {
      className: 'help',
      textContent:
        'Tap a brick, then tap where it goes, or drag it there. Drag the plate to look around; scroll to zoom.',
    }),
    el('p', {
      className: 'help keyboard',
      textContent: 'Keys: R turns the brick, Esc puts it back.',
    }),
    status,
  ]);
  screen.dataset.layers = String(build.layers.length);
  root.replaceChildren(screen);

  const say = (text: string) => {
    coach.textContent = text;
    status.textContent = text;
  };

  // --- The tray ------------------------------------------------------------------------

  const colorName = (color: number) => puzzle.palette[color - 1];

  /** A brick seen from above: its footprint, studs and color. */
  function brickIcon(kind: { size: TrayKind['size']; color: number }, rot: Rotation) {
    const { sx, sz } = footprint(kind.size, rot);
    const icon = el('span', { className: 'brick-icon', ariaHidden: 'true' });
    icon.style.setProperty('--brick', `var(--vox-${colorName(kind.color)})`);
    icon.style.setProperty('--sx', String(sx));
    icon.style.setProperty('--sz', String(sz));
    return icon;
  }

  function renderTray() {
    const kinds = build.tray();
    tray.replaceChildren(
      ...kinds.map((kind) => {
        const on = held?.key === kind.key;
        const button = el(
          'button',
          {
            className: `brick-kind${on ? ' held' : ''}`,
            ariaLabel: `${kind.size} ${colorName(kind.color)} brick, ${kind.count} left`,
            ariaPressed: String(on),
            disabled: !ready,
          },
          [
            brickIcon(kind, on ? rotation : 0),
            el('span', { className: 'brick-count', textContent: `×${kind.count}` }),
          ],
        );
        button.dataset.kind = kind.key;
        button.addEventListener('pointerdown', (e) => trayDown(e, kind));
        button.addEventListener('click', (e) => e.preventDefault());
        return button;
      }),
    );
    turn.disabled = !held || held.size === '1x1' || held.size === '2x2';
    counter.textContent = finished
      ? 'Built!'
      : `Layer ${build.layer + 1} of ${build.layers.length}`;
    screen.dataset.layer = String(build.layer + 1);
  }

  /** Picks up a brick of this kind, turned the way one of its open slots is. */
  function pick(kind: TrayKind | null) {
    held = kind;
    if (kind) {
      const open = build.current.find(
        (b, i) => kindKey(b) === kind.key && !build.isFilled(build.layer, i),
      );
      rotation = open?.rotation ?? 0;
      view.hold({ size: kind.size, color: kind.color, rotation });
      say(`Got a ${kind.size} ${colorName(kind.color)}. Put it in a ghost that matches.`);
    } else {
      view.hold(null);
    }
    renderTray();
  }

  function rotate() {
    if (!held || held.size === '1x1' || held.size === '2x2') return;
    rotation = rotation === 0 ? 90 : 0;
    view.hold({ size: held.size, color: held.color, rotation });
    playSound('tool');
    renderTray();
    if (lastPointer) hover(lastPointer.x, lastPointer.y);
  }

  // --- Carrying and dropping -----------------------------------------------------------

  let lastPointer: { x: number; y: number } | null = null;

  const overCanvas = (x: number, y: number) => {
    const r = view.canvas.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  /** Shows the held brick under the pointer: in a slot when one's near, else hovering. */
  function hover(x: number, y: number) {
    lastPointer = { x, y };
    if (!held || !overCanvas(x, y)) return view.hideHeld();
    const corner = view.cornerAt(x, y, held.size, rotation);
    if (!corner) return view.hideHeld();
    const slot = build.snapTarget(held.size, held.color, rotation, corner.x, corner.z);
    const at = slot === null ? corner : build.current[slot].position;
    view.moveHeld(at.x, at.z, held.size, rotation, slot !== null);
  }

  function drop(x: number, y: number) {
    if (!held || !ready) return;
    const corner = view.cornerAt(x, y, held.size, rotation);
    if (!corner) return;
    const slot = build.snapTarget(held.size, held.color, rotation, corner.x, corner.z);
    if (slot === null) {
      view.bounce(corner.x, corner.z, held.size, rotation);
      playSound('mark');
      const other = build.snapTarget(
        held.size,
        held.color,
        rotation === 0 ? 90 : 0,
        corner.x,
        corner.z,
      );
      say(
        other !== null
          ? 'Nearly! Turn it first (R, or Turn brick).'
          : "Not there. Look for the brighter ghost, it's this brick's shape.",
      );
      return;
    }
    const layer = build.layer;
    const done = build.place(slot);
    view.placed(layer, slot);
    playSound('fill');
    haptic('tap');
    const left = build.tray().find((k) => k.key === held!.key);
    // Keep holding the same kind while there are more of it: put them in one after another.
    if (left) held = left;
    else pick(null);
    renderTray();
    if (done) void layerDone(layer);
    else say(`${plural(remaining(), 'brick')} to go on this layer.`);
  }

  const remaining = () => build.tray().reduce((n, k) => n + k.count, 0);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  async function layerDone(layer: number) {
    ready = false;
    pick(null);
    view.layerDone(layer);
    playSound('line');
    haptic('line');
    await pause(380);
    if (build.advance()) {
      view.rise();
      view.showGhost(true);
      ready = true;
      renderTray();
      say(`Layer ${build.layer + 1} of ${build.layers.length}.`);
    } else {
      void finish();
    }
  }

  async function finish() {
    finished = true;
    screen.dataset.phase = 'done';
    renderTray();
    tray.replaceChildren();
    turn.disabled = true;
    view.celebrate();
    playSound('solve', 0.05);
    haptic('line');
    say(`Built! The ${puzzle.name}, in bricks.`);
    // Once the camera's settled and the burst has fallen, for the picture of the toy.
    await pause(2200);
    const built = el('img', { className: 'trio-built', alt: `The ${puzzle.name} in bricks` });
    built.src = view.snapshot();
    const card = (picture: HTMLElement, label: string) =>
      el('figure', { className: 'trio-card' }, [picture, el('figcaption', { textContent: label })]);
    panel.replaceChildren(
      el('h2', {}, [
        'Built! ',
        el('span', {
          className: 'end-note',
          textContent: `One ${puzzle.name.toLowerCase()}, three ways.`,
        }),
      ]),
      el('div', { className: 'trio' }, [
        ...(opts.flat ? [card(flatPicture(opts.flat, 52), 'Drawn')] : []),
        card(shapePicture(puzzle, 64), 'Carved'),
        card(built, 'Built'),
      ]),
      el('div', { className: 'end-actions' }, [
        el('a', { className: 'button ghost', href: opts.home ?? '#/', textContent: 'Home' }),
        ...(opts.again
          ? [
              el('button', {
                className: 'button primary',
                textContent: 'Build again',
                onclick: opts.again,
              }),
            ]
          : []),
      ]),
    );
    panel.hidden = false;
    stage.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  // --- Pointers ------------------------------------------------------------------------

  /** A press that started on a tray brick: a tap picks it up, a drag carries it out. */
  function trayDown(e: PointerEvent, kind: TrayKind) {
    if (!ready || e.button > 0) return;
    e.preventDefault();
    if (held?.key !== kind.key) pick(kind);
    const start = { x: e.clientX, y: e.clientY };
    let dragging = false;
    const move = (m: PointerEvent) => {
      if (m.pointerId !== e.pointerId) return;
      if (!dragging && Math.hypot(m.clientX - start.x, m.clientY - start.y) > SLOP) dragging = true;
      if (dragging) hover(m.clientX, m.clientY);
    };
    const up = (u: PointerEvent) => {
      if (u.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (dragging && overCanvas(u.clientX, u.clientY)) drop(u.clientX, u.clientY);
      else view.hideHeld();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  // On the plate: a drag turns the view; a tap drops the held brick there.
  let press: {
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    turning: boolean;
  } | null = null;
  const canvasDown = (e: PointerEvent) => {
    if (press) return;
    view.canvas.setPointerCapture(e.pointerId);
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      turning: e.button > 0,
    };
  };
  const canvasMove = (e: PointerEvent) => {
    if (!press) {
      if (e.pointerType === 'mouse') hover(e.clientX, e.clientY);
      return;
    }
    if (e.pointerId !== press.id) return;
    if (!press.turning && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP)
      press.turning = true;
    if (press.turning) {
      view.orbit(-(e.clientX - press.lastX) * TURN_SPEED, (e.clientY - press.lastY) * TURN_SPEED);
    }
    press.lastX = e.clientX;
    press.lastY = e.clientY;
    if (e.pointerType === 'mouse' && !press.turning) hover(e.clientX, e.clientY);
  };
  const canvasUp = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    const tapped = !press.turning;
    press = null;
    if (tapped && held) {
      hover(e.clientX, e.clientY);
      drop(e.clientX, e.clientY);
    }
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    view.setZoom(view.zoom * Math.exp(-e.deltaY * 0.0015));
  };
  const leave = () => view.hideHeld();
  const menu = (e: Event) => e.preventDefault();
  view.canvas.addEventListener('pointerdown', canvasDown);
  view.canvas.addEventListener('pointermove', canvasMove);
  view.canvas.addEventListener('pointerup', canvasUp);
  view.canvas.addEventListener('pointercancel', canvasUp);
  view.canvas.addEventListener('pointerleave', leave);
  view.canvas.addEventListener('wheel', wheel, { passive: false });
  view.canvas.addEventListener('contextmenu', menu);

  const keydown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'r') rotate();
    else if (key === 'escape') pick(null);
    // Dev builds: N finishes the layer, for getting to the end quickly.
    else if (import.meta.env.DEV && key === 'n' && ready) {
      const layer = build.layer;
      for (const slot of build.fillLayer()) view.placed(layer, slot);
      void layerDone(layer);
    } else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', keydown);

  // --- Start: the block comes apart ----------------------------------------------------

  screen.dataset.phase = 'pop';
  renderTray();
  say('It comes apart…');
  view.showBuild(false);
  void view.pop().then(() => {
    if (finished) return;
    ready = true;
    screen.dataset.phase = 'build';
    renderTray();
    say(
      build.layer
        ? `Layer ${build.layer + 1} of ${build.layers.length}. Pick a brick from the tray.`
        : 'Now build it back up, from the bottom. Pick a brick from the tray.',
    );
  });

  return () => {
    window.removeEventListener('keydown', keydown);
    view.dispose();
  };
}

/** A 2D picture drawn in ink, `px` wide. */
function flatPicture(p: FlatPicture, px: number): HTMLCanvasElement {
  const cell = Math.max(1, Math.floor(px / Math.max(p.width, p.height)));
  const canvas = document.createElement('canvas');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = p.width * cell * ratio;
  canvas.height = p.height * cell * ratio;
  canvas.style.width = `${p.width * cell}px`;
  canvas.style.height = `${p.height * cell}px`;
  canvas.className = 'trio-flat';
  const g = canvas.getContext('2d')!;
  g.scale(ratio, ratio);
  g.fillStyle = token('--ink');
  p.cells.forEach((on, i) => {
    if (on) g.fillRect((i % p.width) * cell, Math.floor(i / p.width) * cell, cell, cell);
  });
  return canvas;
}
