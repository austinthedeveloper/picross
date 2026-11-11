import { describe, expect, it } from 'vitest';
import { catalog } from '../puzzles/gadgets';
import { enemyArt, portraitArt, withArt } from './art';

const files = new Set(
  Object.keys(import.meta.glob('../../public/art/**/*.png')).map((p) =>
    p.replace('../../public/art/', ''),
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

describe('placeholders', () => {
  it('draws an art id as an image', () => {
    expect(enemyArt('goblin').getAttribute('src')).toBe('./art/enemies/goblin.png');
    expect(portraitArt('rook').getAttribute('src')).toBe('./art/cast/rook.png');
  });

  it('draws anything else as the emoji it is', () => {
    expect(enemyArt('🦖').tagName).toBe('SPAN');
    expect(enemyArt('🦖').textContent).toBe('🦖');
    expect(portraitArt('🧑‍🌾').textContent).toBe('🧑‍🌾');
  });
});

describe('withArt', () => {
  const wrap = (text: string) => {
    const host = document.createElement('p');
    host.append(...withArt(text));
    return host;
  };

  it('leaves plain text alone', () => {
    expect(wrap('Just words.').innerHTML).toBe('Just words.');
  });

  it('swaps a power emoji for its glyph, in place', () => {
    const host = wrap('See the 🎭 clues?');
    expect(host.textContent).toBe('See the  clues?');
    expect(host.querySelector('.glyph-forged')?.getAttribute('aria-label')).toBe('mask');
  });

  it('handles the emoji with or without its variation selector', () => {
    expect(wrap('🛡️ 2').querySelector('.glyph-shield')).not.toBeNull();
    expect(wrap('🛡 2').querySelector('.glyph-shield')).not.toBeNull();
    expect(wrap('🛡️ 2').textContent).toBe(' 2');
  });

  it('swaps several in one string', () => {
    expect(wrap('🛡 3🎯').querySelectorAll('.glyph')).toHaveLength(2);
  });

  it('swaps a gadget emoji for its sticker, labeled for screen readers', () => {
    const img = wrap('You got 🧽 Sponge!').querySelector('img');
    expect(img?.getAttribute('src')).toBe('./art/gadgets/sponge.png');
    expect(img?.alt).toBe('sponge');
  });
});
