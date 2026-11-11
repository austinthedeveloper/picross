import { describe, expect, it } from 'vitest';
import { flatSizeBand, freePlayHref, nextOfBoth, SIZE_BANDS, surpriseOfBoth } from './freePlay';

const easy = { href: '#/play/heart', band: 0 };
const hard = { href: '#/cubed/play/mug', band: 2 };
const alsoEasy = { href: '#/cubed/play/bat', band: 0 };

describe('free play', () => {
  it('links each tab', () => {
    expect(freePlayHref('flat')).toBe('#/free/flat');
    expect(freePlayHref('cubed')).toBe('#/free/cubed');
  });

  it("bands Flat's four sizes, smallest first", () => {
    expect([5, 10, 15, 20, 25].map(flatSizeBand)).toEqual([
      'small',
      'medium',
      'large',
      'huge',
      'huge',
    ]);
    expect(SIZE_BANDS.map((b) => b.id)).toEqual(['small', 'medium', 'large', 'huge']);
  });

  describe('Next unsolved from both boards', () => {
    it('takes the easier', () => {
      expect(nextOfBoth(hard, easy)).toBe(easy);
      expect(nextOfBoth(easy, hard)).toBe(easy);
    });

    it("keeps to this tab's when they're as hard", () => {
      expect(nextOfBoth(easy, alsoEasy)).toBe(easy);
    });

    it("takes the other board's when this one's done, and nothing when both are", () => {
      expect(nextOfBoth(null, hard)).toBe(hard);
      expect(nextOfBoth(hard, null)).toBe(hard);
      expect(nextOfBoth(null, null)).toBeNull();
    });
  });

  describe('Surprise me from both boards', () => {
    it('can land on either board, each puzzle as likely', () => {
      const pick = (r: number) => surpriseOfBoth([easy], [hard, alsoEasy], () => r)?.href;
      expect(pick(0)).toBe(easy.href);
      expect(pick(0.4)).toBe(hard.href);
      expect(pick(0.99)).toBe(alsoEasy.href);
    });

    it('is nothing when both are done', () => {
      expect(surpriseOfBoth([], [])).toBeNull();
    });
  });
});
