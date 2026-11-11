import type { ColorName, PuzzleFile } from './format';

/**
 * Sheets: several puzzles drawn in one text file (`src/puzzles/sheets/*.txt`), so a themed
 * batch is quick to draw and review. `npm run puzzles -- --sheet <file>` exports them to
 * `src/puzzles/pack/`. The format:
 *
 *     # Comments start with #.
 *     == mug "Mug" hide=0.5
 *     b=sky w=white
 *     bbb.. bbb.. bbb.. bbb..
 *     bbb.. b.bbb b.b.b b.bbb
 *     bbb.. bbb.. bbb.. bbb..
 *
 * `==` starts a puzzle: its id, its name in quotes, and optionally `hide=` (the hide ratio).
 * The next line maps letters to colors. Then one line per row, from the back of the block
 * to the front, with the layers side by side from the bottom layer up, separated by spaces.
 */
export function parseSheet(text: string): PuzzleFile[] {
  const puzzles: PuzzleFile[] = [];
  let current: PuzzleFile | null = null;
  let expectColors = false;
  text.split('\n').forEach((raw, n) => {
    const line = raw.trim();
    const where = `line ${n + 1}`;
    if (!line || line.startsWith('#')) return;
    const head = line.match(/^==\s+([a-z0-9-]+)\s+"([^"]+)"(?:\s+hide=([\d.]+))?$/);
    if (head) {
      current = { id: head[1], name: head[2], colors: {}, layers: [] };
      if (head[3]) current.hideRatio = Number(head[3]);
      puzzles.push(current);
      expectColors = true;
      return;
    }
    if (!current) throw new Error(`${where}: expected a line like == id "Name" first`);
    if (expectColors) {
      for (const pair of line.split(/\s+/)) {
        const [letter, color] = pair.split('=');
        if (!letter || !color) throw new Error(`${where}: colors look like "b=sky w=white"`);
        current.colors[letter] = color as ColorName;
      }
      expectColors = false;
      return;
    }
    const rows = line.split(/\s+/);
    if (!current.layers.length) current.layers = rows.map(() => []);
    if (rows.length !== current.layers.length) {
      throw new Error(
        `${where}: ${rows.length} layers, but the first row had ${current.layers.length}`,
      );
    }
    rows.forEach((row, y) => current!.layers[y].push(row));
  });
  return puzzles;
}

/** A puzzle file drawn as a sheet entry (for moving puzzles into sheets). */
export function toSheet(file: PuzzleFile): string {
  const head = `== ${file.id} "${file.name}"${file.hideRatio !== undefined ? ` hide=${file.hideRatio}` : ''}`;
  const colors = Object.entries(file.colors)
    .map(([letter, color]) => `${letter}=${color}`)
    .join(' ');
  const rows = file.layers[0].map((_, z) => file.layers.map((layer) => layer[z]).join(' '));
  return [head, colors, ...rows].join('\n');
}
