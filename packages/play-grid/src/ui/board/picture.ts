import type { Solution } from '@picross/grid/engine/board';

/** Draws a solution as a small pixel image. */
export function createPicture(solution: Solution, pixel: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'picture';
  canvas.width = solution.width;
  canvas.height = solution.height;
  canvas.style.width = `${solution.width * pixel}px`;
  canvas.style.height = `${solution.height * pixel}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#222';
    solution.cells.forEach((filled, i) => {
      if (filled) ctx.fillRect(i % solution.width, Math.floor(i / solution.width), 1, 1);
    });
  }
  return canvas;
}
