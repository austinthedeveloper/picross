import { pointOf, type Dims } from '../../engine/volume';
import type { Puzzle } from '../../puzzles/format';
import { token } from '../tokens';

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

/** Screen position of a block corner in an isometric view from the front right, above. */
const iso = (x: number, y: number, z: number, s: number): [number, number] => [
  (x - z) * COS * s,
  ((x + z) * SIN - y) * s,
];

/** A token color (#rrggbb) darkened by `k`. */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * k);
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`;
}

function frame(d: Dims, px: number) {
  const s = px / ((d.x + d.z) * COS + 0.5);
  const height = ((d.x + d.z) * SIN + d.y) * s;
  const canvas = document.createElement('canvas');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(px * ratio);
  canvas.height = Math.ceil((height + 2) * ratio);
  canvas.style.width = `${px}px`;
  canvas.style.height = `${height + 2}px`;
  const g = canvas.getContext('2d')!;
  g.scale(ratio, ratio);
  // Origin at the left corner of the block's top-back edge line.
  g.translate(d.z * COS * s + 0.25 * s, d.y * s + 1);
  return { canvas, g, s };
}

/**
 * The solved shape as a small isometric picture, in its colors. `only` limits it to some
 * cubes (a diorama's placed pieces).
 */
export function shapePicture(
  puzzle: Puzzle,
  px = 96,
  only?: (cell: number) => boolean,
): HTMLCanvasElement {
  const { dims, palette } = puzzle;
  const solution = only ? puzzle.solution.map((c, i) => (only(i) ? c : 0)) : puzzle.solution;
  const { canvas, g, s } = frame(dims, px);
  const colors = palette.map((name) => token(`--vox-${name}`));
  const cubes = [...solution.keys()]
    .filter((i) => solution[i])
    .map((i) => ({ i, ...pointOf(dims, i) }));
  // Back to front, bottom to top: each cube covers the ones drawn before it.
  cubes.sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.y - b.y);
  const at = new Set(cubes.map((c) => c.i));
  const filled = (x: number, y: number, z: number) =>
    x < dims.x && y < dims.y && z < dims.z && at.has(x + dims.x * (z + dims.z * y));
  const quad = (pts: [number, number, number][], fill: string) => {
    g.beginPath();
    pts.forEach(([x, y, z], k) => (k ? g.lineTo : g.moveTo).apply(g, iso(x, y, z, s)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = fill;
    g.lineWidth = 0.6;
    g.stroke();
  };
  for (const { i, x, y, z } of cubes) {
    const base = colors[solution[i] - 1];
    if (!filled(x, y + 1, z))
      quad(
        [
          [x, y + 1, z],
          [x + 1, y + 1, z],
          [x + 1, y + 1, z + 1],
          [x, y + 1, z + 1],
        ],
        base,
      );
    if (!filled(x + 1, y, z))
      quad(
        [
          [x + 1, y, z],
          [x + 1, y + 1, z],
          [x + 1, y + 1, z + 1],
          [x + 1, y, z + 1],
        ],
        shade(base, 0.78),
      );
    if (!filled(x, y, z + 1))
      quad(
        [
          [x, y, z + 1],
          [x + 1, y, z + 1],
          [x + 1, y + 1, z + 1],
          [x, y + 1, z + 1],
        ],
        shade(base, 0.9),
      );
  }
  return canvas;
}

/** An unsolved puzzle: the outline of its block, so you can see its size and shape. */
export function blockOutline(dims: Dims, px = 96): HTMLCanvasElement {
  const { canvas, g, s } = frame(dims, px);
  const { x: X, y: Y, z: Z } = dims;
  const face = (pts: [number, number, number][]) => {
    g.beginPath();
    pts.forEach(([x, y, z], k) => (k ? g.lineTo : g.moveTo).apply(g, iso(x, y, z, s)));
    g.closePath();
    g.fill();
    g.stroke();
  };
  g.fillStyle = token('--cube');
  g.strokeStyle = token('--line');
  g.lineWidth = 1.5;
  face([
    [0, Y, 0],
    [X, Y, 0],
    [X, Y, Z],
    [0, Y, Z],
  ]);
  face([
    [X, 0, 0],
    [X, Y, 0],
    [X, Y, Z],
    [X, 0, Z],
  ]);
  face([
    [0, 0, Z],
    [X, 0, Z],
    [X, Y, Z],
    [0, Y, Z],
  ]);
  return canvas;
}
