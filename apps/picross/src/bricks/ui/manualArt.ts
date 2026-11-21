/**
 * The real-bricks manual's pictures, drawn flat (no three.js, so the page opens fast and
 * prints): the toy so far from the front left, as the build camera sees it, with each
 * brick's seams and studs; a brick on its own for the parts list; and a layer from above.
 */
import { cellsOf, footprint, type Brick, type BrickSize } from '@picross/block/build/bricks';
import type { BrickModel } from '@picross/block/build/models';
import { token } from '@picross/play-block/ui/tokens';

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
/** A real brick is a little taller than it is wide (9.6 to 8), so the pictures are too. */
const TALL = 1.2;

/**
 * A cube to draw, in the picture's frame: the model turned a quarter so its front and left
 * are the two sides that show (the picture's from the front left, as the build camera is).
 */
interface Cell {
  X: number;
  y: number;
  z: number;
  /** Which brick it's part of, for the seams. */
  brick: number;
  fill: string;
  /** Drawn faded: a layer from an earlier step. */
  faded: boolean;
}

/** A `#rrggbb` token as [r, g, b]. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The color darkened by `k`, then mixed `fade` of the way to the page's background. */
function paint(hex: string, k: number, fade: number, bg: [number, number, number]): string {
  const c = rgb(hex).map((v, i) => Math.round(v * k * (1 - fade) + bg[i] * fade));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

function draw(cells: Cell[], size: { x: number; y: number; z: number }, px: number) {
  const s = px / ((size.x + size.z) * COS + 0.5);
  const h = s * TALL;
  const height = (size.x + size.z) * SIN * s + size.y * h;
  const canvas = document.createElement('canvas');
  const ratio = Math.min(window.devicePixelRatio || 1, 2) * 1.5;
  canvas.width = Math.ceil(px * ratio);
  canvas.height = Math.ceil((height + 4) * ratio);
  canvas.style.width = `${px}px`;
  canvas.style.height = `${height + 4}px`;
  const g = canvas.getContext('2d')!;
  g.scale(ratio, ratio);
  g.translate(size.z * COS * s + 0.25 * s, size.y * h + 3);
  const at = (X: number, y: number, z: number): [number, number] => [
    (X - z) * COS * s,
    (X + z) * SIN * s - y * h,
  ];

  const key = (X: number, y: number, z: number) => `${X},${y},${z}`;
  const map = new Map(cells.map((c) => [key(c.X, c.y, c.z), c]));
  const brickAt = (X: number, y: number, z: number) => map.get(key(X, y, z))?.brick ?? -1;
  const bg = rgb(token('--surface'));
  const sorted = [...cells].sort((a, b) => a.X + a.y + a.z - (b.X + b.y + b.z) || a.y - b.y);

  const face = (pts: [number, number, number][], fill: string) => {
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo : g.moveTo).apply(g, at(...p)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = fill;
    g.lineWidth = 0.6;
    g.stroke();
  };
  const line = (a: [number, number, number], b: [number, number, number]) => {
    g.moveTo(...at(...a));
    g.lineTo(...at(...b));
  };

  for (const c of sorted) {
    const { X, y, z } = c;
    const fade = c.faded ? 0.55 : 0;
    const top = !map.has(key(X, y + 1, z));
    const side = !map.has(key(X + 1, y, z));
    const front = !map.has(key(X, y, z + 1));
    if (top)
      face(
        [
          [X, y + 1, z],
          [X + 1, y + 1, z],
          [X + 1, y + 1, z + 1],
          [X, y + 1, z + 1],
        ],
        paint(c.fill, 1, fade, bg),
      );
    if (side)
      face(
        [
          [X + 1, y, z],
          [X + 1, y + 1, z],
          [X + 1, y + 1, z + 1],
          [X + 1, y, z + 1],
        ],
        paint(c.fill, 0.78, fade, bg),
      );
    if (front)
      face(
        [
          [X, y, z + 1],
          [X + 1, y, z + 1],
          [X + 1, y + 1, z + 1],
          [X, y + 1, z + 1],
        ],
        paint(c.fill, 0.9, fade, bg),
      );

    // Seams: an edge between this brick and another (or the air).
    const other = (dX: number, dz: number) => brickAt(X + dX, y, z + dz) !== c.brick;
    g.beginPath();
    if (top) {
      if (other(0, -1)) line([X, y + 1, z], [X + 1, y + 1, z]);
      if (other(1, 0)) line([X + 1, y + 1, z], [X + 1, y + 1, z + 1]);
      if (other(0, 1)) line([X, y + 1, z + 1], [X + 1, y + 1, z + 1]);
      if (other(-1, 0)) line([X, y + 1, z], [X, y + 1, z + 1]);
    }
    if (side) {
      line([X + 1, y, z], [X + 1, y, z + 1]);
      if (other(0, -1)) line([X + 1, y, z], [X + 1, y + 1, z]);
      if (other(0, 1)) line([X + 1, y, z + 1], [X + 1, y + 1, z + 1]);
    }
    if (front) {
      line([X, y, z + 1], [X + 1, y, z + 1]);
      if (other(-1, 0)) line([X, y, z + 1], [X, y + 1, z + 1]);
      if (other(1, 0)) line([X + 1, y, z + 1], [X + 1, y + 1, z + 1]);
    }
    g.strokeStyle = paint(c.fill, 0.5, fade, bg);
    g.lineWidth = 1;
    g.stroke();

    // A stud on every open top.
    if (top) {
      const [cx, cy] = at(X + 0.5, y + 1, z + 0.5);
      const rx = 0.3 * s * COS * 1.4;
      const ry = 0.3 * s * SIN * 1.4;
      const lift = 0.2 * h;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
      g.lineTo(cx - rx, cy - lift);
      g.ellipse(cx, cy - lift, rx, ry, 0, Math.PI, 0, true);
      g.closePath();
      g.fillStyle = paint(c.fill, 0.8, fade, bg);
      g.fill();
      g.beginPath();
      g.ellipse(cx, cy - lift, rx, ry, 0, 0, Math.PI * 2);
      g.fillStyle = paint(c.fill, 1, fade, bg);
      g.fill();
      g.strokeStyle = paint(c.fill, 0.6, fade, bg);
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
  return canvas;
}

const colorOf = (model: BrickModel, color: number) => token(`--vox-${model.palette[color - 1]}`);

/**
 * The toy as it stands after step `upTo` (0 is the bottom layer): the earlier layers faded,
 * this step's bricks in full color, so the new ones stand out (`fadeBelow` false: all in
 * full color, the toy as built).
 */
export function stepPicture(
  model: BrickModel,
  layers: readonly (readonly Brick[])[],
  upTo: number,
  px: number,
  fadeBelow = true,
): HTMLCanvasElement {
  const { dims } = model;
  const cells: Cell[] = [];
  let id = 0;
  layers.slice(0, upTo + 1).forEach((bricks, layer) => {
    for (const brick of bricks) {
      const fill = colorOf(model, brick.color);
      for (const p of cellsOf(brick)) {
        // A quarter turn: the front (+z) shows on the right, the left (-x) on the left.
        cells.push({
          X: p.z,
          y: p.y,
          z: dims.x - 1 - p.x,
          brick: id,
          fill,
          faded: fadeBelow && layer < upTo,
        });
      }
      id++;
    }
  });
  return draw(cells, { x: dims.z, y: dims.y, z: dims.x }, px);
}

/** One brick on its own, long side left to right, for the parts list. */
export function brickPicture(size: BrickSize, fill: string, px: number): HTMLCanvasElement {
  const { sx, sz } = footprint(size, 90);
  const cells: Cell[] = [];
  for (let x = 0; x < sx; x++)
    for (let z = 0; z < sz; z++) cells.push({ X: x, y: 0, z, brick: 0, fill, faded: false });
  return draw(cells, { x: 4, y: 1, z: 2 }, px);
}

export { colorOf };

const SVG = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/**
 * One layer from above, front at the bottom: the layer under it in outline, then each of
 * this layer's bricks in its color with its studs. `marks` draws some bricks dashed (ones to
 * press on from underneath, or that won't hold).
 */
export function layerPlan(
  model: BrickModel,
  layers: readonly (readonly Brick[])[],
  layer: number,
  marks: { hangs: number[]; loose: number[] },
): SVGSVGElement {
  const { dims } = model;
  const pad = 0.15;
  const root = svg('svg', {
    viewBox: `${-pad} ${-pad} ${dims.x + pad * 2} ${dims.z + pad * 2}`,
    class: 'bk-plan',
    role: 'img',
  });
  // The grid of studs, faint, so it reads as a plate.
  for (let x = 0; x < dims.x; x++)
    for (let z = 0; z < dims.z; z++)
      root.append(svg('circle', { cx: x + 0.5, cy: z + 0.5, r: 0.08, class: 'bk-plan-dot' }));
  for (const brick of layers[layer - 1] ?? []) {
    const { sx, sz } = footprint(brick.size, brick.rotation);
    root.append(
      svg('rect', {
        x: brick.position.x + 0.06,
        y: brick.position.z + 0.06,
        width: sx - 0.12,
        height: sz - 0.12,
        rx: 0.12,
        class: 'bk-plan-under',
      }),
    );
  }
  layers[layer].forEach((brick, slot) => {
    const { sx, sz } = footprint(brick.size, brick.rotation);
    const name = model.palette[brick.color - 1];
    const mark = marks.loose.includes(slot) ? ' loose' : marks.hangs.includes(slot) ? ' hangs' : '';
    const group = svg('g', { class: `bk-plan-brick${mark}` });
    group.style.setProperty('--fill', `var(--vox-${name})`);
    group.append(
      svg('rect', {
        x: brick.position.x + 0.06,
        y: brick.position.z + 0.06,
        width: sx - 0.12,
        height: sz - 0.12,
        rx: 0.12,
      }),
    );
    for (const p of cellsOf(brick))
      group.append(svg('circle', { cx: p.x + 0.5, cy: p.z + 0.5, r: 0.28, class: 'stud' }));
    if (mark === ' loose') {
      const [x0, z0] = [brick.position.x + 0.2, brick.position.z + 0.2];
      const [x1, z1] = [brick.position.x + sx - 0.2, brick.position.z + sz - 0.2];
      group.append(
        svg('path', { d: `M${x0} ${z0}L${x1} ${z1}M${x1} ${z0}L${x0} ${z1}`, class: 'cross' }),
      );
    }
    root.append(group);
  });
  return root;
}
