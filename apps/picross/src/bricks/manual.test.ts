import { describe, expect, it } from 'vitest';
import { splitIntoBricks } from '@picross/block/build/bricks';
import { getBricksPuzzle } from '@picross/block/puzzles/bricks';
import { BRICKS_MODELS, bricksModel } from './models';
import { manualFor } from './manual';

describe('the steps for real bricks', () => {
  it.each(BRICKS_MODELS.map((id) => [id]))('%s: a step a layer, and every brick listed', (id) => {
    const model = bricksModel(id)!;
    const manual = manualFor(model);
    const layers = splitIntoBricks(model);
    expect(manual.steps.length).toBe(layers.length);
    const counted = (parts: { count: number }[]) => parts.reduce((n, p) => n + p.count, 0);
    expect(counted(manual.parts)).toBe(manual.bricks);
    for (const step of manual.steps) {
      expect(counted(step.parts)).toBe(step.bricks.length);
      // A brick is marked once at most: loose wins over hangs.
      for (const s of step.hangs) expect(step.loose).not.toContain(s);
    }
    if (manual.fit === 'loose') expect(manual.steps.some((s) => s.loose.length)).toBe(true);
    if (manual.fit === 'stands') expect(manual.steps.every((s) => !s.hangs.length)).toBe(true);
  });

  it('the duck holds together, beak and all, and the caterpillar needs a plate', () => {
    const duck = manualFor(bricksModel('duck')!);
    expect(duck.fit).toBe('stands');
    expect(duck.plate).toBeNull();
    const caterpillar = manualFor(bricksModel('caterpillar')!);
    expect(caterpillar.fit).toBe('plate');
    expect(caterpillar.plate).toEqual({ x: 8, z: 2 });
  });

  // Brick kids' own models are made for real bricks: each holds, if only on a plate. The
  // others are Cubed's puzzles too, so they stay as they are (docs/bricks-real.md).
  const SHARED_LOOSE = ['jack', 'cactus', 'mushroom', 'wheelbarrow', 'dog'];
  it.each(BRICKS_MODELS.map((id) => [id]))('%s holds together in real bricks', (id) => {
    const { fit } = manualFor(bricksModel(id)!);
    if (SHARED_LOOSE.includes(id)) expect(fit).toBe('loose');
    else expect(fit, getBricksPuzzle(id) ? 'one of its own' : 'a shared one').not.toBe('loose');
  });
});
