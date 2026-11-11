/** Reads a color token from the page (tokens.css, voxels.css), so drawings follow the theme. */
export const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
