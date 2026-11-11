import type { Backdrop } from '../../puzzles/backdrops';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * A backdrop as one SVG path, a rectangle for each run of filled cells. Its color comes from
 * CSS, so it follows the theme, and it stays crisp at any size.
 */
export function createBackdrop({ width, height, rows }: Backdrop): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'backdrop');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const runs = rows.flatMap((row, y) =>
    [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1H${run.index}z`),
  );
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', runs.join(''));
  svg.append(path);
  return svg;
}
