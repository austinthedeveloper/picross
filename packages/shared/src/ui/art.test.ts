import { describe, expect, it } from 'vitest';
import { enemyArt, portraitArt, withArt } from './art';

// That the story's sprites, portraits and gadgets all have their art is checked in
// packages/story (src/ui/art.test.ts), which has the story.

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
