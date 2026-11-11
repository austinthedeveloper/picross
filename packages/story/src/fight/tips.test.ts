import { describe, expect, it } from 'vitest';
import { POWER_TIPS, tipToShow, type PowerName } from './tips';

const POWERS = Object.keys(POWER_TIPS) as PowerName[];
/** The powers that work differently on a block: each has a note for each board. */
const DIFFER: PowerName[] = ['scramble', 'ink', 'swap', 'rotate'];

const seenOf = (keys: string[]) => (key: string) => keys.includes(key);

describe('power tips on both boards (#167)', () => {
  it('has a tip for each board, and a note for each board where it works differently', () => {
    for (const power of POWERS) {
      const { icon, name, tip, note } = POWER_TIPS[power];
      expect(icon, power).toBeTruthy();
      expect(name, power).toBeTruthy();
      expect(tip.flat, power).toBeTruthy();
      expect(tip.block, power).toBeTruthy();
      if (note) {
        expect(note.flat).toMatch(/^On a flat board,/);
        expect(note.block).toMatch(/^On a block,/);
      }
    }
    expect(POWERS.filter((p) => POWER_TIPS[p].note)).toEqual(DIFFER);
  });

  it("shows a power's full tip for the board the first time, and records it", () => {
    expect(tipToShow('fog', 'block', seenOf([]), 'flat')).toEqual({
      power: 'fog',
      icon: POWER_TIPS.fog.icon,
      name: 'Fog',
      text: POWER_TIPS.fog.tip.block,
      note: false,
      keys: ['fog'],
    });
    expect(tipToShow('rotate', 'flat', seenOf([]), 'flat')).toMatchObject({
      text: POWER_TIPS.rotate.tip.flat,
      note: false,
      keys: ['rotate', 'rotate:flat'],
    });
  });

  it("doesn't explain a power again on the other board, unless it works differently there", () => {
    for (const power of POWERS) {
      for (const [from, to] of [
        ['flat', 'block'],
        ['block', 'flat'],
      ] as const) {
        const seen = tipToShow(power, from, seenOf([]), from)!.keys;
        expect(tipToShow(power, from, seenOf(seen), from), `${power} on ${from} again`).toBeNull();
        const other = tipToShow(power, to, seenOf(seen), from);
        if (!DIFFER.includes(power)) {
          expect(other, `${power} on ${to}`).toBeNull();
          continue;
        }
        expect(other).toMatchObject({ text: POWER_TIPS[power].note![to], note: true });
        expect(other!.keys).toEqual([`${power}:${to}`]);
        // Once seen on both, never again.
        const both = seenOf([...seen, ...other!.keys]);
        expect(tipToShow(power, to, both, from)).toBeNull();
        expect(tipToShow(power, from, both, from)).toBeNull();
      }
    }
  });

  it('reads a save from before tips knew their board as seen on its own board', () => {
    // The 2D game's save, with the tips it showed before #167.
    const flatSave = seenOf(['rotate', 'fog']);
    expect(tipToShow('rotate', 'flat', flatSave, 'flat')).toBeNull();
    expect(tipToShow('fog', 'block', flatSave, 'flat')).toBeNull();
    expect(tipToShow('rotate', 'block', flatSave, 'flat')).toMatchObject({
      text: POWER_TIPS.rotate.note!.block,
      keys: ['rotate:flat', 'rotate:block'],
    });
    // Cubed's.
    const blockSave = seenOf(['swap']);
    expect(tipToShow('swap', 'block', blockSave, 'block')).toBeNull();
    expect(tipToShow('swap', 'flat', blockSave, 'block')).toMatchObject({
      text: POWER_TIPS.swap.note!.flat,
      keys: ['swap:block', 'swap:flat'],
    });
  });

  it("has no tip for what isn't a power", () => {
    expect(tipToShow('board', 'block', seenOf([]), 'block')).toBeNull();
  });
});
