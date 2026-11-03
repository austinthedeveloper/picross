import { getSettings } from '../game/settings';

export type Sound =
  'fill' | 'mark' | 'erase' | 'error' | 'line' | 'solve' | 'hint' | 'strike' | 'finisher' | 'blip';

interface Note {
  freq: number;
  /** Start offset in seconds. */
  at?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<Sound, Note[]> = {
  fill: [{ freq: 520, duration: 0.05, type: 'triangle', gain: 0.18 }],
  mark: [{ freq: 330, duration: 0.04, type: 'triangle', gain: 0.12 }],
  erase: [{ freq: 260, duration: 0.04, type: 'sine', gain: 0.1 }],
  error: [
    { freq: 160, duration: 0.18, type: 'square', gain: 0.08 },
    { freq: 120, at: 0.08, duration: 0.2, type: 'square', gain: 0.08 },
  ],
  line: [
    { freq: 660, duration: 0.07, type: 'sine', gain: 0.15 },
    { freq: 880, at: 0.06, duration: 0.1, type: 'sine', gain: 0.15 },
  ],
  strike: [
    { freq: 220, duration: 0.06, type: 'square', gain: 0.1 },
    { freq: 140, at: 0.03, duration: 0.08, type: 'triangle', gain: 0.15 },
  ],
  finisher: [
    { freq: 900, duration: 0.12, type: 'sawtooth', gain: 0.06 },
    { freq: 300, at: 0.08, duration: 0.1, type: 'sawtooth', gain: 0.06 },
    { freq: 90, at: 0.12, duration: 0.4, type: 'square', gain: 0.14 },
  ],
  blip: [{ freq: 880, duration: 0.03, type: 'square', gain: 0.04 }],
  hint: [
    { freq: 740, duration: 0.08, type: 'sine', gain: 0.12 },
    { freq: 990, at: 0.08, duration: 0.12, type: 'sine', gain: 0.1 },
  ],
  solve: [523, 659, 784, 1047].map((freq, i) => ({
    freq,
    at: i * 0.11,
    duration: i === 3 ? 0.45 : 0.14,
    type: 'triangle' as const,
    gain: 0.18,
  })),
};

let ctx: AudioContext | null = null;

/** Plays a short synthesized sound unless muted. */
export function playSound(sound: Sound): void {
  if (getSettings().muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const note of SOUNDS[sound]) {
      const start = now + (note.at ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? 'sine';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(note.gain ?? 0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.duration + 0.02);
    }
  } catch {
    // Audio unavailable; play silently.
  }
}
