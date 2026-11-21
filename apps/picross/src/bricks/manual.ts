/**
 * A model's build as steps for real toy bricks (`#/bricks/<id>/steps`, docs/bricks-real.md):
 * the parts list, then one step per layer, the same layers the screen builds. No DOM.
 */
import { splitIntoBricks, type Brick } from '@picross/block/build/bricks';
import type { BrickModel } from '@picross/block/build/models';
import { checkReal, partsOf, realFit, type Part, type RealFit } from '@picross/block/build/real';

export interface ManualStep {
  /** The layer, from 0 at the bottom. */
  layer: number;
  bricks: readonly Brick[];
  parts: Part[];
  /** Slots in this layer with nothing under them that press on under the brick above. */
  hangs: number[];
  /** Slots in this layer that only touch the toy from the side, so won't hold. */
  loose: number[];
}

export interface Manual {
  layers: Brick[][];
  /** Everything to have out first. */
  parts: Part[];
  bricks: number;
  steps: ManualStep[];
  fit: RealFit;
  /** How many pieces it comes off a base plate in (1: a toy to pick up). */
  pieces: number;
}

export function manualFor(model: BrickModel): Manual {
  const layers = splitIntoBricks(model);
  const check = checkReal(layers);
  const slots = (list: { layer: number; slot: number }[], layer: number) =>
    list.filter((a) => a.layer === layer).map((a) => a.slot);
  const loose = check.loose.flat();
  return {
    layers,
    parts: partsOf(layers.flat()),
    bricks: layers.flat().length,
    steps: layers.map((bricks, layer) => ({
      layer,
      bricks,
      parts: partsOf(bricks),
      hangs: slots(check.hangs, layer).filter((s) => !slots(loose, layer).includes(s)),
      loose: slots(loose, layer),
    })),
    fit: realFit(check),
    pieces: check.pieces,
  };
}

/** What each fit means, for the grown-up reading the manual. */
export const FIT_NOTE: Record<RealFit, string> = {
  stands: 'This one holds together as one toy you can pick up.',
  hangs:
    'This one holds together, but a few bricks have nothing under them: press each on from underneath, once the brick above it is on.',
  plate:
    'Build this one on a base plate: it holds together on the plate, and comes off it in pieces.',
  loose:
    'Some bricks in this one only touch the toy from the side, so they won’t hold in real bricks. They’re marked in the steps: leave them off, or hold them on.',
};

/** The size as it's printed: `2x4` reads 2 × 4. */
export const sizeLabel = (size: string) => size.replace('x', ' × ');
