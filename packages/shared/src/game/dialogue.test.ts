import { describe, expect, it } from 'vitest';
import { parseScene } from '../puzzles/scenes';
import {
  advance,
  check,
  choose,
  currentStep,
  emptyStage,
  speakOnStage,
  startDialogue,
} from './dialogue';

const scene = parseScene({
  id: 't',
  cast: { pip: { name: 'Pip', portrait: 'P' } },
  nodes: {
    start: {
      lines: [
        { text: 'Narration.' },
        { who: 'pip', text: 'Only if won.', if: 'won' },
        { who: 'pip', text: 'Only if lost.', if: '!won' },
      ],
      choices: [
        { text: 'Left', next: 'left', set: { went_left: true } },
        { text: 'Secret', next: 'left', if: 'won' },
        { text: 'Leave' },
      ],
    },
    left: { lines: [{ text: 'Went left.', if: 'went_left' }], next: 'outro' },
    outro: { lines: [{ text: 'The end.' }] },
  },
});

const texts = (flags = {}) => {
  let state = startDialogue(scene, flags);
  const seen: string[] = [];
  for (
    let step = currentStep(scene, state);
    step.kind === 'line';
    step = currentStep(scene, state)
  ) {
    seen.push(step.text);
    state = advance(scene, state);
  }
  return { state, seen };
};

describe('dialogue', () => {
  it('evaluates conditions', () => {
    expect(check('won', { won: true })).toBe(true);
    expect(check('!won', {})).toBe(true);
    expect(check(undefined, {})).toBe(true);
  });

  it('skips lines whose condition fails', () => {
    expect(texts({ won: true }).seen).toEqual(['Narration.', 'Only if won.']);
    expect(texts().seen).toEqual(['Narration.', 'Only if lost.']);
  });

  it('shows the speaker', () => {
    let state = startDialogue(scene, { won: true });
    state = advance(scene, state);
    expect(currentStep(scene, state)).toMatchObject({
      kind: 'line',
      speaker: { id: 'pip', name: 'Pip' },
    });
  });

  it('offers only visible choices', () => {
    const lost = currentStep(scene, texts().state);
    expect(lost).toEqual({
      kind: 'choices',
      choices: [
        { text: 'Left', index: 0 },
        { text: 'Leave', index: 2 },
      ],
    });
    const atChoices = texts().state;
    expect(choose(scene, atChoices, 1)).toBe(atChoices); // hidden choice ignored
  });

  it('follows choices, sets flags, and flows through next to the end', () => {
    let state = choose(scene, texts().state, 0);
    expect(state.flags.went_left).toBe(true);
    expect(currentStep(scene, state)).toMatchObject({ text: 'Went left.' });
    state = advance(scene, state);
    expect(currentStep(scene, state)).toMatchObject({ text: 'The end.' });
    state = advance(scene, state);
    expect(currentStep(scene, state)).toEqual({ kind: 'end' });
  });

  it('ends on a choice with no next', () => {
    expect(choose(scene, texts().state, 2).ended).toBe(true);
  });

  it('plays the first-job intro to the end either way', async () => {
    const { getScene } = await import('../puzzles/scenes');
    const demo = getScene('first-job-intro')!;
    for (const pick of [0, 1]) {
      let state = startDialogue(demo);
      while (currentStep(demo, state).kind === 'line') state = advance(demo, state);
      state = choose(demo, state, pick);
      while (currentStep(demo, state).kind === 'line') state = advance(demo, state);
      expect(state.ended).toBe(true);
    }
  });
});

describe('first-job sign-off', () => {
  it('has one line for a win and a different one for a loss', async () => {
    const { getScene } = await import('../puzzles/scenes');
    const outro = getScene('first-job-outro')!;
    const lineFor = (won: boolean) => {
      const step = currentStep(outro, startDialogue(outro, { won }));
      expect(advance(outro, startDialogue(outro, { won })).ended).toBe(true); // just one line
      return step.kind === 'line' ? step.text : '';
    };
    expect(lineFor(true)).toMatch(/Nice work/);
    expect(lineFor(false)).toMatch(/alive/);
  });
});

describe('speakOnStage', () => {
  const speak = (...ids: string[]) => ids.reduce(speakOnStage, emptyStage);

  it('brings characters on as they first speak and keeps their places', () => {
    expect(speak('rook', 'dee', 'rook', 'bo').cast).toEqual(['rook', 'dee', 'bo']);
  });

  it('swaps the longest-quiet character for a newcomer when full', () => {
    expect(speak('rook', 'dee', 'bo', 'rook', 'bramble').cast).toEqual(['rook', 'bramble', 'bo']);
  });

  it('lets someone who left come back', () => {
    expect(speak('rook', 'dee', 'bo', 'hollis', 'rook').cast).toEqual(['hollis', 'rook', 'bo']);
  });
});
