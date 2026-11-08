import { CanvasTexture, SRGBColorSpace } from 'three';
import { clueFrame, type Clue } from '../../engine/clues';
import { MAX_LINE } from '../../engine/solver';
import { token } from '../tokens';

/**
 * How a cube face looks. Each state has its own texture of every clue, so adding a state
 * (a story power's look, say) never crowds the others.
 *
 * - solid, painted: an ordinary cube and a painted one
 * - lit: a cube on a hinted line
 * - done, painted-done: a finished line's faces, with the clue faded back
 */
export const STATES = ['solid', 'painted', 'lit', 'done', 'painted-done'] as const;
export type FaceState = (typeof STATES)[number];

const NUMBERS = MAX_LINE + 1;
/** Faces per texture: a blank one for a hidden clue, then each frame's numbers. */
const CELLS = 1 + 3 * NUMBERS;
const COLS = Math.ceil(Math.sqrt(CELLS));
const ROWS = Math.ceil(CELLS / COLS);
const SIZE = 128;
const FRAMES = { plain: 0, circle: 1, square: 2 };

interface Look {
  bg: string;
  ink: string;
  /** The clue's opacity: finished lines fade back. */
  alpha: number;
}

function look(state: FaceState): Look {
  const painted = state === 'painted' || state === 'painted-done';
  return {
    bg: painted ? token('--cube-painted') : state === 'lit' ? token('--cube-lit') : token('--cube'),
    ink: painted ? token('--accent-ink') : token('--ink'),
    alpha: state === 'done' || state === 'painted-done' ? 0.32 : 1,
  };
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
  if (!clue) return;
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
  for (const pieces of [1, 2, 3] as const) {
    for (let count = 0; count < NUMBERS; count++) draw({ count, pieces });
  }
  const tex = texture ?? new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
