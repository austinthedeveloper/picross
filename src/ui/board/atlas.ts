import { CanvasTexture, SRGBColorSpace } from 'three';
import { clueFrame, type Clue } from '../../engine/clues';
import { MAX_LINE } from '../../engine/solver';
import { token } from '../tokens';

/** How a cube face looks: an ordinary cube, a painted one, or one on a lit (hinted) line. */
export type FaceState = 'solid' | 'painted' | 'lit';
const STATES: FaceState[] = ['solid', 'painted', 'lit'];

const NUMBERS = MAX_LINE + 1;
/** Faces per state: a blank one for a hidden clue, then each frame's numbers. */
const PER_STATE = 1 + 3 * NUMBERS;
const COLS = 16;
const ROWS = Math.ceil((STATES.length * PER_STATE) / COLS);
const SIZE = 128;

const FRAMES = { plain: 0, circle: 1, square: 2 };

function slot(state: FaceState, clue: Clue | null): number {
  const k = clue ? 1 + FRAMES[clueFrame(clue)] * NUMBERS + clue.count : 0;
  return STATES.indexOf(state) * PER_STATE + k;
}

/** The texture rectangle for a face: u0, v0 (bottom left), u1, v1 (top right). */
export function faceUV(state: FaceState, clue: Clue | null): [number, number, number, number] {
  const s = slot(state, clue);
  const col = s % COLS;
  const row = Math.floor(s / COLS);
  // Half a texel in, so neighbouring faces never bleed in.
  const eu = 0.5 / (COLS * SIZE);
  const ev = 0.5 / (ROWS * SIZE);
  return [col / COLS + eu, 1 - (row + 1) / ROWS + ev, (col + 1) / COLS - eu, 1 - row / ROWS - ev];
}

function drawFace(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: FaceState,
  clue: Clue | null,
) {
  const bg = { solid: token('--cube'), painted: token('--cube-painted'), lit: token('--cube-lit') };
  const ink = state === 'painted' ? token('--accent-ink') : token('--ink');
  g.fillStyle = bg[state];
  g.fillRect(x, y, SIZE, SIZE);
  g.strokeStyle = token('--cube-edge');
  g.lineWidth = 6;
  g.strokeRect(x + 3, y + 3, SIZE - 6, SIZE - 6);
  if (!clue) return;
  const cx = x + SIZE / 2;
  const cy = y + SIZE / 2;
  g.fillStyle = ink;
  g.strokeStyle = ink;
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
}

/** Draws every face onto one canvas texture. Call again when the theme changes. */
export function drawAtlas(texture?: CanvasTexture): CanvasTexture {
  const canvas = (texture?.image as HTMLCanvasElement) ?? document.createElement('canvas');
  canvas.width = COLS * SIZE;
  canvas.height = ROWS * SIZE;
  const g = canvas.getContext('2d')!;
  STATES.forEach((state) => {
    const draw = (clue: Clue | null) => {
      const s = slot(state, clue);
      drawFace(g, (s % COLS) * SIZE, Math.floor(s / COLS) * SIZE, state, clue);
    };
    draw(null);
    for (const pieces of [1, 2, 3] as const) {
      for (let count = 0; count < NUMBERS; count++) draw({ count, pieces });
    }
  });
  const tex = texture ?? new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
