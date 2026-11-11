import { CanvasTexture, SRGBColorSpace } from 'three';
import { clueFrame, type Clue } from '@picross/block/engine/clues';
import { MAX_LINE } from '@picross/block/engine/solver';
import { token } from '../tokens';

/**
 * How a cube face looks. Each state has its own texture of every clue, so adding a state
 * (a story power's look, say) never crowds the others.
 *
 * - solid, painted: an ordinary cube and a painted one
 * - lit: a cube on a hinted line
 * - done, painted-done: a finished line's faces, with the clue faded back
 * - fog: a fogged line's face, clue hidden under cloud
 * - target, suspect, honest: armor's target lines, forged-clue suspects, cleared suspects
 * - ink: a face splashed with ink (its clue and paint hidden)
 * - live: the charge's live line; swapped: a layer the Mimic just wiped
 * - dirt: a dig's earth
 */
export const STATES = [
  'solid',
  'painted',
  'lit',
  'done',
  'painted-done',
  // Story fights (src/ui/screens/story/fight.ts):
  'fog',
  'target',
  'suspect',
  'honest',
  'ink',
  'live',
  'swapped',
  'dirt',
] as const;
export type FaceState = (typeof STATES)[number];

const NUMBERS = MAX_LINE + 1;
/** Faces per texture: a blank one for a hidden clue, then each frame's numbers. */
const CELLS = 1 + 4 * NUMBERS;
const COLS = Math.ceil(Math.sqrt(CELLS));
const ROWS = Math.ceil(CELLS / COLS);
const SIZE = 128;
const FRAMES = { plain: 0, circle: 1, square: 2, scrambled: 3 };

interface Look {
  bg: string;
  ink: string;
  /** The clue's opacity: finished lines fade back; fog and ink hide it. */
  alpha: number;
  /** A small mark in the corner, for marked lines. */
  mark?: string;
}

function look(state: FaceState): Look {
  const base = { bg: token('--cube'), ink: token('--ink'), alpha: 1 };
  switch (state) {
    case 'painted':
      return { bg: token('--cube-painted'), ink: token('--accent-ink'), alpha: 1 };
    case 'painted-done':
      return { bg: token('--cube-painted'), ink: token('--accent-ink'), alpha: 0.32 };
    case 'lit':
      return { ...base, bg: token('--cube-lit') };
    case 'done':
      return { ...base, alpha: 0.32 };
    case 'fog':
      return { bg: token('--backdrop'), ink: token('--muted'), alpha: 0, mark: '~' };
    case 'target':
      return { ...base, bg: token('--hl'), mark: '◎' };
    case 'suspect':
      return { ...base, mark: '?' };
    case 'honest':
      return { ...base, bg: token('--hl'), mark: '✓' };
    case 'ink':
      return { bg: token('--squid-ink'), ink: token('--squid-ink'), alpha: 0 };
    case 'live':
      return { ...base, bg: token('--spark') };
    case 'swapped':
      return { ...base, bg: token('--mischief'), ink: token('--accent-ink') };
    case 'dirt':
      return { bg: token('--dirt'), ink: token('--dug'), alpha: 1 };
    default:
      return base;
  }
}

const slot = (clue: Clue | null) => (clue ? 1 + FRAMES[clueFrame(clue)] * NUMBERS + clue.count : 0);

/** The texture rectangle for a face's clue: u0, v0 (bottom left), u1, v1 (top right). */
export function faceUV(clue: Clue | null): [number, number, number, number] {
  const s = slot(clue);
  const col = s % COLS;
  const row = Math.floor(s / COLS);
  // Half a texel in, so neighbouring faces never bleed in.
  const eu = 0.5 / (COLS * SIZE);
  const ev = 0.5 / (ROWS * SIZE);
  return [col / COLS + eu, 1 - (row + 1) / ROWS + ev, (col + 1) / COLS - eu, 1 - row / ROWS - ev];
}

function drawFace(g: CanvasRenderingContext2D, x: number, y: number, l: Look, clue: Clue | null) {
  g.fillStyle = l.bg;
  g.fillRect(x, y, SIZE, SIZE);
  g.strokeStyle = token('--cube-edge');
  g.lineWidth = 6;
  g.strokeRect(x + 3, y + 3, SIZE - 6, SIZE - 6);
  if (l.mark) {
    g.globalAlpha = 1;
    g.fillStyle = l.ink === l.bg ? token('--ink') : l.ink;
    g.font = '700 30px Rubik, system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(l.mark, x + 12, y + 8);
  }
  if (!clue || l.alpha === 0) return;
  const cx = x + SIZE / 2;
  const cy = y + SIZE / 2;
  g.globalAlpha = l.alpha;
  g.fillStyle = l.ink;
  g.strokeStyle = l.ink;
  g.font = `700 ${clue.count >= 10 ? 52 : 64}px Rubik, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(clue.count), cx, cy + 3);
  g.lineWidth = 7;
  const frame = clueFrame(clue);
  if (frame === 'circle') {
    g.beginPath();
    g.arc(cx, cy, 40, 0, Math.PI * 2);
    g.stroke();
  } else if (frame === 'square') {
    g.strokeRect(cx - 38, cy - 38, 76, 76);
  } else if (frame === 'scrambled') {
    // A broken ring: the count is right, the pieces are anyone's guess.
    g.setLineDash([10, 9]);
    g.beginPath();
    g.arc(cx, cy, 40, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  g.globalAlpha = 1;
}

/** Draws one state's texture of every clue face. Call again when the theme changes. */
export function drawAtlas(state: FaceState, texture?: CanvasTexture): CanvasTexture {
  const canvas = (texture?.image as HTMLCanvasElement) ?? document.createElement('canvas');
  canvas.width = COLS * SIZE;
  canvas.height = ROWS * SIZE;
  const g = canvas.getContext('2d')!;
  const l = look(state);
  const draw = (clue: Clue | null) => {
    const s = slot(clue);
    drawFace(g, (s % COLS) * SIZE, Math.floor(s / COLS) * SIZE, l, clue);
  };
  draw(null);
  for (const pieces of [1, 2, 3, null] as const) {
    for (let count = 0; count < NUMBERS; count++) draw({ count, pieces });
  }
  const tex = texture ?? new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
