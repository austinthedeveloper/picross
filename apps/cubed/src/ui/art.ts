import { el } from './dom';

/** Files in public/art. Relative, so the build works from the GitHub Pages project path. */
const artUrl = (set: 'cast' | 'enemies' | 'gadgets' | 'icons', id: string) =>
  `./art/${set}/${id}.png`;

function art(url: string, alt = ''): HTMLImageElement {
  return el('img', { className: 'art', src: url, alt, draggable: false });
}

const UNKNOWN_ENEMY = artUrl('enemies', 'unknown');

/** Art ids are file names. Anything else is an emoji standing in until the art is made. */
const isArtId = (value: string) => /^[a-z0-9-]+$/.test(value);
const placeholder = (emoji: string) =>
  el('span', { className: 'art-placeholder', textContent: emoji });

/** An enemy's sprite. An id with no file behind it gets the unknown blob. */
export function enemyArt(sprite: string): HTMLElement {
  if (!isArtId(sprite)) return placeholder(sprite);
  const img = art(artUrl('enemies', sprite));
  img.onerror = () => {
    img.onerror = null;
    img.src = UNKNOWN_ENEMY;
  };
  return img;
}

export const portraitArt = (portrait: string): HTMLElement =>
  isArtId(portrait) ? art(artUrl('cast', portrait)) : placeholder(portrait);
export const gadgetArt = (id: string) => art(artUrl('gadgets', id));
export const iconArt = (id: 'fight' | 'dig' | 'rest' | 'boss') => art(artUrl('icons', id));

/** Loads art before it's needed, so a boss's next form or a new speaker doesn't flash in. */
export function preloadArt(kind: 'enemies' | 'cast', ids: string[]) {
  for (const id of ids.filter(isArtId)) new Image().src = artUrl(kind, id);
}

/**
 * The emoji that text uses to stand for a piece of art, so strings can stay plain
 * ("See the 🎭 clues?") and screen readers announce what they always did.
 */
const GLYPHS: Record<string, { glyph: string; label: string }> = {
  '🌫': { glyph: 'fog', label: 'fog' },
  '⚙': { glyph: 'scramble', label: 'gear' },
  '🎯': { glyph: 'weak-point', label: 'weak point' },
  '🎭': { glyph: 'forged', label: 'mask' },
  '⚡': { glyph: 'charge', label: 'lightning' },
  '🦑': { glyph: 'ink', label: 'ink' },
  '👄': { glyph: 'swap', label: 'grin' },
  '🔍': { glyph: 'call-out', label: 'magnifying glass' },
  '🛡': { glyph: 'shield', label: 'shield' },
  '🔃': { glyph: 'turn', label: 'turning arrows' },
};
const STICKERS: Record<string, { gadget: string; label: string }> = {
  '💣': { gadget: 'bomb', label: 'bomb' },
  '🩹': { gadget: 'patch-kit', label: 'patch kit' },
  '🧽': { gadget: 'sponge', label: 'sponge' },
};
const TOKEN = new RegExp(
  `(${[...Object.keys(GLYPHS), ...Object.keys(STICKERS)].join('|')})\u{FE0F}?`,
  'u',
);

/** A power glyph: a mask in the current text color, sized by font-size. */
function glyph(emoji: string): HTMLElement {
  const { glyph: name, label } = GLYPHS[emoji];
  const node = el('span', { className: `glyph glyph-${name}`, role: 'img', ariaLabel: label });
  return node;
}

/** Text with its art emoji swapped for the art itself. */
export function withArt(text: string): Node[] {
  // split() with a capture group alternates plain text and matched emoji.
  return text.split(TOKEN).flatMap((part, i): Node[] => {
    if (i % 2 === 0) return part ? [document.createTextNode(part)] : [];
    if (part in GLYPHS) return [glyph(part)];
    const sticker = art(artUrl('gadgets', STICKERS[part].gadget), STICKERS[part].label);
    sticker.classList.add('inline');
    return [sticker];
  });
}
