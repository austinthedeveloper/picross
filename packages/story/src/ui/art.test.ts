import { describe, expect, it } from 'vitest';
import { catalog } from '../puzzles/gadgets';

/**
 * The art stays in packages/shared (`public/art/`, served by its `sharedPublic()`), so this
 * test reaches into that folder: the one path out of this package (imports.test.ts allows it).
 */
const ART = '../../../shared/public/art/';
const files = new Set(
  Object.keys(import.meta.glob('../../../shared/public/art/**/*.png')).map((p) =>
    p.replace(ART, ''),
  ),
);
const encounters = import.meta.glob('../puzzles/encounters/*.json', { eager: true });
const scenes = import.meta.glob('../puzzles/scenes/*.json', { eager: true });

/** Every value under `key`, however deep it's nested. */
function valuesOf(data: unknown, key: string): string[] {
  if (Array.isArray(data)) return data.flatMap((item) => valuesOf(item, key));
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).flatMap(([k, v]) =>
    k === key && typeof v === 'string' ? [v] : valuesOf(v, key),
  );
}

const artIds = (values: string[]) => [...new Set(values)].filter((v) => /^[a-z0-9-]+$/.test(v));

describe('art files', () => {
  // An emoji is fine: it stands in until the art is made. A plain id has to have its file.
  it.each(artIds(valuesOf(Object.values(encounters), 'sprite')))('enemy sprite %s exists', (id) => {
    expect(files).toContain(`enemies/${id}.png`);
  });

  it.each(artIds(valuesOf(Object.values(scenes), 'portrait')))('portrait %s exists', (id) => {
    expect(files).toContain(`cast/${id}.png`);
  });

  it.each(catalog.map((g) => g.id))('gadget %s exists', (id) => {
    expect(files).toContain(`gadgets/${id}.png`);
  });

  it.each(['fight', 'dig', 'rest', 'boss', 'glyph-forged', 'glyph-shield', 'glyph-turn'])(
    'icon %s exists',
    (id) => {
      expect(files).toContain(`icons/${id}.png`);
    },
  );

  it('has the fallback for an enemy without art', () => {
    expect(files).toContain('enemies/unknown.png');
  });
});
