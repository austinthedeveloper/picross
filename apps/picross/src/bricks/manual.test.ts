import { describe, expect, it } from 'vitest';
import { splitIntoBricks } from '@picross/block/build/bricks';
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

  it('the duck’s beak is loose, and the fire truck stands', () => {
    const duck = manualFor(bricksModel('duck')!);
    expect(duck.fit).toBe('loose');
    expect(duck.steps[3].loose).toHaveLength(1);
    expect(manualFor(bricksModel('fire-truck')!).fit).toBe('stands');
  });
});
