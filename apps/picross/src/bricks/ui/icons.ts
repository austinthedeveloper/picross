/**
 * The bricks route's pictures for buttons, drawn here (no words on them): a house, a lock
 * for the grown-ups' corner, a loop arrow for again, a hammer for build it, a star.
 */
const PATHS = {
  home: 'M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3Z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3h1.5v11h-13V10Zm2.5 0h5V7a2.5 2.5 0 0 0-5 0Z',
  again: 'M12 4a8 8 0 1 1-7.4 5H2l3.6-4.6L9.4 9H7.3A5.5 5.5 0 1 0 12 6.5Z',
  build: 'M4 15h7v6H4Zm9 0h7v6h-7ZM8.5 8h7v6h-7Zm-2-2h3V4h-3Zm8 0h3V4h-3Z',
  star: 'm12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8Z',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('bk-icon');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', PATHS[name]);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}
