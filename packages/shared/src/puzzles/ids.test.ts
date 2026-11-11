import { describe, expect, it } from 'vitest';
import { parseId, qualify, type Dimension } from './ids';

describe('qualified puzzle ids', () => {
  it('puts the dimension in front of the id', () => {
    expect(qualify('grid', 'mug')).toBe('grid:mug');
    expect(qualify('block', 'mug')).toBe('block:mug');
  });

  it('reads them back', () => {
    expect(parseId('grid:mug')).toEqual({ dimension: 'grid', id: 'mug' });
    expect(parseId('block:rex-skull')).toEqual({ dimension: 'block', id: 'rex-skull' });
  });

  it('round-trips', () => {
    for (const dimension of ['grid', 'block'] as const) {
      for (const id of ['mug', 'jack-o-lantern', 't-rex-skeleton', 'a1']) {
        expect(parseId(qualify(dimension, id))).toEqual({ dimension, id });
      }
    }
  });

  it("doesn't accept a bare id", () => {
    expect(() => parseId('mug')).toThrow(/no dimension/);
  });

  it('throws on anything else malformed', () => {
    expect(() => parseId('')).toThrow(/no dimension/);
    expect(() => parseId('flat:mug')).toThrow(/unknown dimension "flat"/);
    expect(() => parseId(':mug')).toThrow(/unknown dimension/);
    expect(() => parseId('Grid:mug')).toThrow(/unknown dimension/);
    expect(() => parseId('grid:')).toThrow(/empty/);
    expect(() => parseId('grid:block:mug')).toThrow(/isn't a bare puzzle id/);
  });

  it("won't qualify an id twice, an empty id or an unknown dimension", () => {
    expect(() => qualify('grid', 'grid:mug')).toThrow(/isn't a bare puzzle id/);
    expect(() => qualify('grid', '')).toThrow(/empty/);
    expect(() => qualify('flat' as Dimension, 'mug')).toThrow(/Unknown puzzle dimension/);
  });
});
