/**
 * The bricks route (a prototype, docs/brick-kids.md): a building game for little kids,
 * under `#/bricks/…`. The app's router (../routes.ts) loads this module with one
 * `import()`, and the build (three.js) loads from here with another, so the picker opens
 * without it.
 *
 * - `#/bricks`: the shelf and the picker (ui/picker.ts)
 * - `#/bricks/<id>`: one build (ui/build.ts)
 * - `#/bricks/<id>/show`: a toy from the shelf, its moment again
 * - `#/bricks/<id>/steps`: its steps for real bricks, for grown-ups (ui/manual.ts, no three.js)
 */
import './styles/bricks.css';
import type { Lazy, Screen } from '../routes';
import { bricksHref, parseBricksPath } from './href';
import { bricksModel } from './models';
import { renderManual } from './ui/manual';
import { renderPicker } from './ui/picker';

const loadBuild = () => import('./ui/build');

/** Draws the screen for `path`, the hash after `#/bricks`. */
export function renderBricks(app: HTMLElement, path: string, lazy: Lazy): Screen {
  const page = parseBricksPath(path);
  if (page?.page === 'picker') return renderPicker(app);
  const model = page && bricksModel(page.id);
  if (!page || !model) return location.replace(bricksHref());
  if (page.page === 'steps') return renderManual(app, model, page.step);
  if (page.page === 'show') return lazy(loadBuild(), (m) => m.renderToyMoment(app, model));
  return lazy(loadBuild(), (m) => {
    let cleanup: (() => void) | undefined;
    const draw = () => {
      cleanup?.();
      cleanup = m.renderKidsBuild(app, model, { restart: draw });
    };
    draw();
    return () => cleanup?.();
  });
}
