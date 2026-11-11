import { describe, expect, it } from 'vitest';
import { getScene, parseScene, scenes } from './scenes';

const valid = {
  id: 's',
  cast: { pip: { name: 'Pip', portrait: '🧑‍🔧' } },
  nodes: {
    start: { lines: [{ who: 'pip', text: 'Hi' }], choices: [{ text: 'Bye', next: 'end' }] },
    end: { lines: [{ text: 'Done.' }] },
  },
};

describe('parseScene', () => {
  it('parses a scene and defaults the start node', () => {
    expect(parseScene(valid).start).toBe('start');
  });

  it.each([
    [
      { ...valid, nodes: { start: { lines: [{ who: 'zed', text: 'Hi' }] } } },
      /unknown speaker "zed"/,
    ],
    [
      { ...valid, nodes: { start: { lines: [{ text: 'x' }], next: 'nope' } } },
      /unknown node "nope"/,
    ],
    [{ ...valid, start: 'missing' }, /start node "missing"/],
    [{ ...valid, nodes: { start: {} } }, /is empty/],
    [{ ...valid, cast: { pip: { name: 'Pip' } } }, /name and portrait/],
    [{ ...valid, backdrop: 'nowhere' }, /unknown backdrop "nowhere"/],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseScene(input)).toThrow(error);
  });
});

describe('bundled scenes', () => {
  it('all load', () => {
    expect(scenes.length).toBeGreaterThan(0);
    expect(getScene('first-job-intro')).toBeDefined();
  });
});
