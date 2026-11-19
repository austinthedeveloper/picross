/**
 * Straight into a build, for testing it: `#/cubed/build/<id>` opens the build of any model
 * (`buildModel`), skipping the 2D and 3D puzzles, and `?layer=N` starts on layer N (1 is the
 * bottom), with the layers under it built. The trio's 3D puzzle goes to the same screen
 * when it's solved.
 */
import { BrickBuild } from './build';
import { buildModel, type BrickModel } from './models';

export interface BuildEntry {
  id: string;
  /** The layer to start on, from 0 at the bottom. */
  layer: number;
}

/** Reads `/build/<id>` or `/build/<id>?layer=N` (the hash after `#/cubed`). */
export function parseBuildPath(path: string): BuildEntry | null {
  const m = /^\/build\/([\w-]+)(?:\?(.*))?$/.exec(path);
  if (!m) return null;
  const layer = Number(new URLSearchParams(m[2] ?? '').get('layer') ?? 1);
  return { id: m[1], layer: Number.isInteger(layer) && layer > 1 ? layer - 1 : 0 };
}

/** The model and its build, ready to play, or null for an unknown id. */
export function startBuild(entry: BuildEntry): { model: BrickModel; build: BrickBuild } | null {
  const model = buildModel(entry.id);
  return model ? { model, build: BrickBuild.fromShape(model, entry.layer) } : null;
}
