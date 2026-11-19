/**
 * The bricks route's own sounds: nothing in it buzzes. A brick pops as it lands, a note
 * higher each time through a layer; a finished layer plays a little tune, and the toy a
 * longer one. A tap that can't go anywhere is a soft boing. Muted with the app's sound.
 */
import { playNotes, type Note } from '@picross/shared/ui/sound';

/** A major pentatonic from C5: any run of these sounds happy. */
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

const note = (i: number) => SCALE[Math.min(SCALE.length - 1, Math.max(0, i))];

/** Picking up a brick: a little lift. */
export const pickSound = () =>
  playNotes([{ freq: 440, to: 660, duration: 0.08, type: 'sine', gain: 0.1 }]);

/** The `n`th brick of a layer lands (0 first): a pop, a step up the scale each time. */
export function popSound(n: number): void {
  const f = note(n);
  playNotes([
    { freq: f * 1.5, to: f, duration: 0.09, type: 'sine', gain: 0.2 },
    { freq: f * 2, at: 0.01, duration: 0.05, type: 'triangle', gain: 0.05 },
  ]);
}

/** Nowhere to go (or nothing in hand): a soft boing, never a buzz. */
export const boingSound = () =>
  playNotes([{ freq: 330, to: 150, duration: 0.32, type: 'sine', gain: 0.12 }]);

const tune = (steps: number[], gap: number, last: number): Note[] =>
  steps.map((s, i) => ({
    freq: note(s),
    at: i * gap,
    duration: i === steps.length - 1 ? last : gap * 1.3,
    type: 'triangle',
    gain: 0.16,
  }));

/** A layer's done. */
export const layerSound = (delay = 0.12) => playNotes(tune([2, 4, 5], 0.09, 0.22), delay);

/** The toy's done (and its moment on the shelf, again). */
export const builtSound = (delay = 0.1) => playNotes(tune([0, 2, 4, 3, 5, 7, 9], 0.12, 0.6), delay);
